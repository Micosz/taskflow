import type { TodoRepository, TodoRepositoryListener } from "@/data/todo-repository";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeTodoTitle, type CreateTodoInput, type Todo, type UpdateTodoInput } from "@/types/todo";
type Row = Database["public"]["Tables"]["todos"]["Row"];
function toTodo(row: Row): Todo {
  return { id: row.id, title: row.title, completed: row.completed, createdAt: row.created_at, updatedAt: row.updated_at };
}
export class SupabaseTodoRepository implements TodoRepository {
  constructor(private readonly userId: string, private readonly client: TaskFlowSupabaseClient) {
    if (!userId) throw new Error("A verified user is required");
  }
  async getTodos(): Promise<Todo[]> {
    const rows: Row[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await this.client.from("todos").select("*").eq("user_id", this.userId)
        .order("completed").order("created_at", { ascending: false }).order("id").range(start, start + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows.map(toTodo);
  }
  async createTodo(input: CreateTodoInput) {
    const { data, error } = await this.client.from("todos").insert({ user_id: this.userId, title: normalizeTodoTitle(input.title) }).select("*").single();
    if (error) throw error;
    return toTodo(data);
  }
  async updateTodo(id: string, input: UpdateTodoInput) {
    const payload: { title?: string; completed?: boolean } = {};
    if (input.title !== undefined) payload.title = normalizeTodoTitle(input.title);
    if (input.completed !== undefined) payload.completed = input.completed;
    const { data, error } = await this.client.from("todos").update(payload).eq("user_id", this.userId).eq("id", id).select("*").single();
    if (error) throw error;
    return toTodo(data);
  }
  async deleteTodo(id: string) {
    const { data, error } = await this.client.from("todos").delete().eq("user_id", this.userId).eq("id", id).select("id");
    if (error) throw error;
    if (data.length !== 1) throw new Error("Todo not found");
  }
  async importTodos(items: readonly Todo[]) {
    // Import in bounded batches and verify unchanged content before clearing the source.
    for (let start = 0; start < items.length; start += 100) {
      const batch = items.slice(start, start + 100);
      const keys = batch.map((item) => `local-v1:${item.id}`);
      const { error } = await this.client.from("todos").upsert(batch.map((item) => ({
        user_id: this.userId, title: normalizeTodoTitle(item.title), completed: item.completed, migration_key: `local-v1:${item.id}`,
        created_at: item.createdAt, updated_at: item.updatedAt,
      })), { onConflict: "user_id,migration_key", ignoreDuplicates: true });
      if (error) throw error;
      const result = await this.client.from("todos").select("*").eq("user_id", this.userId).in("migration_key", keys);
      if (result.error) throw result.error;
      const byKey = new Map(result.data.map((row) => [row.migration_key, row]));
      if (batch.some((item) => { const row = byKey.get(`local-v1:${item.id}`); return !row || row.title !== item.title || row.completed !== item.completed; })) {
        throw new Error("Todo import could not verify all content");
      }
    }
  }
  subscribe(listener: TodoRepositoryListener) {
    let disposed = false;
    const refresh = () => { if (!disposed) void this.getTodos().then((items) => { if (!disposed) listener(items); }).catch(() => {}); };
    const channel = this.client.channel(`taskflow:todos:${this.userId}`, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, refresh).on("broadcast", { event: "UPDATE" }, refresh).on("broadcast", { event: "DELETE" }, refresh);
    void this.client.realtime.setAuth().then(() => { if (!disposed) channel.subscribe((status) => { if (status === "SUBSCRIBED") refresh(); }); }).catch(() => {});
    return () => { disposed = true; void this.client.removeChannel(channel); };
  }
}
