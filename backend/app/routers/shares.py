from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.activity_actions import ActivityAction
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.roles import is_auto_accept
from app.models.document import Document
from app.models.document_share import DocumentShare
from app.models.document_stats import DocumentStats
from app.models.document_tag import document_tags
from app.models.download_log import DownloadLog
from app.models.notification import Notification
from app.models.tag import Tag
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.share import (
    DocumentShareOut,
    DocumentShareStatusOut,
    PredictedUser,
    ShareCreate,
    ShareCreateOut,
    SharePreviewOut,
    ShareRecipientResult,
)
from app.services.group_service import get_member_permission

router = APIRouter(prefix="/shares", tags=["shares"])


async def _record_share_log(
    db: AsyncSession,
    document_id: int,
    user_id: int,
    action: str,
    workspace_context: str = "personal",
    workspace_id: Optional[int] = None,
    extra_data: Optional[dict] = None,
) -> None:
    db.add(
        DownloadLog(
            document_id=document_id,
            user_id=user_id,
            action=action,
            workspace_context=workspace_context,
            workspace_id=workspace_id,
            extra_data=extra_data or {},
        )
    )
    now_utc = datetime.now(timezone.utc)
    is_share = action == ActivityAction.SHARED

    # PostgreSQL atomic upsert: ngăn chặn triệt để UniqueViolationError trên document_stats_pkey
    stats_stmt = (
        pg_insert(DocumentStats)
        .values(
            document_id=document_id,
            view_count=0,
            download_count=0,
            save_count=0,
            share_count=1 if is_share else 0,
            unique_viewers=0,
            trending_score=2.0,
            last_activity_at=now_utc,
            updated_at=now_utc,
        )
        .on_conflict_do_update(
            index_elements=[DocumentStats.document_id],
            set_={
                "share_count": DocumentStats.share_count + (1 if is_share else 0),
                "trending_score": func.coalesce(DocumentStats.trending_score, 0.0) + 2.0,
                "last_activity_at": now_utc,
                "updated_at": now_utc,
            },
        )
    )
    await db.execute(stats_stmt)


