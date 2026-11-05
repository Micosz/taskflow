import { describe, expect, it, vi } from "vitest";
import { SupabaseTaskRepository } from "@/data/supabase-task-repository";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";
import type { TaskInsert, TaskRow, TaskUpdate } from "@/lib/supabase/database.types";

function mockCloud() {
  let row: TaskRow = {
    id: "cloud-task", user_id: "user", title: "Exam", description: null,
    category: "CS301", event_type: "exam", due_date: "2026-11-10", due_time: "09:00:00",
    priority: "medium", completed: false, migration_key: null,
    created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
  };
  const query = {
    insert: vi.fn((input: TaskInsert) => { row = { ...row, ...input }; return query; }),
    update: vi.fn((input: TaskUpdate) => { row = { ...row, ...input }; return query; }),
    upsert: vi.fn(async (inputs: TaskInsert[]) => { row = { ...row, ...inputs[0] }; return { error: null }; }),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(async () => ({ data: [row], error: null })),
    single: vi.fn(async () => ({ data: row, error: null })),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
  };
  const client = { from: vi.fn(() => query) } as unknown as TaskFlowSupabaseClient;
  return { repository: new SupabaseTaskRepository("user", { client }), query };
}

describe("cloud event type persistence", () => {
  it("sends and reads event types while leaving course and deadline fields intact", async () => {
    const { repository, query } = mockCloud();
    const created = await repository.createTask({ title: "Exam", category: "CS301", dueDate: "2026-11-10", dueTime: "09:00", eventType: "exam" });
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "exam", category: "CS301" }));
    expect(created).toMatchObject({ eventType: "exam", dueTime: "09:00" });
    expect(await repository.updateTask(created.id, { eventType: "activity" })).toMatchObject({ eventType: "activity", category: "CS301" });
    expect(query.update).toHaveBeenCalledWith({ event_type: "activity" });
    await repository.updateTask(created.id, { completed: true });
    expect(query.update).toHaveBeenLastCalledWith({ completed: true });
    expect((await repository.getTask(created.id))?.eventType).toBe("activity");
  });

  it("includes the type during guest import and defaults historical records to task", async () => {
    const { repository, query } = mockCloud();
    const task = await repository.createTask({ title: "Day off", category: "Personal", dueDate: "2026-11-10", eventType: "holiday" });
    expect((await repository.importTasks([task]))[0].eventType).toBe("holiday");
    expect(query.upsert).toHaveBeenLastCalledWith([expect.objectContaining({ event_type: "holiday", migration_key: `local-v1:${task.id}` })], expect.any(Object));
    const { eventType: _type, ...legacy } = task;
    void _type;
    expect((await repository.importTasks([legacy]))[0].eventType).toBe("task");
  });
});
