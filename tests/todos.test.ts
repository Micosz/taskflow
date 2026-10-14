import { describe, expect, it, vi } from "vitest";
import { LocalTodoRepository, TODO_STORAGE_KEY } from "@/data/local-todo-repository";
import { createTodoManagerState, reduceTodoManagerState } from "@/features/todos/todo-manager-state";
import { SupabaseTodoRepository } from "@/data/supabase-todo-repository";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";
import type { Todo } from "@/types/todo";
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(i: number) { return [...this.values.keys()][i] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key,value); }
}
describe("undated Todo", () => {
  it("creates, completes, reopens, edits, restores and deletes without touching scheduled work", async () => {
    const storage = new MemoryStorage(); storage.setItem("taskflow:v1:tasks", "scheduled work");
    const repository = new LocalTodoRepository(storage);
    const created = await repository.createTodo({ title: "  ซื้อสายชาร์จ  " });
    expect(created.title).toBe("ซื้อสายชาร์จ");
    expect(created).not.toHaveProperty("dueDate"); expect(created).not.toHaveProperty("dueTime");
    await repository.updateTodo(created.id, { completed: true });
    expect((await repository.getTodos())[0].completed).toBe(true);
    await repository.updateTodo(created.id, { completed: false, title: "จัดโต๊ะ" });
    expect((await new LocalTodoRepository(storage).getTodos())[0]).toMatchObject({title:"จัดโต๊ะ",completed:false});
    await repository.deleteTodo(created.id);
    expect(await repository.getTodos()).toEqual([]);
    expect(storage.getItem("taskflow:v1:tasks")).toBe("scheduled work");
  });
  it("rejects invalid text and never overwrites corrupt persisted data", async () => {
    const storage = new MemoryStorage(); const repo = new LocalTodoRepository(storage);
    await expect(repo.createTodo({title:" "})).rejects.toThrow();
    await expect(repo.createTodo({title:"a".repeat(241)})).rejects.toThrow();
    storage.setItem(TODO_STORAGE_KEY,"corrupt");
    await expect(repo.createTodo({title:"valid"})).rejects.toThrow();
    expect(storage.getItem(TODO_STORAGE_KEY)).toBe("corrupt");
  });
  it("reports a failed durable write and does not emit false success", async () => {
    const storage = new MemoryStorage(); storage.setItem = () => { throw new Error("quota"); };
    const repo = new LocalTodoRepository(storage); let notified = false;
    const off = repo.subscribe(() => { notified = true; });
    await expect(repo.createTodo({title:"test"})).rejects.toThrow("quota");
    expect(notified).toBe(false);off();
  });
  it("import cleanup retains concurrent changes and entries added during import", async () => {
    const repo = new LocalTodoRepository(new MemoryStorage());
    const unchanged = await repo.createTodo({title:"copied"});
    const edited = await repo.createTodo({title:"old"});
    const snapshot = await repo.getTodos();
    await repo.updateTodo(edited.id,{title:"new"});
    const added = await repo.createTodo({title:"added"});
    await repo.removeImported(snapshot);
    const remaining = await repo.getTodos();
    expect(remaining.map(t=>t.id)).not.toContain(unchanged.id);
    expect(remaining.map(t=>t.id)).toEqual(expect.arrayContaining([edited.id,added.id]));
  });
  it("ignores late loads and mutations from another account", () => {
    const item: Todo = {id:"one",title:"private",completed:false,createdAt:"now",updatedAt:"now"};
    const state = createTodoManagerState("cloud:B");
    expect(reduceTodoManagerState(state,{type:"loaded",scopeKey:"cloud:A",todos:[item]})).toEqual(state);
    expect(reduceTodoManagerState(state,{type:"upserted",scopeKey:"cloud:A",todo:item})).toEqual(state);
    const loaded=reduceTodoManagerState(state,{type:"loaded",scopeKey:"cloud:B",todos:[item]});
    expect(reduceTodoManagerState(loaded,{type:"switch_scope",scopeKey:"local"}).todos).toEqual([]);
  });
});


describe("cloud Todo account boundaries", () => {
  it("keeps the captured owner on writes even after an auth change", async () => {
    const denied = new Error("RLS denied stale owner");
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: null, error: denied }) }) }));
    const client = { from: () => ({ insert }) } as unknown as TaskFlowSupabaseClient;
    const repository = new SupabaseTodoRepository("account-A", client);
    await expect(repository.createTodo({ title: "private reminder" })).rejects.toThrow(denied);
    expect(insert).toHaveBeenCalledWith({ user_id: "account-A", title: "private reminder" });
  });
  it("does not clear a guest import when a prior cloud copy differs", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const eq = vi.fn(() => ({ in: async () => ({ data: [{ migration_key: "local-v1:one", title: "changed in cloud", completed: false }], error: null }) }));
    const client = { from: () => ({ upsert, select: () => ({ eq }) }) } as unknown as TaskFlowSupabaseClient;
    const repository = new SupabaseTodoRepository("account-A", client);
    const todo: Todo = { id: "one", title: "guest version", completed: false, createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z" };
    await expect(repository.importTodos([todo])).rejects.toThrow("could not verify");
    expect(eq).toHaveBeenCalledWith("user_id", "account-A");
    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ user_id: "account-A", migration_key: "local-v1:one" })], { onConflict: "user_id,migration_key", ignoreDuplicates: true });
  });
});
