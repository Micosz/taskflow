import { describe, expect, it } from "vitest";
import { getCalendarDays, getCalendarTaskTiming, getNextCalendarTask, groupCalendarTasks } from "@/features/tasks/task-calendar";
import { getDayDifference } from "@/lib/date";
import type { Task } from "@/types/task";

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "event", title: "Event", description: "Existing notes", category: "General",
  dueDate: "2026-09-06", dueTime: null, completed: false,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...overrides,
});
const now = new Date(2026, 8, 6, 12);

describe("calendar dates", () => {
  it("fills a six-week month and crosses the year boundary", () => {
    const days = getCalendarDays("2027-01");
    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2026-12-28");
    expect(days.at(-1)).toBe("2027-01-31");
    expect(getCalendarDays("2026-03")).toHaveLength(42);
  });
  it("includes leap day and never invents dates in February", () => {
    expect(getCalendarDays("2028-02")).toContain("2028-02-29");
    expect(getCalendarDays("2026-02")).not.toContain("2026-02-29");
  });
  it("counts calendar days across midnight and year boundaries", () => {
    expect(getDayDifference("2027-01-01", new Date(2026, 11, 31, 23, 59))).toBe(1);
    expect(getDayDifference("2026-03-09", new Date(2026, 2, 7, 12))).toBe(2);
    expect(getCalendarTaskTiming(task({ dueDate: "2026-09-08" }), now)).toEqual({ days: 2, status: "future" });
  });
});

describe("calendar events", () => {
  it("retains existing notes and completed events, sorting each day by time", () => {
    const events = [task({ id: "all-day" }), task({ id: "morning", dueTime: "09:00" }), task({ id: "done", completed: true }), task({ id: "invalid", dueDate: "2026-02-30" })];
    const grouped = groupCalendarTasks(events);
    expect(grouped.get("2026-09-06")?.map(({ id }) => id)).toEqual(["morning", "all-day", "done"]);
    expect(grouped.get("2026-09-06")?.[0].description).toBe("Existing notes");
    expect(grouped.has("2026-02-30")).toBe(false);
    expect(events[0].id).toBe("all-day");
  });
  it("distinguishes completed, overdue today, all-day today, and overdue dates", () => {
    expect(getCalendarTaskTiming(task({ completed: true }), now).status).toBe("completed");
    expect(getCalendarTaskTiming(task({ dueTime: "09:00" }), now).status).toBe("overdue");
    expect(getCalendarTaskTiming(task(), now).status).toBe("today");
    expect(getCalendarTaskTiming(task({ dueDate: "2026-09-04" }), now)).toEqual({ days: -2, status: "overdue" });
  });
  it("finds the next unfinished event across months and excludes elapsed deadlines", () => {
    const next = task({ id: "next", dueDate: "2026-10-01" });
    expect(getNextCalendarTask([task({ dueTime: "09:00" }), task({ completed: true }), next], now)).toBe(next);
    expect(getNextCalendarTask([], now)).toBeNull();
    expect(getNextCalendarTask([task({ completed: true })], now)).toBeNull();
  });
});
