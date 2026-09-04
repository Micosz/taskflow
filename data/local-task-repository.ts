import { createSampleTasks } from "@/data/sample-tasks";
import {
  TaskRepositoryError,
  type ResettableTaskRepository,
  type TaskRepositoryListener,
  type Unsubscribe,
} from "@/data/task-repository";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";

export const TASK_STORAGE_KEY = "taskflow:v1:tasks";

const STORAGE_VERSION = 1;
const LEGACY_TASK_STORAGE_KEYS = ["taskflow.tasks.v1"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface StoredTasks {
  version: typeof STORAGE_VERSION;
  savedAt: string;
  tasks: Task[];
}

export interface LocalTaskRepositoryOptions {
  storage?: Storage | null;
  now?: () => Date;
  createSeedTasks?: (now: Date) => Task[];
}

function cloneTasks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => ({ ...task }));
}

function normalizeStoredTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const task = value as Record<string, unknown>;
  if (
    typeof task.id !== "string" ||
    typeof task.title !== "string" ||
    typeof task.description !== "string" ||
    typeof task.category !== "string" ||
    typeof task.dueDate !== "string" ||
    !DATE_PATTERN.test(task.dueDate) ||
    (task.dueTime !== null &&
      (typeof task.dueTime !== "string" || !TIME_PATTERN.test(task.dueTime))) ||
    typeof task.completed !== "boolean" ||
    typeof task.createdAt !== "string" ||
    typeof task.updatedAt !== "string"
  ) {
    return null;
  }

  // Older local records can contain `priority`. It is deliberately ignored
  // while all durable task fields remain forwards compatible.
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    dueDate: task.dueDate,
    dueTime: task.dueTime as string | null,
    completed: task.completed,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function normalizeStoredTasks(values: unknown[]): Task[] | null {
  const tasks = values.map(normalizeStoredTask);
  return tasks.every((task): task is Task => task !== null) ? tasks : null;
}

function parseStoredTasks(raw: string): Task[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    // Accept the early array-only shape so V1 data remains forwards compatible.
    if (Array.isArray(parsed)) {
      return normalizeStoredTasks(parsed);
    }

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const payload = parsed as Partial<StoredTasks>;
    if (
      payload.version !== STORAGE_VERSION ||
      !Array.isArray(payload.tasks)
    ) {
      return null;
    }

    return normalizeStoredTasks(payload.tasks);
  } catch {
    return null;
  }
}

function createTaskId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

export class LocalTaskRepository implements ResettableTaskRepository {
  private readonly listeners = new Set<TaskRepositoryListener>();
  private readonly now: () => Date;
  private readonly createSeedTasks: (now: Date) => Task[];
  private readonly storageOverride: Storage | null | undefined;
  private volatileTasks: Task[] | null = null;
  private isListeningForStorage = false;

  constructor(options: LocalTaskRepositoryOptions = {}) {
    this.storageOverride = options.storage;
    this.now = options.now ?? (() => new Date());
    this.createSeedTasks = options.createSeedTasks ?? createSampleTasks;
  }

  async getTasks(): Promise<Task[]> {
    return cloneTasks(this.readTasks());
  }

  async getTask(id: string): Promise<Task | null> {
    const task = this.readTasks().find((candidate) => candidate.id === id);
    return task ? { ...task } : null;
  }

  async getMigrationTasks(): Promise<Task[]> {
    const storage = this.getStorage();

    if (storage) {
      try {
        for (const key of [TASK_STORAGE_KEY, ...LEGACY_TASK_STORAGE_KEYS]) {
          const raw = storage.getItem(key);
          if (raw === null) continue;
          const parsed = parseStoredTasks(raw);
          if (parsed) return cloneTasks(parsed);
        }
      } catch {
        // Fall through to the session copy when browser storage is blocked.
      }
    }

    return this.volatileTasks ? cloneTasks(this.volatileTasks) : [];
  }

  async clearMigrationTasks(): Promise<void> {
    const previousTasks = await this.getMigrationTasks();
    const storage = this.getStorage();

    if (!storage) {
      this.volatileTasks = [];
      this.notify([]);
      return;
    }

    if (!this.writeTasks([])) {
      this.volatileTasks = previousTasks;
      throw new TaskRepositoryError(
        "storage_unavailable",
        "Local tasks could not be cleared after cloud migration.",
      );
    }

    this.notify([]);
  }

