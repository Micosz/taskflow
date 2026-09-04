import { describe, expect, it } from "vitest";

import {
  getTaskViewCounts,
  selectTasks,
} from "@/features/tasks/task-selectors";
import { DEFAULT_TASK_VIEW, type Task } from "@/types/task";

const NOW = new Date(2026, 8, 3, 12);

function createTask(overrides: Partial<Task> & Pick<Task, "id">): Task {
  const { id, ...taskOverrides } = overrides;

  return {
    id,
    title: "Test task",
    description: "Task notes",
    category: "CS263",
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
  it("defaults to the complete unfinished workload", () => {
    expect(DEFAULT_TASK_VIEW).toBe("active");
    expect(selectTasks(tasks, DEFAULT_TASK_VIEW, "", NOW).map(({ id }) => id))
      .toEqual(["overdue", "today", "upcoming"]);
  });

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

  it("uses the active view for all and only unfinished tasks", () => {
    const result = selectTasks(tasks, "active", "", NOW);

    expect(result.map((task) => task.id)).toEqual([
      "overdue",
      "today",
      "upcoming",
    ]);
    expect(result.every((task) => !task.completed)).toBe(true);
  });

  it("sorts unfinished tasks by nearest deadline without using legacy priority", () => {
    const sameDayTasks = [
      {
        ...createTask({
          id: "old-high",
          dueTime: "10:00",
          createdAt: "2026-09-01T08:00:00.000Z",
        }),
        priority: "high",
      },
      {
        ...createTask({
          id: "new-low",
          dueTime: "10:00",
          createdAt: "2026-09-02T08:00:00.000Z",
        }),
        priority: "low",
      },
    ];

    expect(selectTasks(sameDayTasks, "active", "", NOW).map(({ id }) => id))
      .toEqual(["new-low", "old-high"]);
  });

  it("reports view counts without counting completed tasks as due", () => {
    expect(getTaskViewCounts(tasks, NOW)).toEqual({
      today: 1,
      upcoming: 1,
      overdue: 1,
      completed: 2,
      active: 3,
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

  it("does not search legacy priority values", () => {
    const legacyTask = { ...createTask({ id: "legacy" }), priority: "high" };
    expect(selectTasks([legacyTask], "active", "high", NOW)).toEqual([]);
  });
});
