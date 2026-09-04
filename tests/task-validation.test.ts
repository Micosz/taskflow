import { describe, expect, it } from "vitest";

import {
  toCreateTaskInput,
  validateTaskForm,
  type TaskFormValues,
} from "@/features/tasks/task-validation";

const validValues: TaskFormValues = {
  title: "Write report",
  description: "Include the final figures",
  category: "Research",
  dueDate: "2026-09-08",
  dueTime: "16:00",
};

describe("priority-free task validation", () => {
  it("creates valid task input without requiring or emitting priority", () => {
    expect(validateTaskForm(validValues)).toEqual({});
    expect(toCreateTaskInput(validValues)).toEqual(validValues);
    expect(toCreateTaskInput(validValues)).not.toHaveProperty("priority");
  });
});
