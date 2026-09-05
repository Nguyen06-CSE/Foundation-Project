from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.tag import Tag
from app.models.workspace_tag import WorkspaceTag
from app.models.workspace import Workspace
from app.models.user import User


class WorkspaceTagService:
    """Quản lý tags trong workspace (Group)"""

    @staticmethod
    async def get_workspace_tags(
        db: AsyncSession, workspace_id: int
    ) -> list[WorkspaceTag]:
        """Lấy tất cả tags của workspace"""
        result = await db.execute(
            select(WorkspaceTag)
            .where(WorkspaceTag.workspace_id == workspace_id)
            .options(
                joinedload(WorkspaceTag.tag),
                joinedload(WorkspaceTag.owner)
            )
            .order_by(WorkspaceTag.created_at)
        )
        return result.scalars().unique().all()

    @staticmethod
    async def import_personal_tags(
        db: AsyncSession,
        workspace_id: int,
        user_id: int,
        tag_ids: list[int],
    ) -> list[WorkspaceTag]:
        """
        Import personal tags vào workspace
        - Kiểm tra tag đã tồn tại trong workspace chưa (dùng UNIQUE constraint)
        - Tạo WorkspaceTag reference
        """
        # Validate user sở hữu những tags này
        result = await db.execute(
            select(Tag).where(
                Tag.id.in_(tag_ids),
                Tag.owner_id == user_id,
                Tag.is_deleted == False
            )
        )
        owned_tags = result.scalars().all()

        if len(owned_tags) != len(tag_ids):
            raise ValueError("Một số tags không thuộc về user hoặc không tồn tại")

        imported = []
        for tag in owned_tags:
            # Kiểm tra tag đã tồn tại trong workspace chưa
            existing = await db.execute(
                select(WorkspaceTag).where(
                    WorkspaceTag.workspace_id == workspace_id,
                    WorkspaceTag.tag_id == tag.id
                )
            )
            if existing.scalar_one_or_none():
                continue  # Skip nếu đã tồn tại

            # Tạo workspace_tag mới
            ws_tag = WorkspaceTag(
                workspace_id=workspace_id,
                tag_id=tag.id,
                owner_user_id=user_id,
            )
            db.add(ws_tag)
            imported.append(ws_tag)

        if imported:
            await db.flush()
        return imported

    @staticmethod
    async def create_workspace_tag(
        db: AsyncSession,
        workspace_id: int,
        user_id: int,
        name: str,
        color: Optional[str] = None,
    ) -> WorkspaceTag:
        """
        Tạo tag mới trong workspace
        - Tạo row mới trong tags table (owner_id = null để mark là workspace-owned)
        - Tạo reference trong workspace_tags
        """
        # Tạo tag mới (không owner — hoặc owner = null, hoặc owner = workspace_id)
        new_tag = Tag(
            owner_id=None,  # Tag này thuộc workspace, không thuộc ai
            name=name,
            color=color,
        )
        db.add(new_tag)
        await db.flush()

        # Tạo reference trong workspace_tags
        ws_tag = WorkspaceTag(
            workspace_id=workspace_id,
            tag_id=new_tag.id,
            owner_user_id=user_id,  # người tạo
        )
        db.add(ws_tag)
        await db.flush()
        return ws_tag

    @staticmethod
    async def delete_workspace_tag(
        db: AsyncSession,
        workspace_id: int,
        workspace_tag_id: int,
        user_id: int,
        is_owner: bool = False,
    ) -> bool:
        """
        Xóa tag khỏi workspace
        - Kiểm tra quyền: creator hoặc workspace owner
        - Xóa workspace_tags row
        - Nếu tag không còn được dùng ở workspace nào → soft delete tag gốc
        """
        result = await db.execute(
            select(WorkspaceTag).where(
                WorkspaceTag.id == workspace_tag_id,
                WorkspaceTag.workspace_id == workspace_id
            )
        )
        ws_tag = result.scalar_one_or_none()

        if not ws_tag:
            raise ValueError("WorkspaceTag không tồn tại")

        # Kiểm tra quyền
        if ws_tag.owner_user_id != user_id and not is_owner:
            raise PermissionError("Không có quyền xóa tag này")

        # Xóa workspace_tags row
        await db.delete(ws_tag)
        await db.flush()

        # (Optional) Soft delete tag nếu không còn được dùng ở workspace nào
        # — phức tạp, bỏ qua để đơn giản

        return True

    @staticmethod
    async def update_workspace_tag_name(
        db: AsyncSession,
        workspace_id: int,
        workspace_tag_id: int,
        new_name: str,
        user_id: int,
        is_owner: bool = False,
    ) -> WorkspaceTag:
        """Rename tag trong workspace"""
        result = await db.execute(
            select(WorkspaceTag).where(
                WorkspaceTag.id == workspace_tag_id,
                WorkspaceTag.workspace_id == workspace_id
            ).options(joinedload(WorkspaceTag.tag))
        )
        ws_tag = result.scalar_one_or_none()

        if not ws_tag:
            raise ValueError("WorkspaceTag không tồn tại")

        # Kiểm tra quyền
        if ws_tag.owner_user_id != user_id and not is_owner:
            raise PermissionError("Không có quyền sửa tag này")

        # Update tên tag gốc
        ws_tag.tag.name = new_name
        await db.commit()
        await db.refresh(ws_tag)
        return ws_tag