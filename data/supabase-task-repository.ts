import {
  TaskRepositoryError,
  type TaskRepository,
  type TaskRepositoryListener,
  type Unsubscribe,
} from "@/data/task-repository";
import {
  createSupabaseBrowserClient,
  type TaskFlowSupabaseClient,
} from "@/lib/supabase/client";
import type {
  TaskInsert,
  TaskRow,
  TaskUpdate,
} from "@/lib/supabase/database.types";
import {
  TASK_PRIORITIES,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
  type UpdateTaskInput,
} from "@/types/task";

const TASK_TOPIC_PREFIX = "taskflow:tasks:";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface SupabaseTaskRepositoryOptions {
  client?: TaskFlowSupabaseClient;
  onRealtimeError?: (error: unknown) => void;
}

function isPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    TASK_PRIORITIES.includes(value as TaskPriority)
  );
}

function requireText(value: string, field: "title" | "category"): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TaskRepositoryError(
      "invalid_input",
      `${field} must not be empty.`,
    );
  }
  return normalized;
}

function requireDate(value: string): string {
  if (!DATE_PATTERN.test(value)) {
    throw new TaskRepositoryError(
      "invalid_input",
      "dueDate must use the YYYY-MM-DD format.",
    );
  }
  return value;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  if (!TIME_PATTERN.test(value)) {
    throw new TaskRepositoryError(
      "invalid_input",
      "dueTime must use the HH:mm format.",
    );
  }
  return value;
}

function requirePriority(value: TaskPriority): TaskPriority {
  if (!isPriority(value)) {
    throw new TaskRepositoryError(
      "invalid_input",
      "priority must be low, medium, or high.",
    );
  }
  return value;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    priority: row.priority,
    dueDate: row.due_date,
    // PostgreSQL can serialize `time` with seconds; the domain uses HH:mm.
    dueTime: row.due_time ? row.due_time.slice(0, 5) : null,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPayload(input: CreateTaskInput): TaskInsert {
  return {
    title: requireText(input.title, "title"),
    description: input.description?.trim() || null,
    category: requireText(input.category, "category"),
    priority: requirePriority(input.priority),
    due_date: requireDate(input.dueDate),
    due_time: normalizeTime(input.dueTime),
  };
}

function updatePayload(input: UpdateTaskInput): TaskUpdate {
  const payload: TaskUpdate = {};

  if (input.title !== undefined) {
    payload.title = requireText(input.title, "title");
  }
  if (input.description !== undefined) {
    payload.description = input.description.trim() || null;
  }
  if (input.category !== undefined) {
    payload.category = requireText(input.category, "category");
  }
  if (input.priority !== undefined) {
    payload.priority = requirePriority(input.priority);
  }
  if (input.dueDate !== undefined) {
    payload.due_date = requireDate(input.dueDate);
  }
  if (input.dueTime !== undefined) {
    payload.due_time = normalizeTime(input.dueTime);
  }
  if (input.completed !== undefined) {
    payload.completed = input.completed;
  }

  return payload;
}

function isConstraintError(code: string | undefined): boolean {
  return code === "22P02" || code === "23502" || code === "23514";
}

function throwDataError(
  action: string,
  error: { code?: string; message: string },
): never {
  if (isConstraintError(error.code)) {
    throw new TaskRepositoryError("invalid_input", error.message, {
      cause: error,
    });
  }

  throw new Error(`Unable to ${action}: ${error.message}`, { cause: error });
}

/**
 * Supabase implementation of the UI-facing repository contract.
 * Construct it only after Auth has returned a verified user; RLS remains the
 * authoritative ownership check for every query and mutation.
 */
export class SupabaseTaskRepository implements TaskRepository {
  private readonly client: TaskFlowSupabaseClient;
  private readonly onRealtimeError: (error: unknown) => void;

  constructor(
    private readonly userId: string,
    options: SupabaseTaskRepositoryOptions = {},
  ) {
    if (!userId.trim()) {
      throw new Error("A verified Supabase user id is required.");
    }

    this.client = options.client ?? createSupabaseBrowserClient();
    this.onRealtimeError = options.onRealtimeError ?? (() => undefined);
  }

  async getTasks(): Promise<Task[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      throwDataError("load tasks", error);
    }

    return data.map(toTask);
  }

  async getTask(id: string): Promise<Task | null> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwDataError("load the task", error);
    }

    return data ? toTask(data) : null;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const { data, error } = await this.client
      .from("tasks")
      .insert(createPayload(input))
      .select("*")
      .single();

    if (error) {
      throwDataError("create the task", error);
    }

    return toTask(data);
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const payload = updatePayload(input);

    if (Object.keys(payload).length === 0) {
      const existing = await this.getTask(id);
      if (!existing) {
        throw new TaskRepositoryError(
          "not_found",
          `Task with id "${id}" was not found.`,
        );
      }
      return existing;
    }

    const { data, error } = await this.client
      .from("tasks")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throwDataError("update the task", error);
    }
    if (!data) {
      throw new TaskRepositoryError(
        "not_found",
        `Task with id "${id}" was not found.`,
      );
    }

    return toTask(data);
  }

  async deleteTask(id: string): Promise<void> {
    const { data, error } = await this.client
      .from("tasks")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      throwDataError("delete the task", error);
    }
    if (data.length === 0) {
      throw new TaskRepositoryError(
        "not_found",
        `Task with id "${id}" was not found.`,
      );
    }
  }

  subscribe(listener: TaskRepositoryListener): Unsubscribe {
    let disposed = false;
    let cleanedUp = false;

    const channel = this.client
      .channel(`${TASK_TOPIC_PREFIX}${this.userId}`, {
        config: { private: true },
      })
      .on("broadcast", { event: "INSERT" }, () =>
        this.refresh(listener, () => disposed),
      )
      .on("broadcast", { event: "UPDATE" }, () =>
        this.refresh(listener, () => disposed),
      )
      .on("broadcast", { event: "DELETE" }, () =>
        this.refresh(listener, () => disposed),
      );

    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      void this.client.removeChannel(channel);
    };

    void this.client.realtime
      .setAuth()
      .then(() => {
        if (disposed) {
          cleanup();
          return;
        }

        channel.subscribe((status, error) => {
          if (
            !disposed &&
            (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          ) {
            this.onRealtimeError(
              error ?? new Error(`Supabase realtime subscription ${status}.`),
            );
          }
        });
      })
      .catch((error: unknown) => {
        if (!disposed) {
          this.onRealtimeError(error);
        }
        cleanup();
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }

  private refresh(
    listener: TaskRepositoryListener,
    isDisposed: () => boolean,
  ): void {
    if (isDisposed()) {
      return;
    }

    void this.getTasks()
      .then((tasks) => {
        if (!isDisposed()) {
          listener(tasks);
        }
      })
      .catch(this.onRealtimeError);
  }
}

/** Build a user-scoped repository only after Supabase has verified the session. */
export async function createAuthenticatedSupabaseTaskRepository(
  options: SupabaseTaskRepositoryOptions = {},
): Promise<SupabaseTaskRepository> {
  const client = options.client ?? createSupabaseBrowserClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw new Error(`Unable to verify the Supabase user: ${error.message}`, {
      cause: error,
    });
  }
  if (!data.user) {
    throw new Error("An authenticated Supabase user is required.");
  }

  return new SupabaseTaskRepository(data.user.id, { ...options, client });
}
