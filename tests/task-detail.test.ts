import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TaskCard } from "@/components/taskflow/task-card";
import { TaskDetailDialog } from "@/components/taskflow/task-detail-dialog";
import { FocusHero } from "@/components/taskflow/focus-hero";
import {
  createTaskManagerState,
  reduceTaskManagerState,
} from "@/features/tasks/task-manager-state";
import { selectTaskById } from "@/features/tasks/task-selectors";
import { getTranslations } from "@/i18n";
import type { Task } from "@/types/task";

const messages = getTranslations("en");

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Architecture review",
    description: "First paragraph.\n\nSecond paragraph with every detail intact.",
    category: "CS361 — Cloud Architecting",
    dueDate: "2026-09-05",
    dueTime: "14:30",
    completed: false,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-02T09:00:00.000Z",
    ...overrides,
  };
}

function renderDetail(value: Task): string {
  return renderToStaticMarkup(
    createElement(TaskDetailDialog, {
      task: value,
      locale: "en",
      messages,
      onClose: vi.fn(),
      onEdit: vi.fn(),
      onToggle: vi.fn(),
      onDelete: vi.fn(),
    }),
  );
}

describe("task detail experience", () => {
  it("opens with the selected task's complete description and useful metadata", () => {
    const html = renderDetail(task());

    expect(html).toContain("Architecture review");
    expect(html).toContain("First paragraph.\n\nSecond paragraph with every detail intact.");
    expect(html).toContain("CS361 — Cloud Architecting");
    expect(html).toContain("Task details");
    expect(html).not.toContain("Priority");
  });

  it("offers complete and reopen actions for the corresponding state", () => {
    expect(renderDetail(task())).toContain("Mark complete");
    expect(renderDetail(task({ completed: true }))).toContain("Reopen task");
  });

  it("tracks edits and safely resolves deletion from the shared task snapshot", () => {
    let state = createTaskManagerState("local");
    state = reduceTaskManagerState(state, {
      type: "loaded",
      scopeKey: "local",
      tasks: [task()],
    });
    state = reduceTaskManagerState(state, {
      type: "upserted",
      scopeKey: "local",
      task: task({ description: "Updated remotely" }),
    });

    expect(selectTaskById(state.tasks, "task-1")?.description).toBe("Updated remotely");
    expect(renderDetail(selectTaskById(state.tasks, "task-1")!)).toContain("Updated remotely");

    state = reduceTaskManagerState(state, {
      type: "deleted",
      scopeKey: "local",
      taskId: "task-1",
    });
    expect(selectTaskById(state.tasks, "task-1")).toBeNull();
  });

  it("renders card preview selection and explicit controls as independent buttons", () => {
    const html = renderToStaticMarkup(
      createElement(TaskCard, {
        task: task(),
        locale: "en",
        messages,
        selected: true,
        onSelect: vi.fn(),
        onToggle: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(html).toContain("Show “Architecture review” in the focus panel");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Edit task: Architecture review");
    expect(html).toContain("Delete task: Architecture review");
    expect((html.match(/<button/g) ?? [])).toHaveLength(3);
  });

  it("offers the full-detail popup from the focus panel when notes are long", () => {
    const html = renderToStaticMarkup(
      createElement(FocusHero, {
        task: task({ description: "Detailed context. ".repeat(16) }),
        now: new Date("2026-09-05T08:00:00.000Z"),
        locale: "en",
        messages,
        completed: 0,
        total: 1,
        busy: false,
        onOpen: vi.fn(),
        onToggle: vi.fn(),
      }),
    );

    expect(html).toContain("View full details");
    expect(html).toContain("Open task details for");
  });
});
