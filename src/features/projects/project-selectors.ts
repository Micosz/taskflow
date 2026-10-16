import { getCourseDisplayLabel, type Course } from "@/types/course";
import type { Task } from "@/types/task";

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

export function projectKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Membership follows the existing category snapshot; never changes task history. */
export function getProjects(courses: readonly Course[], tasks: readonly Task[]): Project[] {
  const projects = new Map<string, Project>();
  for (const course of courses) {
    const name = getCourseDisplayLabel(course);
    const key = projectKey(name);
    if (!projects.has(key)) projects.set(key, { id: key, name, tasks: [] });
  }
  for (const task of tasks) {
    const key = projectKey(task.category);
    if (!projects.has(key)) projects.set(key, { id: key, name: task.category.trim(), tasks: [] });
    projects.get(key)!.tasks.push(task);
  }
  return [...projects.values()].map((project) => ({
    ...project,
    tasks: [...project.tasks].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") ||
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProjectLinks(tasks: readonly Task[]): [string, string][] {
  return tasks.slice(1).map((task, index) => [tasks[index].id, task.id]);
}
