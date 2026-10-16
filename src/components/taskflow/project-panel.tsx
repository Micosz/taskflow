"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FolderPlus, Network, Plus } from "lucide-react";
import { getProjects, projectKey } from "@/features/projects/project-selectors";
import { CourseRepositoryError } from "@/data/course-repository";
import type { Course, CreateCourseInput } from "@/types/course";
import type { Task } from "@/types/task";
import { formatDate, formatTaskCount, type Locale, type TranslationMessages } from "@/i18n";
import { TaskCalendar } from "./task-calendar";
import { ProjectGraph } from "./project-graph";

interface Props {
  courses: Course[]; tasks: Task[]; now: Date; locale: Locale; messages: TranslationMessages;
  status: "loading" | "ready" | "error"; courseStatus: "loading" | "ready" | "error";
  selectedId: string | null; onSelect: (id: string) => void;
  onCreate: (input: CreateCourseInput) => Promise<Course>;
  onRetry: () => void; onOpen: (task: Task) => void; onAdd: (category: string) => void;
}

export function ProjectPanel({ courses, tasks, now, locale, messages, status, courseStatus, selectedId, onSelect, onCreate, onRetry, onOpen, onAdd }: Props) {
  const th = locale === "th";
  const projects = useMemo(() => getProjects(courses, tasks), [courses, tasks]);
  const project = projects.find((project) => project.id === selectedId) ?? projects[0];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ready = status === "ready" && courseStatus === "ready";
  async function create(event: FormEvent) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized || saving) return;
    if (projects.some((project) => project.id === projectKey(normalized))) {
      setError(th ? "มีวิชาหรือโปรเจกต์ชื่อนี้แล้ว" : "A course or project with this name already exists."); return;
    }
    setSaving(true); setError("");
    try {
      const course = await onCreate({ name: normalized });
      onSelect(projectKey(course.name));
      setName(""); setCreating(false);
    } catch (cause) {
      setError(cause instanceof CourseRepositoryError && cause.code === "duplicate"
        ? (th ? "มีวิชาหรือโปรเจกต์ชื่อนี้แล้ว" : "A course or project with this name already exists.")
        : messages.toast.errorDescription);
    } finally { setSaving(false); }
  }

  return <section className="project-page" aria-label={th ? "โปรเจกต์" : "Projects"}>
    <div className="project-page__toolbar">
      <div className="project-page__title"><Network size={19} aria-hidden="true" /><h1>{th ? "โปรเจกต์" : "Projects"}</h1></div>
      <label className="project-page__select"><span className="sr-only">{th ? "เลือกโปรเจกต์" : "Select project"}</span>
        <select value={project?.id ?? ""} onChange={(event) => onSelect(event.target.value)} disabled={!projects.length || !ready}>
          {!projects.length && <option value="">{th ? "ยังไม่มีโปรเจกต์" : "No projects yet"}</option>}
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <button type="button" className="project-button" onClick={() => { setCreating(!creating); setError(""); }} disabled={!ready || saving}><FolderPlus size={16} aria-hidden="true" />{th ? "เพิ่มโปรเจกต์" : "New project"}</button>
    </div>
    {creating && <form className="project-create" onSubmit={create}>
      <label htmlFor="project-name">{th ? "ชื่อโปรเจกต์" : "Project name"}</label>
      <div><input id="project-name" autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={saving} placeholder={th ? "เช่น เว็บไซต์ส่วนตัว" : "e.g. Personal website"} aria-describedby={error ? "project-error" : undefined} aria-invalid={!!error} />
        <button className="project-button" disabled={saving || !name.trim()}>{saving ? messages.form.saving : th ? "สร้างโปรเจกต์" : "Create project"}</button>
        <button className="project-button" type="button" disabled={saving} onClick={() => setCreating(false)}>{messages.form.cancel}</button></div>
      <p>{th ? "เลือกชื่อนี้ในช่องวิชา / โปรเจกต์ตอนเพิ่มงานได้เลย" : "Choose this name under Course / project when adding a task."}</p>
      {error && <p id="project-error" role="alert">{error}</p>}
    </form>}
    {!ready ? <div className="project-page__empty" role="status">
      {status === "error" || courseStatus === "error" ? <><p>{messages.toast.errorDescription}</p><button type="button" className="project-button" onClick={onRetry}>{messages.common.retry}</button></> : messages.auth.initializing}
    </div> : !project ? <div className="project-page__empty"><Network size={32} aria-hidden="true" /><h2>{th ? "เริ่มเชื่อมงานของเธอ" : "Connect your work"}</h2><p>{th ? "วิชาที่บันทึกไว้จะแสดงเป็นโปรเจกต์อัตโนมัติ หรือเพิ่มโปรเจกต์ของเธอเองได้เลย" : "Saved courses appear automatically. You can also create a project of your own."}</p><button className="project-button" type="button" onClick={() => setCreating(true)}><Plus size={16} />{th ? "เพิ่มโปรเจกต์" : "New project"}</button></div>
      : <div className="project-workspace">
        <div className="project-workspace__graph">
          <header><div><p>{th ? "ลำดับงานตามวันส่ง" : "CONNECTED BY DUE DATE"}</p><h2>{project.name}</h2></div><span>{formatTaskCount(project.tasks.length, locale)}</span></header>
          <ProjectGraph key={project.id} name={project.name} tasks={project.tasks} locale={locale} onOpen={onOpen} />
          <div className="project-workspace__footer"><span><i />{th ? "ยังไม่เสร็จ" : "Pending"}</span><span><i data-completed />{messages.task.completed}</span><button type="button" className="project-button" onClick={() => onAdd(project.name)}><Plus size={15} />{messages.header.addTask}</button></div>
          {!project.tasks.length && <p className="project-workspace__empty">{th ? "เพิ่มงานแรก แล้วงานถัดไปจะเชื่อมกันตามวันส่งอัตโนมัติ" : "Add your first task. Upcoming tasks connect automatically by due date."}</p>}
        </div>
        <div className="project-workspace__calendar">
          <TaskCalendar key={project.id} tasks={project.tasks} now={now} locale={locale} messages={messages} onOpen={onOpen} />
          {project.tasks.length > 0 && <details className="project-task-index"><summary>{th ? "รายการงานทั้งหมด" : "All project tasks"} · {project.tasks.length}</summary><ol>{project.tasks.map((task) => <li key={task.id}><button type="button" onClick={() => onOpen(task)}><span className={task.completed ? "line-through opacity-60" : ""}>{task.title}</span><time dateTime={task.dueDate}>{formatDate(task.dueDate, locale, { day: "numeric", month: "short" })}</time></button></li>)}</ol></details>}
        </div>
      </div>}
  </section>;
}
