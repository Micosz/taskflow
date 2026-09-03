import { toDateKey } from "@/lib/date";
import type { Task, TaskPriority, TaskView } from "@/types/task";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface TaskStats {
  total: number;
  active: number;
  completed: number;
  dueToday: number;
  completedToday: number;
  overdue: number;
  highPriority: number;
  completionRate: number;
  focusRate: number;
}

export function isTaskInView(task: Task, view: TaskView, todayKey: string): boolean {
  switch (view) {
    case "today":
      return !task.completed && task.dueDate === todayKey;
    case "upcoming":
      return !task.completed && task.dueDate > todayKey;
    case "overdue":
      return !task.completed && task.dueDate < todayKey;
    case "completed":
      return task.completed;
    case "all":
      return true;
  }
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    if (left.completed && right.completed) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    const dateDifference = left.dueDate.localeCompare(right.dueDate);
    if (dateDifference !== 0) return dateDifference;

    const leftTime = left.dueTime ?? "99:99";
    const rightTime = right.dueTime ?? "99:99";
    const timeDifference = leftTime.localeCompare(rightTime);
    if (timeDifference !== 0) return timeDifference;

    const priorityDifference =
      PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
    if (priorityDifference !== 0) return priorityDifference;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function selectTasks(
  tasks: readonly Task[],
  view: TaskView,
  searchQuery = "",
  now = new Date(),
): Task[] {
  const todayKey = toDateKey(now);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return sortTasks(
    tasks.filter((task) => {
      if (!isTaskInView(task, view, todayKey)) return false;
      if (!normalizedQuery) return true;

      return [task.title, task.description, task.category].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      );
    }),
  );
}

export function getTaskViewCounts(
  tasks: readonly Task[],
  now = new Date(),
): Record<TaskView, number> {
  const todayKey = toDateKey(now);
  return {
    today: tasks.filter((task) => isTaskInView(task, "today", todayKey)).length,
    upcoming: tasks.filter((task) => isTaskInView(task, "upcoming", todayKey)).length,
    overdue: tasks.filter((task) => isTaskInView(task, "overdue", todayKey)).length,
    completed: tasks.filter((task) => task.completed).length,
    all: tasks.length,
  };
}

export function getTaskStats(tasks: readonly Task[], now = new Date()): TaskStats {
  const todayKey = toDateKey(now);
  const completed = tasks.filter((task) => task.completed).length;
  const active = tasks.length - completed;
  const dueTodayTasks = tasks.filter((task) => task.dueDate === todayKey);
  const completedToday = dueTodayTasks.filter((task) => task.completed).length;
  const activeToday = dueTodayTasks.length - completedToday;

  return {
    total: tasks.length,
    active,
    completed,
    dueToday: activeToday,
    completedToday,
    overdue: tasks.filter((task) => !task.completed && task.dueDate < todayKey).length,
    highPriority: tasks.filter((task) => !task.completed && task.priority === "high").length,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    focusRate: dueTodayTasks.length
      ? Math.round((completedToday / dueTodayTasks.length) * 100)
      : 100,
  };
}

export function getNextActiveTask(tasks: readonly Task[]): Task | null {
  return sortTasks(tasks.filter((task) => !task.completed))[0] ?? null;
}
