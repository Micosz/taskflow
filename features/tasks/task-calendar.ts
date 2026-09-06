import { fromDateKey, getDayDifference, isValidDateKey, toDateKey } from "@/lib/date";
import type { Task } from "@/types/task";
import { getTaskDeadline } from "./task-countdown";
import { sortTasks } from "./task-selectors";

/** A complete Monday-first month, including adjacent days to fill each week. */
export function getCalendarDays(monthKey: string): string[] {
  const first = fromDateKey(`${monthKey.slice(0, 7)}-01`);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const count = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first);
    day.setDate(1 - offset + index);
    return toDateKey(day);
  });
}

export function groupCalendarTasks(tasks: readonly Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of sortTasks(tasks)) {
    if (!isValidDateKey(task.dueDate)) continue;
    const group = groups.get(task.dueDate) ?? [];
    group.push(task);
    groups.set(task.dueDate, group);
  }
  return groups;
}

export function getCalendarTaskTiming(task: Task, now: Date) {
  const days = getDayDifference(task.dueDate, now);
  const deadline = getTaskDeadline(task);
  const status = task.completed ? "completed"
    : deadline && deadline.getTime() < now.getTime() ? "overdue"
    : days === 0 ? "today" : "future";
  return { days, status };
}

export function getNextCalendarTask(tasks: readonly Task[], now: Date): Task | null {
  return sortTasks(tasks.filter((task) => {
    const deadline = getTaskDeadline(task);
    return !task.completed && deadline !== null && deadline.getTime() >= now.getTime();
  }))[0] ?? null;
}