  async replaceMigrationTasks(tasks: readonly Task[]): Promise<void> {
    if (!this.writeTasks(tasks) && this.getStorage()) {
      throw new TaskRepositoryError(
        "storage_unavailable",
        "Local tasks could not be restored.",
      );
    }
    this.notify(tasks);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const now = this.now().toISOString();
    const task: Task = {
      id: createTaskId(),
      title: requireText(input.title, "title"),
      description: input.description?.trim() ?? "",
      category: requireText(input.category, "category"),
      dueDate: requireDate(input.dueDate),
      dueTime: normalizeTime(input.dueTime),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    const tasks = [task, ...this.readTasks()];
    this.writeTasks(tasks);
    this.notify(tasks);
    return { ...task };
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const tasks = this.readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      throw new TaskRepositoryError(
        "not_found",
        `Task with id "${id}" was not found.`,
      );
    }

    const current = tasks[index];
    const updated: Task = {
      ...current,
      ...(input.title === undefined
        ? {}
        : { title: requireText(input.title, "title") }),
      ...(input.description === undefined
        ? {}
        : { description: input.description.trim() }),
      ...(input.category === undefined
        ? {}
        : { category: requireText(input.category, "category") }),
      ...(input.dueDate === undefined
        ? {}
        : { dueDate: requireDate(input.dueDate) }),
      ...(input.dueTime === undefined
        ? {}
        : { dueTime: normalizeTime(input.dueTime) }),
      ...(input.completed === undefined
        ? {}
        : { completed: input.completed }),
      updatedAt: this.now().toISOString(),
    };

    const nextTasks = [...tasks];
    nextTasks[index] = updated;
    this.writeTasks(nextTasks);
    this.notify(nextTasks);
    return { ...updated };
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = this.readTasks();
    const nextTasks = tasks.filter((task) => task.id !== id);

    if (nextTasks.length === tasks.length) {
      throw new TaskRepositoryError(
        "not_found",
        `Task with id "${id}" was not found.`,
      );
    }

    this.writeTasks(nextTasks);
    this.notify(nextTasks);
  }

  async resetToSampleTasks(): Promise<Task[]> {
    const tasks = this.createSeedTasks(this.now());
    this.writeTasks(tasks);
    this.notify(tasks);
    return cloneTasks(tasks);
  }

  subscribe(listener: TaskRepositoryListener): Unsubscribe {
    this.listeners.add(listener);
    this.startStorageListener();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopStorageListener();
      }
    };
  }

  private getStorage(): Storage | null {
    if (this.storageOverride !== undefined) {
      return this.storageOverride;
    }

    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  }

  private readTasks(): Task[] {
    const storage = this.getStorage();

    if (storage) {
      try {
        const raw = storage.getItem(TASK_STORAGE_KEY);
        if (raw !== null) {
          const parsed = parseStoredTasks(raw);
          if (parsed) {
            this.volatileTasks = parsed;
            return cloneTasks(parsed);
          }
        }

        for (const legacyKey of LEGACY_TASK_STORAGE_KEYS) {
          const legacyRaw = storage.getItem(legacyKey);
          if (legacyRaw === null) continue;

          const parsed = parseStoredTasks(legacyRaw);
          if (!parsed) continue;

          // Keep the legacy entry when persistence is blocked so migration can
          // be retried safely on a later visit.
          if (this.writeTasks(parsed)) {
            storage.removeItem(legacyKey);
          }

          return cloneTasks(parsed);
        }
      } catch {
        // Fall back to the in-memory copy when browser storage is unavailable.
      }
    }

    if (this.volatileTasks) {
      return cloneTasks(this.volatileTasks);
    }

    const seeded = this.createSeedTasks(this.now());
    this.writeTasks(seeded);
    return cloneTasks(seeded);
  }

  private writeTasks(tasks: readonly Task[]): boolean {
    const nextTasks = cloneTasks(tasks);
    this.volatileTasks = nextTasks;

    const storage = this.getStorage();
    if (!storage) {
      return false;
    }

    const payload: StoredTasks = {
      version: STORAGE_VERSION,
      savedAt: this.now().toISOString(),
      tasks: nextTasks,
    };

    try {
      storage.setItem(TASK_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      // CRUD remains usable for this session even when persistence is blocked.
      return false;
    }
  }

  private notify(tasks: readonly Task[]): void {
    const snapshot = cloneTasks(tasks);
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private readonly handleStorage = (event: StorageEvent): void => {
    if (
      event.key !== TASK_STORAGE_KEY &&
      event.key !== null &&
      !LEGACY_TASK_STORAGE_KEYS.includes(
        event.key as (typeof LEGACY_TASK_STORAGE_KEYS)[number],
      )
    ) {
      return;
    }

    // Discard the local cache so another tab's value becomes authoritative.
    this.volatileTasks = null;
    this.notify(this.readTasks());
  };

  private startStorageListener(): void {
    if (this.isListeningForStorage || typeof window === "undefined") {
      return;
    }
    window.addEventListener("storage", this.handleStorage);
    this.isListeningForStorage = true;
  }

  private stopStorageListener(): void {
    if (!this.isListeningForStorage || typeof window === "undefined") {
      return;
    }
    window.removeEventListener("storage", this.handleStorage);
    this.isListeningForStorage = false;
  }
}

export const localTaskRepository = new LocalTaskRepository();
export const taskRepository: ResettableTaskRepository = localTaskRepository;
