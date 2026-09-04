import { describe, expect, it } from "vitest";

import {
  createTaskManagerState,
  reduceTaskManagerState,
} from "@/features/tasks/task-manager-state";
import type { Task } from "@/types/task";

function task(id: string): Task {
  return {
    id,
    title: id,
    description: "",
    category: "Test",
    dueDate: "2026-09-04",
    dueTime: null,
    completed: false,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("task manager repository scopes", () => {
  it("clears tasks immediately when users or storage modes change", () => {
    let state = createTaskManagerState("cloud:user-a");
    state = reduceTaskManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      tasks: [task("private-a")],
    });

    state = reduceTaskManagerState(state, {
      type: "switch_scope",
      scopeKey: "local",
    });
    expect(state.tasks).toEqual([]);

    state = reduceTaskManagerState(state, {
      type: "switch_scope",
      scopeKey: "cloud:user-b",
    });
    expect(state.tasks).toEqual([]);
    expect(state.scopeKey).toBe("cloud:user-b");
  });

  it("ignores stale loads from the previous authenticated user", () => {
    let state = createTaskManagerState("cloud:user-b");
    state = reduceTaskManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      tasks: [task("private-a")],
    });

    expect(state.tasks).toEqual([]);
  });

  it("replaces the task snapshot for realtime refreshes without duplicates", () => {
    let state = createTaskManagerState("cloud:user-a");
    state = reduceTaskManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      tasks: [task("one")],
    });
    state = reduceTaskManagerState(state, {
      type: "upserted",
      scopeKey: "cloud:user-a",
      task: task("two"),
    });
    state = reduceTaskManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      tasks: [task("one"), task("two")],
    });

    expect(state.tasks.map(({ id }) => id)).toEqual(["one", "two"]);
  });
});
