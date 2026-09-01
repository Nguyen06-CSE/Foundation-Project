# backend/app/routers/folders.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.tag import Tag
from app.models.user import User
from app.schemas.folder import FolderOut, FolderCreate, FolderUpdate, AddTagsToFolder
from app.services.folder_service import get_folders_with_stats

router = APIRouter(prefix="/folders", tags=["folders"])

@router.get("/", response_model=List[FolderOut])
async def list_folders(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await get_folders_with_stats(db, current_user.id)

@router.get("/{folder_id}", response_model=FolderOut)
async def get_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)

    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")

    folders = await get_folders_with_stats(db, current_user.id)

    return next(
        (f for f in folders if f["id"] == folder_id),
        None
    )

@router.post("/", response_model=FolderOut, status_code=201)
async def create_folder(payload: FolderCreate, db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    folder = Folder(owner_id=current_user.id,
                    name=payload.name, color=payload.color)
    db.add(folder)
    await db.flush()
    for tag_id in payload.tag_ids:
        # Xác nhận tag thuộc user này
        tag = await db.get(Tag, tag_id)
        if tag and tag.owner_id == current_user.id:
            db.add(FolderTag(folder_id=folder.id, tag_id=tag_id))
    await db.commit()
    await db.refresh(folder)
    folders = await get_folders_with_stats(db, current_user.id)
    return next(f for f in folders if f["id"] == folder.id)

@router.patch("/{folder_id}", response_model=FolderOut)
async def update_folder(folder_id: int, payload: FolderUpdate,
                        db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")
    if payload.name is not None: folder.name = payload.name
    if payload.color is not None: folder.color = payload.color
    await db.commit()
    folders = await get_folders_with_stats(db, current_user.id)
    return next(f for f in folders if f["id"] == folder_id)

@router.delete("/{folder_id}", status_code=204)
async def delete_folder(folder_id: int, db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")
    await db.delete(folder)
    await db.commit()

@router.post("/{folder_id}/tags", status_code=204)
async def add_tags_to_folder(folder_id: int, payload: AddTagsToFolder,
                             db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")
    for tag_id in payload.tag_ids:
        tag = await db.get(Tag, tag_id)
        if tag and tag.owner_id == current_user.id:
            existing = await db.get(FolderTag, (folder_id, tag_id))
            if not existing:
                db.add(FolderTag(folder_id=folder_id, tag_id=tag_id))
    await db.commit()

@router.delete("/{folder_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_folder(folder_id: int, tag_id: int,
                                 db: AsyncSession = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")
    ft = await db.get(FolderTag, (folder_id, tag_id))
    if ft:
        await db.delete(ft)
        await db.commit()
