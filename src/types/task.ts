export const TASK_VIEWS = [
  "active",
  "today",
  "upcoming",
  "overdue",
  "completed",
] as const;

export type TaskView = (typeof TASK_VIEWS)[number];
export const DEFAULT_TASK_VIEW: TaskView = "active";
export type TaskFilter = TaskView;
export type TaskStatus = "active" | "completed";
export type TaskCategory = string;

/** Calendar date in the user's local timezone, serialized as YYYY-MM-DD. */
export type TaskDate = string;

/** Optional local wall-clock time, serialized as HH:mm. */
export type TaskTime = string | null;

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  dueDate: TaskDate;
  dueTime: TaskTime;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  dueDate: TaskDate;
  dueTime?: TaskTime;
}

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "category"
    | "dueDate"
    | "dueTime"
    | "completed"
  >
>;

export function getTaskStatus(task: Pick<Task, "completed">): TaskStatus {
  return task.completed ? "completed" : "active";
}
