# backend/app/routers/tags.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.document_tag import document_tags
from app.models.folder_tag import FolderTag
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagMergeIn, TagOut, TagStatsOut, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=list[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Tag).where(Tag.owner_id == current_user.id).order_by(Tag.name.asc())
    )
    return result.scalars().all()


@router.get("/stats", response_model=list[TagStatsOut])
async def list_tags_with_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags_res = await db.execute(
        select(Tag).where(Tag.owner_id == current_user.id).order_by(Tag.name.asc())
    )
    tags = tags_res.scalars().all()
    if not tags:
        return []

    tag_ids = [t.id for t in tags]

    doc_counts_res = await db.execute(
        select(document_tags.c.tag_id, func.count(document_tags.c.document_id))
        .join(Document, Document.id == document_tags.c.document_id)
        .where(
            document_tags.c.tag_id.in_(tag_ids),
            Document.is_deleted == False,
        )
        .group_by(document_tags.c.tag_id)
    )
    doc_counts = {row[0]: int(row[1]) for row in doc_counts_res.all()}

    folder_counts_res = await db.execute(
        select(FolderTag.tag_id, func.count(FolderTag.folder_id))
        .where(FolderTag.tag_id.in_(tag_ids))
        .group_by(FolderTag.tag_id)
    )
    folder_counts = {row[0]: int(row[1]) for row in folder_counts_res.all()}

    return [
        TagStatsOut(
            id=t.id,
            name=t.name,
            color=t.color,
            owner_id=t.owner_id,
            workspace_id=t.workspace_id,
            document_count=doc_counts.get(t.id, 0),
            folder_count=folder_counts.get(t.id, 0),
        )
        for t in tags
    ]


@router.get("/name/{name}", response_model=TagOut)
async def get_tag_by_name(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Tag).where(Tag.name == name, Tag.owner_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Không tìm thấy tag với tên này")
    return tag


@router.post("/", response_model=TagOut, status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_name = payload.name.strip()
    dup = (
        await db.execute(
            select(Tag).where(
                Tag.owner_id == current_user.id,
                func.lower(Tag.name) == clean_name.lower(),
            )
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=409, detail="Nhãn dán với tên này đã tồn tại")

    data = payload.model_dump()
    data["name"] = clean_name
    tag = Tag(owner_id=current_user.id, **data)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.post("/merge", response_model=TagOut)
async def merge_tags(
    payload: TagMergeIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_ids = [sid for sid in set(payload.source_ids) if sid != payload.target_id]
    if not source_ids:
        raise HTTPException(status_code=400, detail="Cần chọn ít nhất 1 nhãn nguồn khác nhãn đích")

    target = (
        await db.execute(
            select(Tag).where(Tag.id == payload.target_id, Tag.owner_id == current_user.id)
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhãn đích")

    sources_res = await db.execute(
        select(Tag).where(Tag.id.in_(source_ids), Tag.owner_id == current_user.id)
    )
    sources = sources_res.scalars().all()
    valid_source_ids = [s.id for s in sources]
    if not valid_source_ids:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhãn nguồn hợp lệ")

    # Chuyển liên kết document_tags sang target_id
    doc_links = (
        await db.execute(
            select(document_tags.c.document_id).where(document_tags.c.tag_id.in_(valid_source_ids))
        )
    ).scalars().all()
    for doc_id in set(doc_links):
        await db.execute(
            pg_insert(document_tags)
            .values(document_id=doc_id, tag_id=target.id)
            .on_conflict_do_nothing()
        )
    await db.execute(delete(document_tags).where(document_tags.c.tag_id.in_(valid_source_ids)))

    # Chuyển liên kết folder_tags sang target_id
    folder_links = (
        await db.execute(
            select(FolderTag.folder_id).where(FolderTag.tag_id.in_(valid_source_ids))
        )
    ).scalars().all()
    existing_target_folders = set(
        (
            await db.execute(
                select(FolderTag.folder_id).where(FolderTag.tag_id == target.id)
            )
        ).scalars().all()
    )
    for fid in set(folder_links):
        if fid not in existing_target_folders:
            db.add(FolderTag(folder_id=fid, tag_id=target.id))
    await db.execute(delete(FolderTag).where(FolderTag.tag_id.in_(valid_source_ids)))

    for s in sources:
        await db.delete(s)

    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/{tag_id}", response_model=TagOut)
async def update_tag(
    tag_id: int,
    payload: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.owner_id == current_user.id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Không tìm thấy tag")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"]:
        clean_name = updates["name"].strip()
        dup = (
            await db.execute(
                select(Tag).where(
                    Tag.owner_id == current_user.id,
                    Tag.id != tag_id,
                    func.lower(Tag.name) == clean_name.lower(),
                )
            )
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(status_code=409, detail="Nhãn dán với tên này đã tồn tại")
        updates["name"] = clean_name

    for key, value in updates.items():
        setattr(tag, key, value)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.owner_id == current_user.id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Không tìm thấy tag")
    await db.delete(tag)
    await db.commit()
