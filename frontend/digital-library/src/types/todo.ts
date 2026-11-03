export type TodoTaskType =
  | "read_document"
  | "upload_to_group"
  | "view_group_document"
  | "custom";

export type TodoPriority = "low" | "normal" | "high";

export interface UserTodo {
  id: number;
  user_id: number;
  title: string;
  note?: string | null;
  task_type: TodoTaskType | string;
  document_id?: number | null;
  document_title?: string | null;
  workspace_id?: number | null;
  workspace_name?: string | null;
  start_at?: string | null;
  due_at?: string | null;
  priority: TodoPriority | string;
  remind_before_minutes?: number | null;
  completed_at?: string | null;
  is_completed: boolean;
  created_at?: string | null;
}

export interface CreateTodoInput {
  title: string;
  note?: string | null;
  task_type?: TodoTaskType | string;
  document_id?: number | null;
  workspace_id?: number | null;
  start_at?: string | null;
  due_at?: string | null;
  priority?: TodoPriority | string;
  remind_before_minutes?: number | null;
}

export interface UpdateTodoInput extends Partial<CreateTodoInput> {
  is_completed?: boolean;
}
