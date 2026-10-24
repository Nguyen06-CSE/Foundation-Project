import os
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.document import Document
from app.models.workspace import Workspace
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.workspace_member import WorkspaceMember
from app.services.file_service import remove_file_if_unreferenced, safe_remove as _safe_remove
from app.services.group_service import copy_file

scheduler = AsyncIOScheduler()


async def dissolve_workspace(db: AsyncSession, workspace: Workspace) -> None:
    docs_result = await db.execute(
        select(Document).where(
            Document.workspace_id == workspace.id,
            Document.is_deleted == False,
        )
    )
    docs = docs_result.scalars().all()

    for doc in docs:
        saved_result = await db.execute(
            select(Document).where(
                Document.source_document_id == doc.id,
                Document.workspace_id.is_(None),
            )
        )
        saved_copies = saved_result.scalars().all()

        if saved_copies:
            for copy in saved_copies:
                copy.is_deleted = True
                copy.deleted_at = datetime.utcnow()
                copy.trash_source = "group_dissolved"
                copy.trash_group_name = workspace.name
        else:
            orphan_dir = f"storage/orphaned/{workspace.id}"
            try:
                doc.file_path = await copy_file(
                    doc.file_path,
                    orphan_dir,
                    os.path.basename(doc.file_path),
                )
            except OSError:
                pass
            doc.is_orphaned = True
            doc.orphaned_at = datetime.utcnow()

        doc.is_deleted = True
        doc.deleted_at = datetime.utcnow()

    members = (
        await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id))
    ).scalars().all()
    invitations = (
        await db.execute(select(WorkspaceInvitation).where(WorkspaceInvitation.workspace_id == workspace.id))
    ).scalars().all()
    for member in members:
        await db.delete(member)
    for invitation in invitations:
        await db.delete(invitation)

    workspace.is_deleted = True
    workspace.deleted_at = datetime.utcnow()
    await db.commit()


async def execute_group_dissolution() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Workspace).where(
                Workspace.is_dissolving == True,
                Workspace.dissolve_at <= datetime.utcnow(),
                Workspace.is_deleted == False,
            )
        )
        for workspace in result.scalars().all():
            await dissolve_workspace(db, workspace)


async def cleanup_orphaned_documents() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=10)
        result = await db.execute(
            select(Document).where(
                Document.is_orphaned == True,
                Document.orphaned_at < cutoff,
            )
        )
        for doc in result.scalars().all():
            await remove_file_if_unreferenced(db, doc.file_path, exclude_doc_ids={doc.id})
            await remove_file_if_unreferenced(db, doc.thumbnail_path, exclude_doc_ids={doc.id})
            await remove_file_if_unreferenced(db, doc.markdown_path, exclude_doc_ids={doc.id})
            await db.delete(doc)
        await db.commit()


async def cleanup_deleted_documents() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(Document).where(
                Document.is_deleted == True,
                Document.deleted_at < cutoff,
            )
        )
        docs = result.scalars().all()
        for doc in docs:
            exclude_ids = {doc.id}
            if doc.is_bundle:
                children = (await db.execute(
                    select(Document).where(
                        Document.bundle_parent_id == doc.id
                    )
                )).scalars().all()
                exclude_ids.update(c.id for c in children)
                for child in children:
                    await remove_file_if_unreferenced(db, child.file_path, exclude_doc_ids=exclude_ids)
                    await remove_file_if_unreferenced(db, child.thumbnail_path, exclude_doc_ids=exclude_ids)
                    await remove_file_if_unreferenced(db, child.markdown_path, exclude_doc_ids=exclude_ids)
                    await db.delete(child)
            await remove_file_if_unreferenced(db, doc.file_path, exclude_doc_ids=exclude_ids)
            await remove_file_if_unreferenced(db, doc.thumbnail_path, exclude_doc_ids=exclude_ids)
            await remove_file_if_unreferenced(db, doc.markdown_path, exclude_doc_ids=exclude_ids)
            await db.delete(doc)
        await db.commit()


# Alias để tương thích ngược
cleanup_personal_trash = cleanup_deleted_documents


def register_jobs() -> None:
    scheduler.add_job(execute_group_dissolution, CronTrigger(minute="*/5"))
    scheduler.add_job(cleanup_orphaned_documents, CronTrigger(hour=0, minute=0))
    scheduler.add_job(cleanup_deleted_documents, CronTrigger(hour=0, minute=10))
