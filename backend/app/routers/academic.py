# app/routers/academics.py
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.faculty import Faculty
from app.models.academic_class import Class

router = APIRouter(prefix="/academics", tags=["academics"])


@router.get("/faculties")
async def get_faculties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Faculty))
    return result.scalars().all()


@router.get("/classes")
async def get_classes(faculty_id: int = None, db: AsyncSession = Depends(get_db)):
    query = select(Class)
    if faculty_id:
        query = query.where(Class.faculty_id == faculty_id)
    result = await db.execute(query)
    return result.scalars().all()