from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.todo import UserTodo
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.todo import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


async def _to_todo_out(db: AsyncSession, todo: UserTodo) -> TodoOut:
    doc_title: Optional[str] = None
    ws_name: Optional[str] = None
    if todo.document_id:
        doc = await db.get(Document, todo.document_id)
        doc_title = doc.title if doc else None
    if todo.workspace_id:
        ws = await db.get(Workspace, todo.workspace_id)
        ws_name = ws.name if ws else None

    return TodoOut(
        id=todo.id,
        user_id=todo.user_id,
        title=todo.title,
        note=todo.note,
        task_type=todo.task_type,
        document_id=todo.document_id,
        document_title=doc_title,
        workspace_id=todo.workspace_id,
        workspace_name=ws_name,
        start_at=todo.start_at,
        due_at=todo.due_at,
        priority=todo.priority or "normal",
        remind_before_minutes=todo.remind_before_minutes,
        completed_at=todo.completed_at,
        is_completed=todo.completed_at is not None,
        created_at=todo.created_at,
    )


@router.get("/", response_model=list[TodoOut])
async def list_todos(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(
            UserTodo,
            Document.title.label("doc_title"),
            Workspace.name.label("ws_name"),
        )
        .outerjoin(Document, Document.id == UserTodo.document_id)
        .outerjoin(Workspace, Workspace.id == UserTodo.workspace_id)
        .where(UserTodo.user_id == current_user.id)
    )
    if status_filter == "open":
        stmt = stmt.where(UserTodo.completed_at.is_(None))
    elif status_filter == "done":
        stmt = stmt.where(UserTodo.completed_at.is_not(None))

    stmt = stmt.order_by(
        UserTodo.completed_at.is_not(None),
        asc(UserTodo.due_at).nulls_last(),
        desc(UserTodo.created_at),
    )
    res = await db.execute(stmt)
    rows = res.all()
    return [
        TodoOut(
            id=todo.id,
            user_id=todo.user_id,
            title=todo.title,
            note=todo.note,
            task_type=todo.task_type,
            document_id=todo.document_id,
            document_title=doc_title,
            workspace_id=todo.workspace_id,
            workspace_name=ws_name,
            start_at=todo.start_at,
            due_at=todo.due_at,
            priority=todo.priority or "normal",
            remind_before_minutes=todo.remind_before_minutes,
            completed_at=todo.completed_at,
            is_completed=todo.completed_at is not None,
            created_at=todo.created_at,
        )
        for todo, doc_title, ws_name in rows
    ]


@router.post("/", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
async def create_todo(
    payload: TodoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = UserTodo(
        user_id=current_user.id,
        title=payload.title.strip(),
        note=payload.note,
        task_type=payload.task_type,
        document_id=payload.document_id,
        workspace_id=payload.workspace_id,
        start_at=payload.start_at,
        due_at=payload.due_at,
        priority=payload.priority,
        remind_before_minutes=payload.remind_before_minutes,
    )
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return await _to_todo_out(db, todo)


@router.patch("/{todo_id}", response_model=TodoOut)
async def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(UserTodo).where(UserTodo.id == todo_id, UserTodo.user_id == current_user.id)
    )
    todo = res.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Không tìm thấy việc cần làm")

    data = payload.model_dump(exclude_unset=True)
    if "is_completed" in data:
        is_comp = data.pop("is_completed")
        if is_comp:
            todo.completed_at = datetime.now(timezone.utc)
        else:
            todo.completed_at = None

    for key, val in data.items():
        setattr(todo, key, val)

    await db.commit()
    await db.refresh(todo)
    return await _to_todo_out(db, todo)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(UserTodo).where(UserTodo.id == todo_id, UserTodo.user_id == current_user.id)
    )
    todo = res.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Không tìm thấy việc cần làm")
    await db.delete(todo)
    await db.commit()