async def _resolve_target_users(
    db: AsyncSession, payload: ShareCreate, current_user_id: int
) -> List[User]:
    conditions = []
    if payload.identifiers:
        conditions.append(
            or_(
                User.username.in_(payload.identifiers),
                User.email.in_(payload.identifiers),
                User.student_code.in_(payload.identifiers),
            )
        )
    if payload.class_ids:
        conditions.append(User.class_id.in_(payload.class_ids))
    if payload.faculty_ids:
        conditions.append(User.faculty_id.in_(payload.faculty_ids))
    if payload.student_code_patterns:
        pat_conds = [
            User.student_code.ilike(f"%{p}%") for p in payload.student_code_patterns if p
        ]
        if pat_conds:
            conditions.append(or_(*pat_conds))

    if not conditions:
        return []

    stmt = select(User).where(or_(*conditions), User.id != current_user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _copy_doc_to_user(
    db: AsyncSession,
    src_doc: Document,
    target_user_id: int,
    from_user: User,
    message: Optional[str] = None,
) -> Document:
    now_iso = datetime.now(timezone.utc).isoformat()
    shared_by_info = {
        "id": from_user.id,
        "username": from_user.username,
        "full_name": from_user.full_name or from_user.username,
        "role": from_user.role,
    }

    # Đánh dấu trên tài liệu gốc là đã chia sẻ
    src_meta = dict(src_doc.metadata_) if isinstance(src_doc.metadata_, dict) else {}
    src_meta["is_shared"] = True
    src_meta["last_shared_at"] = now_iso
    src_doc.metadata_ = src_meta

    # Metadata trên bản sao của người nhận (chứa thông tin người chia sẻ)
    dest_meta = dict(src_meta)
    dest_meta.pop("is_shared", None)
    dest_meta["shared_by"] = shared_by_info
    dest_meta["shared_at"] = now_iso
    if message:
        dest_meta["share_message"] = message

    new_doc = Document(
        owner_id=target_user_id,
        workspace_id=None,
        source_document_id=src_doc.id,
        title=src_doc.title,
        description=src_doc.description,
        category_id=src_doc.category_id,
        subject_id=src_doc.subject_id,
        file_path=src_doc.file_path,
        thumbnail_path=src_doc.thumbnail_path,
        markdown_path=src_doc.markdown_path,
        file_type=src_doc.file_type,
        file_size=src_doc.file_size,
        checksum=src_doc.checksum,
        content=src_doc.content,
        metadata_=dest_meta,
        is_bundle=src_doc.is_bundle,
    )
    db.add(new_doc)
    await db.flush()

    # Sao chép tags nếu có
    tag_stmt = (
        select(Tag)
        .join(document_tags, document_tags.c.tag_id == Tag.id)
        .where(document_tags.c.document_id == src_doc.id)
    )
    tags_res = await db.execute(tag_stmt)
    for src_tag in tags_res.scalars().all():
        tag_match = await db.execute(
            select(Tag).where(
                Tag.owner_id == target_user_id, Tag.name == src_tag.name
            )
        )
        dest_tag = tag_match.scalar_one_or_none()
        if not dest_tag:
            dest_tag = Tag(owner_id=target_user_id, name=src_tag.name)
            db.add(dest_tag)
            await db.flush()
        await db.execute(
            document_tags.insert().values(
                document_id=new_doc.id, tag_id=dest_tag.id
            )
        )

    # Nếu là bundle, copy tất cả children kèm metadata người chia sẻ
    if src_doc.is_bundle:
        children_stmt = select(Document).where(
            Document.bundle_parent_id == src_doc.id,
            Document.is_deleted == False,
        )
        children = (await db.execute(children_stmt)).scalars().all()
        for child in children:
            child_meta = dict(child.metadata_) if isinstance(child.metadata_, dict) else {}
            child_meta.pop("is_shared", None)
            child_meta["shared_by"] = shared_by_info
            child_meta["shared_at"] = now_iso
            new_child = Document(
                owner_id=target_user_id,
                workspace_id=None,
                bundle_parent_id=new_doc.id,
                source_document_id=child.id,
                title=child.title,
                description=child.description,
                category_id=child.category_id,
                file_path=child.file_path,
                thumbnail_path=child.thumbnail_path,
                markdown_path=child.markdown_path,
                file_type=child.file_type,
                file_size=child.file_size,
                checksum=child.checksum,
                content=child.content,
                metadata_=child_meta,
            )
            db.add(new_child)
        await db.flush()

    # Ghi log hoạt động 2 phía:
    # 1. Phía người nhận (trên bản sao new_doc): ghi nhận người gửi đã chia sẻ & người nhận đã nhận
    await _record_share_log(
        db,
        document_id=new_doc.id,
        user_id=from_user.id,
        action=ActivityAction.SHARED,
        extra_data={"source_document_id": src_doc.id, "to_user_id": target_user_id},
    )
    await _record_share_log(
        db,
        document_id=new_doc.id,
        user_id=target_user_id,
        action=ActivityAction.RECEIVED,
        extra_data={"source_document_id": src_doc.id, "from_user_id": from_user.id},
    )
    # 2. Phía người gửi (trên tài liệu gốc src_doc): ghi nhận người nhận đã nhận tài liệu
    await _record_share_log(
        db,
        document_id=src_doc.id,
        user_id=target_user_id,
        action=ActivityAction.RECEIVED,
        extra_data={"copy_document_id": new_doc.id, "from_user_id": from_user.id},
    )

    return new_doc


async def _validate_sources(
    db: AsyncSession, doc_ids: List[int], user_id: int, workspace_id: Optional[int]
) -> List[Document]:
    if not doc_ids:
        raise HTTPException(400, "Vui lòng chọn tài liệu cần chia sẻ")

    if workspace_id is not None:
        perm = await get_member_permission(db, workspace_id, user_id)
        ws = await db.get(Workspace, workspace_id)
        if not ws or ws.is_deleted:
            raise HTTPException(404, "Không tìm thấy nhóm")
        if ws.owner_id != user_id:
            if perm is None:
                raise HTTPException(403, "Bạn không phải thành viên của nhóm này")
            if perm == "view":
                raise HTTPException(
                    403, "Bạn chỉ có quyền xem trong nhóm này, không thể chia sẻ tài liệu"
                )

    docs = (
        await db.execute(
            select(Document).where(
                Document.id.in_(doc_ids), Document.is_deleted == False
            )
        )
    ).scalars().all()

    if len(docs) != len(doc_ids):
        raise HTTPException(404, "Một hoặc nhiều tài liệu không tồn tại hoặc đã bị xóa")

    for doc in docs:
        if workspace_id is None:
            if doc.owner_id != user_id or doc.workspace_id is not None:
                raise HTTPException(403, f"Bạn không có quyền chia sẻ tài liệu '{doc.title}'")
        else:
            if doc.workspace_id != workspace_id:
                raise HTTPException(400, f"Tài liệu '{doc.title}' không thuộc nhóm chỉ định")

    return list(docs)


@router.post("/preview", response_model=SharePreviewOut)
async def preview_share(
    payload: ShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _validate_sources(
        db, payload.document_ids, current_user.id, payload.source_workspace_id
    )

    targets = await _resolve_target_users(db, payload, current_user.id)
    if not targets:
        return SharePreviewOut(
            users=[],
            auto_count=0,
            pending_count=0,
            already_pending_count=0,
            already_owned_count=0,
            duplicate_count=0,
            requires_bulk_confirm=False,
        )

    target_ids = [u.id for u in targets]

    # 1. Tìm các share đang pending
    pending_shares_res = await db.execute(
        select(DocumentShare.to_user_id, DocumentShare.id).where(
            DocumentShare.source_document_id.in_(payload.document_ids),
            DocumentShare.to_user_id.in_(target_ids),
            DocumentShare.status == "pending",
        )
    )
    pending_map = dict(pending_shares_res.all())

    # 2. Tìm các share đã được accept / auto_accept
    accepted_shares_res = await db.execute(
        select(DocumentShare.to_user_id).where(
            DocumentShare.source_document_id.in_(payload.document_ids),
            DocumentShare.to_user_id.in_(target_ids),
            DocumentShare.status.in_(["accepted", "auto_accepted"]),
        )
    )
    accepted_user_ids = set(accepted_shares_res.scalars().all())

    # 3. Tìm các tài liệu đã có trong kho cá nhân của người nhận
    existing_docs = (
        await db.execute(
            select(Document.owner_id).where(
                Document.source_document_id.in_(payload.document_ids),
                Document.owner_id.in_(target_ids),
                Document.is_deleted == False,
            )
        )
    ).scalars().all()
    owned_user_ids = accepted_user_ids | set(existing_docs)

    predicted_list: List[PredictedUser] = []
    auto_count = 0
    pending_count = 0
    already_pending_count = 0
    already_owned_count = 0

    for u in targets:
        if u.id in pending_map:
            status_val = "already_pending"
            already_pending_count += 1
            reason = "Đã có lời mời chia sẻ trước đó và đang chờ người nhận xác nhận"
            share_id = pending_map[u.id]
        elif u.id in owned_user_ids:
            status_val = "already_owned"
            already_owned_count += 1
            reason = "Người nhận đã sở hữu tài liệu này trong kho cá nhân"
            share_id = None
        elif is_auto_accept(current_user.role, u.role):
            status_val = "auto"
            auto_count += 1
            reason = "Cấp bậc người gửi cao hơn, tự động nhận vào kho"
            share_id = None
        else:
            status_val = "pending"
            pending_count += 1
            reason = "Cần người nhận xác nhận lời mời"
            share_id = None

        predicted_list.append(
            PredictedUser(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                role=u.role,
                status=status_val,
                reason=reason,
                share_id=share_id,
            )
        )

    requires_bulk_confirm = bool(
        payload.class_ids
        or payload.faculty_ids
        or payload.student_code_patterns
        or len(targets) > 20
    )

    duplicate_count = already_pending_count + already_owned_count

    return SharePreviewOut(
        users=predicted_list,
        auto_count=auto_count,
        pending_count=pending_count,
        already_pending_count=already_pending_count,
        already_owned_count=already_owned_count,
        duplicate_count=duplicate_count,
        requires_bulk_confirm=requires_bulk_confirm,
    )


@router.get("/document-status", response_model=DocumentShareStatusOut)
async def get_document_share_status(
    document_ids: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy nhanh trạng thái người nhận của tài liệu (phục vụ hiển thị tức thì trên FE)"""
    ids = [int(x.strip()) for x in document_ids.split(",") if x.strip().isdigit()]
    if not ids:
        return DocumentShareStatusOut()

    # Lấy các user đang pending
    pending_res = await db.execute(
        select(DocumentShare.to_user_id, DocumentShare.source_document_id, DocumentShare.id, DocumentShare.created_at)
        .where(
            DocumentShare.source_document_id.in_(ids),
            DocumentShare.from_user_id == current_user.id,
            DocumentShare.status == "pending",
        )
    )
    pending_rows = pending_res.all()
    pending_user_ids = list({row[0] for row in pending_rows})
    pending_shares = [
        {"user_id": row[0], "document_id": row[1], "share_id": row[2], "created_at": row[3].isoformat() if row[3] else None}
        for row in pending_rows
    ]

    # Lấy các user đã sở hữu
    owned_res = await db.execute(
        select(Document.owner_id).where(
            Document.source_document_id.in_(ids),
            Document.is_deleted == False,
        )
    )
    owned_user_ids = list(set(owned_res.scalars().all()))

    return DocumentShareStatusOut(
        pending_user_ids=pending_user_ids,
        owned_user_ids=owned_user_ids,
        pending_shares=pending_shares,
    )


@router.post("", response_model=ShareCreateOut, status_code=status.HTTP_201_CREATED)
async def create_share(
    payload: ShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = await _validate_sources(
        db, payload.document_ids, current_user.id, payload.source_workspace_id
    )

    targets = await _resolve_target_users(db, payload, current_user.id)
    if not targets:
        raise HTTPException(400, "Không tìm thấy người nhận hợp lệ")

    is_bulk = bool(
        payload.class_ids
        or payload.faculty_ids
        or payload.student_code_patterns
        or len(targets) > 20
    )
    if is_bulk and not payload.confirm_bulk:
        raise HTTPException(
            428,
            f"Thao tác chia sẻ cho {len(targets)} người cần có xác nhận cấp 2 (confirm_bulk=true)",
        )

    target_ids = [u.id for u in targets]

    # Kiểm tra các user đã sở hữu bản sao trong kho cá nhân
    existing_docs = (
        await db.execute(
            select(Document.source_document_id, Document.owner_id).where(
                Document.source_document_id.in_(payload.document_ids),
                Document.owner_id.in_(target_ids),
                Document.is_deleted == False,
            )
        )
    ).all()
    dup_docs = {(row[0], row[1]) for row in existing_docs}

    auto_count = 0
    pending_count = 0
    already_pending_count = 0
    already_owned_count = 0
    dup_count = 0
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    expires_at = now + timedelta(days=30)
    share_type = "bulk" if is_bulk else "direct"
    ws_ctx = "group" if payload.source_workspace_id else "personal"
    results: List[ShareRecipientResult] = []

    for doc in docs:
        doc_shared_any = False
        for recipient in targets:
            # 1. Nếu người nhận đã sở hữu tài liệu này trong kho cá nhân
            if (doc.id, recipient.id) in dup_docs:
                already_owned_count += 1
                dup_count += 1
                results.append(
                    ShareRecipientResult(
                        user_id=recipient.id,
                        username=recipient.username,
                        full_name=recipient.full_name,
                        document_id=doc.id,
                        status="already_owned",
                    )
                )
                continue

            # 2. Cấp bậc người gửi cao hơn -> Tự động nhận ngay (Auto accepted)
            if is_auto_accept(current_user.role, recipient.role):
                doc_shared_any = True
                new_doc = await _copy_doc_to_user(
                    db, doc, recipient.id, current_user, payload.message
                )
                share = DocumentShare(
                    source_document_id=doc.id,
                    document_id=new_doc.id,
                    from_user_id=current_user.id,
                    to_user_id=recipient.id,
                    source_workspace_id=payload.source_workspace_id,
                    share_type=share_type,
                    status="auto_accepted",
                    message=payload.message,
                    expires_at=expires_at,
                    responded_at=now,
                )
                db.add(share)
                await db.flush()
                sender_name = current_user.full_name or current_user.username
                notif = Notification(
                    user_id=recipient.id,
                    type="document_shared",
                    document_id=new_doc.id,
                    message=f"{sender_name} đã chia sẻ tài liệu '{doc.title}' vào kho của bạn.",
                    link="/personal/shared",
                )
                db.add(notif)
                auto_count += 1
                results.append(
                    ShareRecipientResult(
                        user_id=recipient.id,
                        username=recipient.username,
                        full_name=recipient.full_name,
                        document_id=doc.id,
                        status="auto_accepted",
                        share_id=share.id,
                    )
                )
            else:
                # 3. Cần xác nhận -> Áp dụng PostgreSQL Atomic INSERT ... ON CONFLICT DO NOTHING
                # Đảm bảo tuyệt đối không sinh ra 2 request Pending cho cùng bộ ba (from_user, to_user, source_doc)
                insert_stmt = (
                    pg_insert(DocumentShare)
                    .values(
                        source_document_id=doc.id,
                        document_id=None,
                        from_user_id=current_user.id,
                        to_user_id=recipient.id,
                        source_workspace_id=payload.source_workspace_id,
                        share_type=share_type,
                        status="pending",
                        message=payload.message,
                        expires_at=expires_at,
                    )
                    .on_conflict_do_nothing(
                        index_elements=["from_user_id", "to_user_id", "source_document_id"],
                        index_where=text("status = 'pending' AND source_document_id IS NOT NULL"),
                    )
                    .returning(DocumentShare.id)
                )
                created_id = (await db.execute(insert_stmt)).scalar_one_or_none()

                if created_id is not None:
                    # Request mới thực sự được tạo
                    doc_shared_any = True
                    pending_count += 1
                    sender_name = current_user.full_name or current_user.username
                    notif = Notification(
                        user_id=recipient.id,
                        type="document_share_request",
                        document_id=doc.id,
                        message=f"{sender_name} muốn chia sẻ tài liệu '{doc.title}' với bạn.",
                        link="/personal/shared?tab=requests",
                    )
                    db.add(notif)
                    results.append(
                        ShareRecipientResult(
                            user_id=recipient.id,
                            username=recipient.username,
                            full_name=recipient.full_name,
                            document_id=doc.id,
                            status="created",
                            share_id=created_id,
                        )
                    )
                else:
                    # Đã có request pending trùng -> KHÔNG tạo notification, giữ nguyên lịch sử
                    already_pending_count += 1
                    dup_count += 1
                    # Truy vấn lấy share_id hiện có để trả về cho FE
                    existing_share_id = (
                        await db.execute(
                            select(DocumentShare.id).where(
                                DocumentShare.from_user_id == current_user.id,
                                DocumentShare.to_user_id == recipient.id,
                                DocumentShare.source_document_id == doc.id,
                                DocumentShare.status == "pending",
                            )
                        )
                    ).scalar_one_or_none()
                    results.append(
                        ShareRecipientResult(
                            user_id=recipient.id,
                            username=recipient.username,
                            full_name=recipient.full_name,
                            document_id=doc.id,
                            status="already_pending",
                            share_id=existing_share_id,
                        )
                    )

        if doc_shared_any:
            src_meta = dict(doc.metadata_ or {})
            src_meta["is_shared"] = True
            src_meta["last_shared_at"] = now_iso
            doc.metadata_ = src_meta
            await _record_share_log(
                db,
                document_id=doc.id,
                user_id=current_user.id,
                action=ActivityAction.SHARED,
                workspace_context=ws_ctx,
                workspace_id=payload.source_workspace_id,
                extra_data={"recipients_count": len(targets)},
            )

    await db.commit()

    # Xây dựng thông điệp phản hồi rõ ràng cho người dùng
    if auto_count == 0 and pending_count == 0:
        if already_pending_count > 0 and already_owned_count == 0:
            msg = "Yêu cầu chia sẻ đã được gửi trước đó và đang chờ người nhận xác nhận."
        elif already_owned_count > 0 and already_pending_count == 0:
            msg = "Người nhận đã sở hữu tài liệu này trong kho cá nhân."
        else:
            msg = f"Tất cả {dup_count} người nhận đều đã có tài liệu hoặc đang chờ xác nhận."
    else:
        parts = []
        if auto_count > 0:
            parts.append(f"{auto_count} người nhận ngay")
        if pending_count > 0:
            parts.append(f"{pending_count} người đang chờ xác nhận")
        msg = f"Đã chia sẻ thành công: {', '.join(parts)}"
        if dup_count > 0:
            msg += f" (đã bỏ qua {dup_count} người do đã có hoặc đang chờ duyệt)"

    return ShareCreateOut(
        message=msg,
        auto_accepted_count=auto_count,
        pending_count=pending_count,
        already_pending_count=already_pending_count,
        already_owned_count=already_owned_count,
        skipped_duplicates_count=dup_count,
        results=results,
    )


@router.get("/received", response_model=List[DocumentShareOut])
async def list_received_shares(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Tab 1: Danh sách tài liệu đã nhận (đã copy vào kho cá nhân)"""
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.document),
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.to_user_id == current_user.id,
            DocumentShare.status.in_(["accepted", "auto_accepted"]),
            DocumentShare.document_id.isnot(None),
        )
        .order_by(desc(DocumentShare.responded_at), desc(DocumentShare.id))
        .offset(offset)
        .limit(limit)
    )
    shares = list((await db.execute(stmt)).scalars().all())
    # Lọc bỏ những tài liệu đã bị người nhận xóa mềm vào thùng rác
    active_shares = [
        s for s in shares if s.document and not s.document.is_deleted
    ]

    bundle_ids = [
        s.document.id for s in active_shares if s.document and s.document.is_bundle
    ]
    counts_map = {}
    if bundle_ids:
        c_res = await db.execute(
            select(Document.bundle_parent_id, func.count(Document.id))
            .where(
                Document.bundle_parent_id.in_(bundle_ids),
                Document.is_deleted == False,
            )
            .group_by(Document.bundle_parent_id)
        )
        counts_map = dict(c_res.all())

    doc_ids = [s.document.id for s in active_shares if s.document]
    stats_map = {}
    if doc_ids:
        st_res = await db.execute(
            select(DocumentStats).where(DocumentStats.document_id.in_(doc_ids))
        )
        stats_map = {st.document_id: st for st in st_res.scalars().all()}

    out_list: List[DocumentShareOut] = []
    for s in active_shares:
        item = DocumentShareOut.model_validate(s)
        if item.document:
            if item.document.is_bundle:
                item.document.bundle_children_count = counts_map.get(
                    item.document.id, 0
                )
            st = stats_map.get(item.document.id)
            if st:
                item.document.view_count = int(st.view_count or 0)
                item.document.download_count = int(st.download_count or 0)
                item.document.share_count = int(st.share_count or 0)
                item.document.trending_score = float(st.trending_score or 0.0)
        out_list.append(item)

    return out_list


