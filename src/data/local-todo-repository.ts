import type { TodoRepository, TodoRepositoryListener } from "@/data/todo-repository";
import { normalizeTodoTitle, sortTodos, type CreateTodoInput, type Todo, type UpdateTodoInput } from "@/types/todo";
export const TODO_STORAGE_KEY = "taskflow:v1:todos";
export class LocalTodoRepository implements TodoRepository {
  private readonly listeners = new Set<TodoRepositoryListener>();
  constructor(private readonly storageOverride?: Storage) {}
  private get storage(): Storage {
    return this.storageOverride ?? window.localStorage;
  }
  private read(): Todo[] {
    const raw = this.storage.getItem(TODO_STORAGE_KEY);
    if (raw === null) return [];
    const data = JSON.parse(raw) as { version: number; todos: unknown };
    if (data.version !== 1 || !Array.isArray(data.todos) || !data.todos.every((item: Todo) =>
      item && typeof item.id === "string" && typeof item.title === "string" &&
      item.title.trim().length > 0 && item.title.length <= 240 && typeof item.completed === "boolean" &&
      typeof item.createdAt === "string" && typeof item.updatedAt === "string")) throw new Error("Invalid stored Todo data");
    return data.todos.map(({ id, title, completed, createdAt, updatedAt }: Todo) => ({ id, title, completed, createdAt, updatedAt }));
  }
  private write(todos: Todo[]) {
    // Report persistence errors rather than pretending a volatile write was saved.
    this.storage.setItem(TODO_STORAGE_KEY, JSON.stringify({ version: 1, todos }));
    const snapshot = sortTodos(todos);
    this.listeners.forEach((listener) => listener(snapshot.map((item) => ({ ...item }))));
  }
  async getTodos() { return sortTodos(this.read()); }
  async createTodo(input: CreateTodoInput) {
    const now = new Date().toISOString();
    const item: Todo = { id: crypto.randomUUID(), title: normalizeTodoTitle(input.title), completed: false, createdAt: now, updatedAt: now };
    this.write([item, ...this.read()]);
    return { ...item };
  }
  async updateTodo(id: string, input: UpdateTodoInput) {
    const todos = this.read();
    const current = todos.find((item) => item.id === id);
    if (!current) throw new Error("Todo not found");
    if (input.completed !== undefined && typeof input.completed !== "boolean") throw new Error("Invalid completion state");
    const updated = { ...current, title: input.title === undefined ? current.title : normalizeTodoTitle(input.title), completed: input.completed ?? current.completed, updatedAt: new Date().toISOString() };
    this.write(todos.map((item) => item.id === id ? updated : item));
    return updated;
  }
  async deleteTodo(id: string) {
    const todos = this.read();
    if (!todos.some((item) => item.id === id)) throw new Error("Todo not found");
    this.write(todos.filter((item) => item.id !== id));
  }
  async removeImported(snapshot: readonly Todo[]) {
    // Preserve new entries and edits made in another tab during import.
    const imported = new Map(snapshot.map((item) => [item.id, item]));
    this.write(this.read().filter((item) => {
      const source = imported.get(item.id);
      return !source || source.title !== item.title || source.completed !== item.completed || source.updatedAt !== item.updatedAt;
    }));
  }
  private readonly onStorage = (event: StorageEvent) => {
    if (event.key !== TODO_STORAGE_KEY && event.key !== null) return;
    try { const items = sortTodos(this.read()); this.listeners.forEach((listener) => listener(items)); } catch { /* A corrupt external write is never allowed to overwrite the current data. */ }
  };
  subscribe(listener: TodoRepositoryListener) {
    this.listeners.add(listener);
    if (typeof window !== "undefined" && this.listeners.size === 1) window.addEventListener("storage", this.onStorage);
    return () => {
      this.listeners.delete(listener);
      if (typeof window !== "undefined" && this.listeners.size === 0) window.removeEventListener("storage", this.onStorage);
    };
  }
}
export const localTodoRepository = new LocalTodoRepository();
