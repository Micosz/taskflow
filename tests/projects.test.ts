import { describe, expect, it } from "vitest";
import { getProjects, getProjectLinks } from "@/features/projects/project-selectors";
import { createGraphPoints, stepGraph } from "@/features/projects/graph-physics";
import type { Task } from "@/types/task";
const stamp = "2026-10-17T00:00:00Z";
const course = { id: "course-1", code: "CS361", name: "Cloud", createdAt: stamp, updatedAt: stamp };
function task(id: string, date: string, category = "CS361 — Cloud", extra: Partial<Task> = {}): Task {
  return { id, title: id, category, description: "", dueDate: date, dueTime: null, completed: false, createdAt: stamp, updatedAt: stamp, ...extra };
}

describe("project grouping and chronological connections", () => {
  it("shows saved courses even with no tasks and discovers existing custom categories", () => {
    const projects = getProjects([course], [task("a", "2026-10-20", "Personal")]);
    expect(projects).toHaveLength(2);
    expect(projects.find((p) => p.name === "CS361 — Cloud")?.tasks).toEqual([]);
    expect(projects.find((p) => p.name === "Personal")?.tasks[0].id).toBe("a");
  });
  it("matches category case and whitespace without duplicating a project", () => {
    expect(getProjects([course], [task("a", "2026-10-20", " cs361  — cloud ")])).toHaveLength(1);
  });
  it("keeps completed milestones in due-date order and isolates other projects", () => {
    const tasks = [task("v2", "2026-10-24"), task("other", "2026-10-18", "Other"), task("v1", "2026-10-17", undefined, { completed: true }), task("review", "2026-10-24", undefined, { dueTime: "09:00" })];
    const originalIds = tasks.map((t) => t.id);
    const project = getProjects([course], tasks).find((p) => p.name === "CS361 — Cloud")!;
    expect(project.tasks.map((t) => t.id)).toEqual(["v1", "review", "v2"]);
    expect(getProjectLinks(project.tasks)).toEqual([["v1", "review"], ["review", "v2"]]);
    expect(tasks.map((t) => t.id)).toEqual(originalIds);
    expect(getProjectLinks(getProjects([course], tasks.map((t) => t.id === "v2" ? { ...t, dueDate: "2026-10-16" } : t))[0].tasks)[0]).toEqual(["v2", "v1"]);
  });
  it("preserves history after course rename or deletion, with no lost tasks", () => {
    const tasks = [task("old", "2026-10-20")];
    expect(getProjects([{ ...course, name: "New name" }], tasks)).toHaveLength(2);
    expect(getProjects([], tasks)[0].tasks).toEqual(tasks);
  });
  it("handles empty and single-task projects without self-links", () => {
    expect(getProjectLinks([])).toEqual([]);
    expect(getProjectLinks([task("a", "2026-10-20")])).toEqual([]);
  });
});

describe("graph physics", () => {
  it("keeps a dragged point fixed while neighbors respond, then settles", () => {
    const points = createGraphPoints(["a", "b", "c"]);
    const links: [string, string][] = [["a", "b"], ["b", "c"]];
    points[0].x = 100;
    const before = points[1].x;
    for (let i = 0; i < 20; i++) stepGraph(points, links, "a");
    expect(points[0].x).toBe(100);
    expect(points[1].x).not.toBe(before);
    let energy = 0;
    for (let i = 0; i < 1500; i++) energy = stepGraph(points, links, null);
    expect(energy).toBeLessThan(.02);
    for (const point of points) expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
  });
  it("separates coincident nodes without NaN", () => {
    const points = createGraphPoints(["a", "b"]);
    points[1].x = points[0].x; points[1].y = points[0].y;
    stepGraph(points, [], null);
    expect(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(points[0].x).not.toBe(points[1].x);
  });
});
