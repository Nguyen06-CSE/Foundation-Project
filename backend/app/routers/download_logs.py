# app/routers/download_logs.py
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.download_log import DownloadLog
from app.models.user import User

router = APIRouter(prefix="/download-logs", tags=["download_logs"])


@router.get("/")
async def get_my_download_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DownloadLog).where(DownloadLog.user_id == current_user.id)
    )
    return result.scalars().all()