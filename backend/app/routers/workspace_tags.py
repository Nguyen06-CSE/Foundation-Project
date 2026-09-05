# backend/app/routers/workspace_tags.py

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.params import Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace_tag import (
    WorkspaceTagCreate, WorkspaceTagImport, WorkspaceTagOut, WorkspaceTagUpdate
)
from app.services.workspace_tag_service import WorkspaceTagService

router = APIRouter(prefix="/workspaces", tags=["workspace_tags"])


async def get_workspace_or_404(
    workspace_id: int, db: AsyncSession, current_user: User
) -> Workspace:
    """Helper: lấy workspace và check user là member"""
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "Workspace không tồn tại")
    # TODO: Check user là member của workspace
    return ws


@router.get("/{workspace_id}/tags/", response_model=list[WorkspaceTagOut])
async def list_workspace_tags(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách tags trong workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)

    tags = await WorkspaceTagService.get_workspace_tags(db, workspace_id)
    # Map to schema — tạm hardcode, sau dùng Pydantic computed_field
    return [
        WorkspaceTagOut(
            id=t.id,
            workspace_id=t.workspace_id,
            tag_id=t.tag_id,
            name=t.tag.name,
            color=t.tag.color,
            owner_user_id=t.owner_user_id,
            owner_username=t.owner.username,
            owner_full_name=t.owner.full_name,
            created_at=t.created_at,
        )
        for t in tags
    ]


@router.post("/{workspace_id}/tags/import", response_model=dict)
async def import_tags(
    workspace_id: int,
    payload: WorkspaceTagImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import personal tags vào workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)

    try:
        imported = await WorkspaceTagService.import_personal_tags(
            db, workspace_id, current_user.id, payload.tag_ids
        )
        await db.commit()
        return {
            "imported_count": len(imported),
            "workspace_tag_ids": [t.id for t in imported],
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{workspace_id}/tags/", response_model=WorkspaceTagOut)
async def create_workspace_tag(
    workspace_id: int,
    payload: WorkspaceTagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo tag mới trong workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)

    try:
        ws_tag = await WorkspaceTagService.create_workspace_tag(
            db, workspace_id, current_user.id, payload.name, payload.color
        )
        await db.commit()
        await db.refresh(ws_tag, ["tag", "owner"])

        return WorkspaceTagOut(
            id=ws_tag.id,
            workspace_id=ws_tag.workspace_id,
            tag_id=ws_tag.tag_id,
            name=ws_tag.tag.name,
            color=ws_tag.tag.color,
            owner_user_id=ws_tag.owner_user_id,
            owner_username=ws_tag.owner.username,
            owner_full_name=ws_tag.owner.full_name,
            created_at=ws_tag.created_at,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
    
@router.post("/{workspace_id}/tags/bulk", status_code=status.HTTP_201_CREATED)
async def create_workspace_tags_bulk(
    workspace_id: int,
    tag_ids: list[int] = Body(..., embed=True), # Nhận JSON: {"tag_ids": [1, 2, 3]}
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thêm hàng loạt tag có sẵn vào workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)

    if not tag_ids:
        return {"message": "Không có thẻ nào được chọn"}

    try:
        # Lấy thông tin các thẻ gốc của user dựa trên tag_ids
        # (Giả định bạn có model Tag lưu trữ thẻ của user)
        from app.models.tag import Tag 
        query = select(Tag).where(Tag.id.in_(tag_ids), Tag.owner_id == current_user.id)
        result = await db.execute(query)
        user_tags = result.scalars().all()

        if not user_tags:
            raise HTTPException(404, "Không tìm thấy thẻ hợp lệ")

        # Lặp qua các thẻ hợp lệ để tạo WorkspaceTag
        # Lưu ý: Hàm create_workspace_tag nên dùng db.flush() bên trong thay vì db.commit() 
        # để có thể gom commit vào cuối chu trình này.
        for tag in user_tags:
            await WorkspaceTagService.create_workspace_tag(
                db, workspace_id, current_user.id, tag.name, tag.color
            )
            
        await db.commit()
        return {"message": f"Đã thêm thành công {len(user_tags)} thẻ vào nhóm"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))


@router.patch("/{workspace_id}/tags/{workspace_tag_id}", response_model=WorkspaceTagOut)
async def update_workspace_tag(
    workspace_id: int,
    workspace_tag_id: int,
    payload: WorkspaceTagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename tag trong workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)
    is_owner = ws.owner_id == current_user.id

    try:
        ws_tag = await WorkspaceTagService.update_workspace_tag_name(
            db, workspace_id, workspace_tag_id,
            payload.name or "", current_user.id, is_owner
        )
        await db.commit()
        await db.refresh(ws_tag, ["tag", "owner"])

        return WorkspaceTagOut(
            id=ws_tag.id,
            workspace_id=ws_tag.workspace_id,
            tag_id=ws_tag.tag_id,
            name=ws_tag.tag.name,
            color=ws_tag.tag.color,
            owner_user_id=ws_tag.owner_user_id,
            owner_username=ws_tag.owner.username,
            owner_full_name=ws_tag.owner.full_name,
            created_at=ws_tag.created_at,
        )
    except PermissionError:
        raise HTTPException(403, "Không có quyền sửa tag này")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{workspace_id}/tags/{workspace_tag_id}", status_code=204)
async def delete_workspace_tag(
    workspace_id: int,
    workspace_tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa tag khỏi workspace"""
    ws = await get_workspace_or_404(workspace_id, db, current_user)
    is_owner = ws.owner_id == current_user.id

    try:
        await WorkspaceTagService.delete_workspace_tag(
            db, workspace_id, workspace_tag_id, current_user.id, is_owner
        )
        await db.commit()
    except PermissionError:
        raise HTTPException(403, "Không có quyền xóa tag này")
    except ValueError as e:
        raise HTTPException(400, str(e))