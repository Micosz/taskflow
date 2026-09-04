import type { TaskDate, TaskTime } from "@/types/task";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_KEY_PATTERN = /^(\d{2}):(\d{2})$/;

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type CountdownUrgency =
  | "normal"
  | "soon"
  | "near"
  | "urgent"
  | "overdue";

export type TaskCountdownState =
  | { status: "completed" }
  | {
      status: "future" | "overdue";
      deadline: Date;
      totalMilliseconds: number;
      parts: CountdownParts;
      urgency: CountdownUrgency;
    };

interface DeadlineInput {
  dueDate?: TaskDate | null;
  dueTime?: TaskTime;
}

interface CountdownTaskInput extends DeadlineInput {
  completed: boolean;
}

function isExactLocalDate(
  date: Date,
  year: number,
  monthIndex: number,
  day: number,
): boolean {
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  );
}

/** Builds a deadline from local calendar fields without parsing a date-only UTC value. */
export function getTaskDeadline(task: DeadlineInput): Date | null {
  if (!task.dueDate) return null;

  const dateMatch = DATE_KEY_PATTERN.exec(task.dueDate);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const monthIndex = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);

  if (task.dueTime) {
    const timeMatch = TIME_KEY_PATTERN.exec(task.dueTime);
    if (!timeMatch) return null;

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours > 23 || minutes > 59) return null;

    const deadline = new Date(year, monthIndex, day, hours, minutes, 0, 0);
    return isExactLocalDate(deadline, year, monthIndex, day) ? deadline : null;
  }

  const deadline = new Date(year, monthIndex, day, 23, 59, 59, 0);
  return isExactLocalDate(deadline, year, monthIndex, day) ? deadline : null;
}

export function getCountdownParts(
  durationMilliseconds: number,
  rounding: "floor" | "ceil" = "floor",
): CountdownParts {
  const safeDuration = Number.isFinite(durationMilliseconds)
    ? Math.max(0, Math.abs(durationMilliseconds))
    : 0;
  const totalSeconds = Math[rounding](safeDuration / 1_000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function getCountdownUrgency(
  status: "future" | "overdue",
  totalMilliseconds: number,
): CountdownUrgency {
  if (status === "overdue") return "overdue";
  if (totalMilliseconds <= 3 * 60 * 60 * 1_000) return "urgent";
  if (totalMilliseconds <= 24 * 60 * 60 * 1_000) return "near";
  if (totalMilliseconds <= 3 * 24 * 60 * 60 * 1_000) return "soon";
  return "normal";
}

export function getTaskCountdown(
  task: CountdownTaskInput,
  now: Date | number,
): TaskCountdownState | null {
  if (task.completed) return { status: "completed" };

  const deadline = getTaskDeadline(task);
  return getCountdownFromDeadline(deadline, now);
}

export function getCountdownFromDeadline(
  deadline: Date | null,
  now: Date | number,
): TaskCountdownState | null {
  const nowMilliseconds = typeof now === "number" ? now : now.getTime();
  if (!deadline || !Number.isFinite(nowMilliseconds)) return null;

  const difference = deadline.getTime() - nowMilliseconds;
  const status = difference < 0 ? "overdue" : "future";
  const totalMilliseconds = Math.abs(difference);

  return {
    status,
    deadline,
    totalMilliseconds,
    parts: getCountdownParts(
      totalMilliseconds,
      status === "future" ? "ceil" : "floor",
    ),
    urgency: getCountdownUrgency(status, totalMilliseconds),
  };
}

export function formatCountdown(
  parts: CountdownParts,
  units: { days: string; hours: string; minutes: string; seconds: string },
): string {
  const dayValue = parts.days === 0 ? "00" : String(parts.days);
  const hourValue = String(parts.hours).padStart(2, "0");
  const minuteValue = String(parts.minutes).padStart(2, "0");
  const secondValue = String(parts.seconds).padStart(2, "0");

  return `${dayValue}${units.days} ${hourValue}${units.hours} ${minuteValue}${units.minutes} ${secondValue}${units.seconds}`;
}
