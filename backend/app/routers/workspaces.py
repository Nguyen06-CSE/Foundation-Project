# app/routers/workspaces.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.user import User

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/")
async def list_my_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.owner_id == current_user.id,
            Workspace.is_deleted == False
        )
    )
    return result.scalars().all()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    name: str,
    type: str,
    description: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = Workspace(
        name=name,
        type=type,
        description=description,
        owner_id=current_user.id
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    
    # Thêm Owner vào làm Member đầu tiên
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        permission_level="admin"
    )
    db.add(member)
    await db.commit()
    return workspace