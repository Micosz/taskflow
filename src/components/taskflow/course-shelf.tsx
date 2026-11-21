"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { courseInk, courseTabLabel } from "@/features/courses/course-stationery";
import type { Project } from "@/features/projects/project-selectors";
import type { TranslationMessages } from "@/i18n";

interface CourseShelfProps {
  projects: readonly Project[];
  messages: TranslationMessages;
  onOpen: (project: Project) => void;
  onManage: () => void;
}

export function CourseShelf({ projects, messages, onOpen, onManage }: CourseShelfProps) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ back: false, next: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      setEdges({ back: element.scrollLeft > 2, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", measure); };
  }, [projects]);

  function scroll(direction: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.75, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section className="course-shelf" aria-labelledby="shelf-title">
      <header className="sheet-heading">
        <h2 id="shelf-title"><FolderOpen aria-hidden="true" />{messages.notebook.courses}</h2>
        {projects.length > 0 && <button type="button" className="sheet-icon" onClick={onManage} aria-label={messages.courses.title} title={messages.courses.title}><Plus size={17} aria-hidden="true" /></button>}
      </header>
      <div className="course-shelf__strip">
        <div className="course-shelf__rail" ref={rail}>
          {projects.map((project) => (
            <button key={project.id} type="button" className="course-cover" data-course-ink={courseInk(project.name)} onClick={() => onOpen(project)} aria-label={project.name} title={project.name}>
              <span className="course-cover__label">{courseTabLabel(project.name)}</span>
            </button>
          ))}
          {projects.length === 0 && <button type="button" className="course-cover course-cover--new" onClick={onManage} aria-label={messages.notebook.addCourse}><span className="course-cover__label"><Plus size={15} aria-hidden="true" />{messages.notebook.addCourse}</span></button>}
        </div>
        {(edges.back || edges.next) && <div className="course-shelf__buttons">
          {edges.next && <button type="button" className="sheet-icon" onClick={() => scroll(1)} aria-label={messages.notebook.nextCourses}><ChevronRight aria-hidden="true" /></button>}
          {edges.back && <button type="button" className="sheet-icon" onClick={() => scroll(-1)} aria-label={messages.notebook.previousCourses}><ChevronLeft aria-hidden="true" /></button>}
        </div>}
      </div>
    </section>
  );
}
