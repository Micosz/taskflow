import { describe, expect, it } from "vitest";

import {
  getTaskViewCounts,
  selectTasks,
} from "@/features/tasks/task-selectors";
import type { Task } from "@/types/task";

const NOW = new Date(2026, 8, 3, 12);

function createTask(overrides: Partial<Task> & Pick<Task, "id">): Task {
  const { id, ...taskOverrides } = overrides;

  return {
    id,
    title: "Test task",
    description: "Task notes",
    category: "CS263",
    priority: "medium",
    dueDate: "2026-09-03",
    dueTime: null,
    completed: false,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...taskOverrides,
  };
}

const tasks: Task[] = [
  createTask({ id: "today", title: "Today task" }),
  createTask({ id: "upcoming", dueDate: "2026-09-04" }),
  createTask({ id: "overdue", dueDate: "2026-09-02" }),
  createTask({
    id: "completed-today",
    completed: true,
    updatedAt: "2026-09-03T09:00:00.000Z",
  }),
  createTask({
    id: "completed-past",
    completed: true,
    dueDate: "2026-08-30",
    updatedAt: "2026-09-02T09:00:00.000Z",
  }),
];

describe("task view filters", () => {
  it.each([
    ["today", ["today"]],
    ["upcoming", ["upcoming"]],
    ["overdue", ["overdue"]],
    ["completed", ["completed-today", "completed-past"]],
  ] as const)("selects the %s view", (view, expectedIds) => {
    expect(selectTasks(tasks, view, "", NOW).map((task) => task.id)).toEqual(
      expectedIds,
    );
  });

  it("keeps every task in the all view and sorts completed tasks last", () => {
    const result = selectTasks(tasks, "all", "", NOW);

    expect(result).toHaveLength(tasks.length);
    expect(result.slice(-2).map((task) => task.id)).toEqual([
      "completed-today",
      "completed-past",
    ]);
  });

  it("reports view counts without counting completed tasks as due", () => {
    expect(getTaskViewCounts(tasks, NOW)).toEqual({
      today: 1,
      upcoming: 1,
      overdue: 1,
      completed: 2,
      all: 5,
    });
  });

  it("searches task titles, notes, and categories inside the active view", () => {
    const searchable = [
      ...tasks,
      createTask({
        id: "searchable",
        title: "Cloud review",
        description: "Architecture notes",
        category: "CS361",
      }),
    ];

    expect(selectTasks(searchable, "today", "architecture", NOW)).toHaveLength(
      1,
    );
    expect(selectTasks(searchable, "today", "cs361", NOW)[0]?.id).toBe(
      "searchable",
    );
  });
});