@router.get("/pending", response_model=List[DocumentShareOut])
async def list_pending_shares(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tab 2: Danh sách lời mời đang chờ xác nhận"""
    now = datetime.now(timezone.utc)
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.to_user_id == current_user.id,
            DocumentShare.status == "pending",
        )
        .order_by(desc(DocumentShare.created_at))
    )
    shares = (await db.execute(stmt)).scalars().all()

    valid_shares: List[DocumentShare] = []
    expired_ids = []
    for s in shares:
        if s.expires_at and s.expires_at < now:
            s.status = "expired"
            expired_ids.append(s.id)
        else:
            valid_shares.append(s)

    if expired_ids:
        await db.commit()

    return valid_shares


@router.get("/sent", response_model=List[DocumentShareOut])
async def list_sent_shares(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Tab 3: Danh sách yêu cầu chia sẻ do tôi gửi đi"""
    now = datetime.now(timezone.utc)
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.document),
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.from_user_id == current_user.id,
        )
        .order_by(desc(DocumentShare.created_at))
        .offset(offset)
        .limit(limit)
    )
    shares = list((await db.execute(stmt)).scalars().all())

    # Cập nhật các yêu cầu pending đã hết hạn
    expired_ids = []
    for s in shares:
        if s.status == "pending" and s.expires_at and s.expires_at < now:
            s.status = "expired"
            expired_ids.append(s.id)

    if expired_ids:
        await db.commit()

    return [DocumentShareOut.model_validate(s) for s in shares]


