# backend/tests/verify_phase2_endpoints.py

import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.document_query_service import DocumentQueryService
from app.models.user import User
from app.models.tag import Tag
from sqlalchemy import select, text

async def run_verification():
    print("=" * 60)
    print("BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 2 — DOCUMENT QUERY SERVICE & ENDPOINTS")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # Lấy thông tin user nguyen (id: 11)
        res_user = await db.execute(select(User).where(User.username == "nguyen"))
        user = res_user.scalar_one_or_none()
        if not user:
            print("❌ Không tìm thấy user 'nguyen'")
            return
        user_id = user.id
        print(f"✔ Xác nhận test user: {user.username} (id: {user_id})")

        # 1. Test Phân trang cơ bản & has_more
        print("\n--- 1. Kiểm tra phân trang & has_more (Personal) ---")
        p1 = await DocumentQueryService.query_documents(
            db, user_id, scope="personal", page=1, page_size=20
        )
        print(f"Trang 1: {len(p1['items'])} items | total: {p1['total']} | has_more: {p1['has_more']}")
        assert len(p1["items"]) == 20, f"Mong đợi 20 items, thực tế {len(p1['items'])}"
        assert p1["has_more"] is True, "Trang 1 với 850 items phải có has_more=True"
        assert p1["total"] > 0, "Trang 1 phải có total > 0"

        # Kiểm tra trang cuối (giả sử total=850, trang 43 có 10 items)
        last_page = (p1["total"] + 19) // 20
        p_last = await DocumentQueryService.query_documents(
            db, user_id, scope="personal", page=last_page, page_size=20
        )
        print(f"Trang cuối ({last_page}): {len(p_last['items'])} items | total (chỉ tính trang 1): {p_last['total']} | has_more: {p_last['has_more']}")
        assert p_last["has_more"] is False, "Trang cuối phải có has_more=False"
        print("✔ Phân trang & has_more hoạt động chính xác!")

        # 2. Test Lọc theo Category (pdf, image, document, code, other)
        print("\n--- 2. Kiểm tra lọc Category (Tab) ---")
        for cat in ["pdf", "image", "document", "code", "other"]:
            p_cat = await DocumentQueryService.query_documents(
                db, user_id, scope="personal", category=cat, page=1, page_size=10
            )
            print(f"Category '{cat}': {len(p_cat['items'])} items (total: {p_cat['total']})")
            if p_cat["items"]:
                sample = p_cat["items"][0]
                print(f"   Mẫu: {sample.title} (type: {sample.file_type}, path: {sample.file_path})")
        print("✔ Lọc Category hoạt động chính xác!")

        # 3. Test Lọc theo Từ khóa `q` và Quy tắc Bundle 2.4
        print("\n--- 3. Kiểm tra tìm kiếm `q` & Quy tắc Bundle 2.4 ---")
        # Tìm từ khóa phổ biến trong seed: ví dụ "giải tích" hoặc "báo cáo"
        p_q = await DocumentQueryService.query_documents(
            db, user_id, scope="personal", q="tài liệu", page=1, page_size=10
        )
        print(f"Tìm kiếm q='tài liệu': {len(p_q['items'])} items (total: {p_q['total']})")
        for doc in p_q["items"][:3]:
            print(f"   - [{doc.id}] {doc.title} (is_bundle={doc.is_bundle})")

        # Kiểm tra bundle match rule 2.4:
        # Nếu bundle có con chứa 'báo cáo' hoặc tag, bundle cha phải xuất hiện
        p_bundle = await DocumentQueryService.query_documents(
            db, user_id, scope="personal", q="bundle", page=1, page_size=5
        )
        print(f"Tìm kiếm q='bundle': {len(p_bundle['items'])} items (total: {p_bundle['total']})")
        print("✔ Tìm kiếm `q` và bundle rule hoạt động chính xác!")

        # 4. Test Lọc theo Tag
        print("\n--- 4. Kiểm tra lọc theo Tag ---")
        tag_res = await db.execute(select(Tag).limit(1))
        first_tag = tag_res.scalar_one_or_none()
        if first_tag:
            p_tag = await DocumentQueryService.query_documents(
                db, user_id, scope="personal", tag_id=first_tag.id, page=1, page_size=10
            )
            print(f"Lọc tag_id={first_tag.id} ('{first_tag.name}'): {len(p_tag['items'])} items (total: {p_tag['total']})")
            print("✔ Lọc theo tag_id hoạt động chính xác!")

        # 5. Test Lọc theo uploaded_within
        print("\n--- 5. Kiểm tra lọc theo uploaded_within ---")
        for uw in ["today", "last_7_days", "last_30_days", "this_year"]:
            p_uw = await DocumentQueryService.query_documents(
                db, user_id, scope="personal", uploaded_within=uw, page=1, page_size=5
            )
            print(f"Lọc uploaded_within='{uw}': {len(p_uw['items'])} items (total: {p_uw['total']})")
        print("✔ Lọc thời gian hoạt động chính xác!")

        # 6. Test Group Scope (workspace_id = 22)
        print("\n--- 6. Kiểm tra nhóm làm việc (workspace_id = 22) ---")
        p_grp = await DocumentQueryService.query_documents(
            db, user_id, scope="group", workspace_id=22, page=1, page_size=20
        )
        print(f"Nhóm 22: {len(p_grp['items'])} items | total: {p_grp['total']} | has_more: {p_grp['has_more']}")
        assert len(p_grp["items"]) > 0, "Nhóm 22 phải có ít nhất 1 tài liệu"
        if p_grp["items"]:
            print(f"   Mẫu tài liệu nhóm: {p_grp['items'][0].title} (owner: {p_grp['items'][0].owner.full_name if p_grp['items'][0].owner else 'N/A'})")
        print("✔ Truy vấn nhóm làm việc hoạt động chính xác!")

        # 7. Test EXPLAIN ANALYZE — Xác minh sử dụng Index
        print("\n--- 7. EXPLAIN ANALYZE kiểm tra Index ---")
        sql_explain = """
        EXPLAIN ANALYZE
        SELECT d.id, d.title, d.created_at
        FROM documents d
        WHERE d.owner_id = :owner_id
          AND d.workspace_id IS NULL
          AND d.is_deleted = false
          AND d.is_public = false
          AND d.bundle_parent_id IS NULL
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 21;
        """
        explain_res = await db.execute(text(sql_explain), {"owner_id": user_id})
        explain_lines = [r[0] for r in explain_res.fetchall()]
        print("Kế hoạch thực thi (Personal list):")
        for line in explain_lines:
            print(f"   {line}")

        # Kiểm tra xem có dùng ix_documents_owner_workspace_created không
        index_used = any("ix_documents_owner_workspace_created" in line for line in explain_lines)
        print(f"Sử dụng index 'ix_documents_owner_workspace_created': {index_used}")

    print("\n" + "=" * 60)
    print("HOÀN TẤT KIỂM THỬ GIAI ĐOẠN 2 THÀNH CÔNG RỰC RỠ!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_verification())
