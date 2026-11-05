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

export const TASK_EVENT_TYPES = ["task", "study", "activity", "exam", "important", "holiday"] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

export function isTaskEventType(value: unknown): value is TaskEventType {
  return TASK_EVENT_TYPES.some((type) => type === value);
}

/** Historical records without a type remain ordinary tasks. */
export function normalizeTaskEventType(value: unknown): TaskEventType {
  return isTaskEventType(value) ? value : "task";
}

/** Calendar date in the user's local timezone, serialized as YYYY-MM-DD. */
export type TaskDate = string;

/** Optional local wall-clock time, serialized as HH:mm. */
export type TaskTime = string | null;

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  eventType?: TaskEventType;
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
  eventType?: TaskEventType;
  dueDate: TaskDate;
  dueTime?: TaskTime;
}

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "category"
    | "eventType"
    | "dueDate"
    | "dueTime"
    | "completed"
  >
>;

export function getTaskStatus(task: Pick<Task, "completed">): TaskStatus {
  return task.completed ? "completed" : "active";
}
