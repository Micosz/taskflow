import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";

export type TaskRepositoryListener = (tasks: readonly Task[]) => void;
export type Unsubscribe = () => void;

/**
 * UI-facing data boundary. A Supabase-backed adapter can implement this same
 * contract without changing task components or state management.
 */
export interface TaskRepository {
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  subscribe(listener: TaskRepositoryListener): Unsubscribe;
}

export interface ResettableTaskRepository extends TaskRepository {
  resetToSampleTasks(): Promise<Task[]>;
}

export type TaskRepositoryErrorCode =
  | "not_found"
  | "invalid_input"
  | "storage_unavailable";

export class TaskRepositoryError extends Error {
  constructor(
    public readonly code: TaskRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TaskRepositoryError";
  }
}
