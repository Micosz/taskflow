import { describe, expect, it } from "vitest";
import { formatDateInput, parseDateInput, normalizeTimeInput } from "@/features/tasks/task-date-input";
import { validateTaskForm } from "@/features/tasks/task-validation";
import { formatClockTime } from "@/lib/date";
import { formatTime } from "@/i18n";

describe("day-first date input", () => {
  it("round-trips stored dates without swapping day and month", () => {
    expect(formatDateInput("2026-11-06")).toBe("06/11/2026");
    expect(parseDateInput("06/11/2026")).toBe("2026-11-06");
    expect(parseDateInput("6/1/2027")).toBe("2027-01-06");
    expect(parseDateInput("06112026")).toBe("2026-11-06");
    expect(parseDateInput("29/02/2028")).toBe("2028-02-29");
  });
  it.each(["", "31/04/2026", "29/02/2026", "11/30/2026", "00/11/2026", "06/11/26", "2026-11-06"])("rejects invalid or ambiguous date %s", (value) => {
    expect(parseDateInput(value)).toBeNull();
  });
});

describe("24-hour times", () => {
  it.each([["930", "09:30"], ["2300", "23:00"], ["9:30", "09:30"], ["00:00", "00:00"], ["", ""]])("normalizes %s to %s", (value, expected) => {
    expect(normalizeTimeInput(value)).toBe(expected);
  });
  it.each(["24:00", "12:60", "11 PM", "-1:00"])("rejects invalid time %s", (dueTime) => {
    expect(validateTaskForm({ title: "Task", description: "", category: "Work", dueDate: "2026-11-06", dueTime: normalizeTimeInput(dueTime) })).toHaveProperty("dueTime", "dueTimeInvalid");
  });
  it("uses 00 through 23 in both languages and both time formatters", () => {
    for (const locale of ["en", "th"] as const) {
      for (const time of ["00:00", "09:30", "12:00", "23:59"]) {
        expect(formatTime(time, locale)).toBe(time);
        expect(formatClockTime(time, locale)).toBe(time);
      }
    }
  });
});
