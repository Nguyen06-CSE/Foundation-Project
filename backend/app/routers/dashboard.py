# backend/app/routers/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def read_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trả về toàn bộ số liệu thống kê tổng hợp cho trang cá nhân (/personal):
    - Dải chờ xử lý (lời mời nhóm, đóng góp bị từ chối 14 ngày, file thùng rác sắp hết hạn)
    - 5 thẻ số liệu chính (tổng doc cá nhân, dung lượng, chia sẻ, yêu thích, học liệu)
    - Thống kê nhóm & 3 nhóm mới cập nhật nhất
    - 4 tài liệu cá nhân vừa mở gần nhất
    - 6 hoạt động gần nhất của người dùng
    """
    return await dashboard_service.get_dashboard_summary(db, current_user)