@router.post("/{share_id}/accept", response_model=DocumentShareOut)
async def accept_share(
    share_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chấp nhận lời mời chia sẻ -> tạo bản sao Document vào kho cá nhân"""
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.id == share_id,
            DocumentShare.to_user_id == current_user.id,
        )
        .with_for_update()
    )
    share = (await db.execute(stmt)).scalar_one_or_none()
    if not share:
        raise HTTPException(404, "Không tìm thấy lời mời chia sẻ")

    if share.status != "pending":
        raise HTTPException(400, f"Lời mời đã ở trạng thái '{share.status}'")

    now = datetime.now(timezone.utc)
    if share.expires_at and share.expires_at < now:
        share.status = "expired"
        await db.commit()
        raise HTTPException(410, "Lời mời chia sẻ đã hết hạn")

    src_doc = share.source_document
    if not src_doc or src_doc.is_deleted:
        share.status = "rejected"
        await db.commit()
        raise HTTPException(
            410, "Tài liệu gốc đã bị xóa hoặc không còn khả dụng trên hệ thống"
        )

    # Copy file (kèm children nếu là bundle, metadata người chia sẻ và ghi log 2 phía)
    new_doc = await _copy_doc_to_user(
        db, src_doc, current_user.id, share.from_user, share.message
    )
    share.document_id = new_doc.id
    share.status = "accepted"
    share.responded_at = now

    recipient_name = current_user.full_name or current_user.username
    notif = Notification(
        user_id=share.from_user_id,
        type="share_accepted",
        document_id=src_doc.id,
        message=f"{recipient_name} đã chấp nhận tài liệu '{src_doc.title}' bạn chia sẻ.",
        link="/personal/shared",
    )
    db.add(notif)

    await db.commit()
    await db.refresh(share)
    return share


@router.post("/{share_id}/reject", response_model=DocumentShareOut)
async def reject_share(
    share_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Từ chối lời mời chia sẻ (không tạo bản sao)"""
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.id == share_id,
            DocumentShare.to_user_id == current_user.id,
        )
        .with_for_update()
    )
    share = (await db.execute(stmt)).scalar_one_or_none()
    if not share:
        raise HTTPException(404, "Không tìm thấy lời mời chia sẻ")

    if share.status != "pending":
        raise HTTPException(400, f"Lời mời đã ở trạng thái '{share.status}'")

    share.status = "rejected"
    share.responded_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(share)
    return share


@router.post("/{share_id}/withdraw", response_model=DocumentShareOut)
async def withdraw_share(
    share_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Người gửi rút lại yêu cầu chia sẻ đang ở trạng thái pending"""
    stmt = (
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.source_document),
            selectinload(DocumentShare.from_user),
            selectinload(DocumentShare.to_user),
        )
        .where(
            DocumentShare.id == share_id,
            DocumentShare.from_user_id == current_user.id,
        )
        .with_for_update()
    )
    share = (await db.execute(stmt)).scalar_one_or_none()
    if not share:
        raise HTTPException(404, "Không tìm thấy yêu cầu chia sẻ")

    if share.status != "pending":
        raise HTTPException(
            400, f"Chỉ có thể rút yêu cầu đang ở trạng thái pending (hiện tại: '{share.status}')"
        )

    share.status = "withdrawn"
    share.responded_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(share)
    return share
