import { describe, expect, it } from "vitest";

import {
  formatCountdown,
  getTaskCountdown,
  getTaskDeadline,
} from "@/features/tasks/task-countdown";

const ENGLISH_UNITS = { days: "d", hours: "h", minutes: "m", seconds: "s" };

function countdownAt(
  dueDate: string | null,
  dueTime: string | null,
  now: Date,
  completed = false,
) {
  return getTaskCountdown({ dueDate, dueTime, completed }, now);
}

describe("task countdown", () => {
  it("calculates future days, hours, minutes, and seconds", () => {
    const result = countdownAt(
      "2026-09-06",
      "16:18",
      new Date(2026, 8, 4, 12, 0, 28),
    );

    expect(result?.status).toBe("future");
    if (!result || result.status === "completed") throw new Error("Missing countdown");
    expect(result.parts).toEqual({ days: 2, hours: 4, minutes: 17, seconds: 32 });
    expect(formatCountdown(result.parts, ENGLISH_UNITS)).toBe("2d 04h 17m 32s");
  });

  it("formats less than one minute with zero-filled parts", () => {
    const result = countdownAt(
      "2026-09-04",
      "12:01",
      new Date(2026, 8, 4, 12, 0, 30),
    );

    if (!result || result.status === "completed") throw new Error("Missing countdown");
    expect(formatCountdown(result.parts, ENGLISH_UNITS)).toBe("00d 00h 00m 30s");
  });

  it.each([
    [
      "minute",
      new Date(2026, 8, 4, 11, 59, 0),
      "00d 00h 01m 00s",
      new Date(2026, 8, 4, 11, 59, 1),
      "00d 00h 00m 59s",
    ],
    [
      "hour",
      new Date(2026, 8, 4, 11, 0, 0),
      "00d 01h 00m 00s",
      new Date(2026, 8, 4, 11, 0, 1),
      "00d 00h 59m 59s",
    ],
    [
      "day",
      new Date(2026, 8, 3, 12, 0, 0),
      "1d 00h 00m 00s",
      new Date(2026, 8, 3, 12, 0, 1),
      "00d 23h 59m 59s",
    ],
  ])(
    "transitions across the %s boundary",
    (_name, before, expectedBefore, after, expectedAfter) => {
      const beforeResult = countdownAt("2026-09-04", "12:00", before);
      const afterResult = countdownAt("2026-09-04", "12:00", after);
      if (!beforeResult || beforeResult.status === "completed") {
        throw new Error("Missing countdown before boundary");
      }
      if (!afterResult || afterResult.status === "completed") {
        throw new Error("Missing countdown after boundary");
      }

      expect(formatCountdown(beforeResult.parts, ENGLISH_UNITS)).toBe(expectedBefore);
      expect(formatCountdown(afterResult.parts, ENGLISH_UNITS)).toBe(expectedAfter);
    },
  );

  it("returns zero at the exact deadline without negative values", () => {
    const deadline = new Date(2026, 8, 4, 12, 0, 0);
    const result = countdownAt("2026-09-04", "12:00", deadline);

    expect(result?.status).toBe("future");
    if (!result || result.status === "completed") throw new Error("Missing countdown");
    expect(result.parts).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("calculates an overdue duration", () => {
    const result = countdownAt(
      "2026-09-04",
      "10:00",
      new Date(2026, 8, 4, 12, 14, 8),
    );

    expect(result?.status).toBe("overdue");
    if (!result || result.status === "completed") throw new Error("Missing countdown");
    expect(formatCountdown(result.parts, ENGLISH_UNITS)).toBe("00d 02h 14m 08s");
  });

  it("treats a date without a time as 23:59:59 local time", () => {
    const deadline = getTaskDeadline({ dueDate: "2026-09-06", dueTime: null });

    expect(deadline).not.toBeNull();
    expect(deadline?.getFullYear()).toBe(2026);
    expect(deadline?.getMonth()).toBe(8);
    expect(deadline?.getDate()).toBe(6);
    expect(deadline?.getHours()).toBe(23);
    expect(deadline?.getMinutes()).toBe(59);
    expect(deadline?.getSeconds()).toBe(59);
  });

  it("does not expose an active countdown for a completed task", () => {
    expect(
      countdownAt("2026-09-04", "12:00", new Date(2026, 8, 4, 11), true),
    ).toEqual({ status: "completed" });
  });

  it("does not produce a countdown without a due date", () => {
    expect(countdownAt(null, null, new Date(2026, 8, 4, 11))).toBeNull();
  });

  it("constructs YYYY-MM-DD as the same local calendar day", () => {
    const deadline = getTaskDeadline({ dueDate: "2026-01-02", dueTime: "00:15" });

    expect(deadline?.getFullYear()).toBe(2026);
    expect(deadline?.getMonth()).toBe(0);
    expect(deadline?.getDate()).toBe(2);
    expect(deadline?.getHours()).toBe(0);
    expect(deadline?.getMinutes()).toBe(15);
  });

  it("rejects invalid dates and times instead of producing NaN", () => {
    expect(getTaskDeadline({ dueDate: "2026-02-30", dueTime: null })).toBeNull();
    expect(getTaskDeadline({ dueDate: "2026-09-04", dueTime: "25:00" })).toBeNull();
  });
});
