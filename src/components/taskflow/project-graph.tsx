"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { Task } from "@/types/task";
import { createGraphPoints, stepGraph } from "@/features/projects/graph-physics";
import { getProjectLinks } from "@/features/projects/project-selectors";
import type { Locale } from "@/i18n";

interface Props { name: string; tasks: Task[]; locale: Locale; onOpen: (task: Task) => void }
const ROOT = "__project_root__";
function fitCamera(points: ReturnType<typeof createGraphPoints>) {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - 90, maxX = Math.max(...xs) + 90;
  const minY = Math.min(...ys) - 45, maxY = Math.max(...ys) + 65;
  const zoom = Math.min(2, 640 / (maxX - minX), 490 / (maxY - minY));
  return { zoom, x: 320 - (minX + maxX) / 2 * zoom, y: 245 - (minY + maxY) / 2 * zoom };
}

export function ProjectGraph({ name, tasks, locale, onOpen }: Props) {
  const th = locale === "th";
  const reducedMotion = useReducedMotion();
  const svg = useRef<SVGSVGElement>(null);
  const links = useMemo<[string, string][]>(() => [
    ...(tasks.length ? [[ROOT, tasks[0].id] as [string, string]] : []), ...getProjectLinks(tasks),
  ], [tasks]);
  const points = useMemo(() => {
    const next = createGraphPoints([ROOT, ...tasks.map((task) => task.id)]);
    for (let i = 0; i < 120; i++) stepGraph(next, links, null);
    return next;
  }, [links, tasks]);
  const wake = useRef<() => void>(() => {});
  const held = useRef<string | null>(null);
  const gesture = useRef<{ id: number; node: string | null; x: number; y: number; moved: boolean; distance: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [camera, setCamera] = useState(() => fitCamera(points));

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    let frame = 0, remaining = 0, stopped = false;
    const paint = () => {
      const byId = new Map(points.map((point) => [point.id, point]));
      element.querySelectorAll<SVGGElement>("[data-node]").forEach((node) => {
        const point = byId.get(node.dataset.node!);
        if (point) node.setAttribute("transform", `translate(${point.x} ${point.y})`);
      });
      element.querySelectorAll<SVGLineElement>("[data-link]").forEach((line, index) => {
        const [a, b] = links[index].map((id) => byId.get(id)!);
        line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
      });
    };
    const tick = () => {
      if (stopped) return;
      frame = 0;
      const energy = stepGraph(points, links, held.current);
      paint();
      if (!document.hidden && remaining-- > 0 && (held.current || energy > 0.015)) frame = requestAnimationFrame(tick);
    };
    wake.current = () => {
      remaining = 240;
      if (reducedMotion) { paint(); return; }
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    };
    // Static initial layout also works for reduced motion and hidden tabs.
    paint();
    wake.current();
    const resume = () => { if (!document.hidden) wake.current(); };
    document.addEventListener("visibilitychange", resume);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(element.getScreenCTM()!.inverse());
      const px = position.x, py = position.y;
      setCamera((current) => {
        const zoom = Math.max(0.25, Math.min(3, current.zoom * Math.exp(-event.deltaY * 0.0015)));
        const ratio = zoom / current.zoom;
        return { zoom, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      element.removeEventListener("wheel", wheel);
      wake.current = () => {};
    };
  }, [links, points, reducedMotion]);

  const coords = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(event.currentTarget.getScreenCTM()!.inverse());
    return { x: point.x, y: point.y };
  };
  const zoomBy = (factor: number) => setCamera((current) => {
    const zoom = Math.max(0.25, Math.min(3, current.zoom * factor));
    return { zoom, x: 320 - (320 - current.x) * zoom / current.zoom, y: 245 - (245 - current.y) * zoom / current.zoom };
  });
  const fit = () => setCamera(fitCamera(points));
  const finish = (event: ReactPointerEvent<SVGSVGElement>, cancelled = false) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null; held.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    wake.current();
    if (!cancelled && !current.moved && current.node !== ROOT) {
      const task = tasks.find((task) => task.id === current.node);
      if (task) onOpen(task);
    }
  };
  const neighbors = new Set(links.filter(([a, b]) => a === hover || b === hover).flat());

  return <div className="project-graph">
    <div className="project-graph__tools" role="group" aria-label={th ? "ควบคุมกราฟ" : "Graph controls"}>
      <button type="button" onClick={() => zoomBy(1.25)} aria-label={th ? "ซูมเข้า" : "Zoom in"}><Plus size={16} /></button>
      <button type="button" onClick={() => zoomBy(0.8)} aria-label={th ? "ซูมออก" : "Zoom out"}><Minus size={16} /></button>
      <button type="button" onClick={fit} aria-label={th ? "แสดงกราฟทั้งหมด" : "Fit graph"}><Maximize2 size={16} /></button>
    </div>
    <svg ref={svg} viewBox="0 0 640 490" preserveAspectRatio="xMidYMid meet" role="group" aria-label={th ? `แผนผังงาน ${name}` : `${name} task graph`}
      onPointerDown={(event) => {
        if (gesture.current || event.button !== 0) return;
        const target = (event.target as Element).closest<SVGGElement>("[data-node]");
        const position = coords(event);
        gesture.current = { id: event.pointerId, node: target?.dataset.node ?? null, ...position, moved: false, distance: 0 };
        held.current = target?.dataset.node ?? null;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current || current.id !== event.pointerId) return;
        const position = coords(event);
        const dx = position.x - current.x, dy = position.y - current.y;
        current.distance += Math.hypot(dx, dy);
        if (current.distance > 4) current.moved = true;
        if (current.node) {
          const point = points.find((point) => point.id === current.node)!;
          point.x += dx / camera.zoom; point.y += dy / camera.zoom;
          wake.current();
        } else setCamera((camera) => ({ ...camera, x: camera.x + dx, y: camera.y + dy }));
        current.x = position.x; current.y = position.y;
      }}
      onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}>
      <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
        {links.map(([a, b]) => <line key={`${a}:${b}`} data-link="" className="project-graph__link" data-highlight={hover && (a === hover || b === hover) || undefined} data-dim={hover && a !== hover && b !== hover || undefined} />)}
        {points.map((point, index) => {
          const task = tasks[index - 1];
          const label = task?.title ?? name;
          return <g key={point.id} data-node={point.id} className="project-graph__node" role={task ? "button" : "img"} tabIndex={task ? 0 : undefined}
            aria-label={task ? `${label} · ${task.dueDate}` : label} data-root={!task || undefined} data-completed={task?.completed || undefined}
            data-dim={hover && point.id !== hover && !neighbors.has(point.id) || undefined}
            onPointerEnter={() => { if (!gesture.current) setHover(point.id); }} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(point.id)} onBlur={() => setHover(null)} onKeyDown={(event) => { if (task && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(task); } }}>
            <title>{label}{task ? ` · ${task.dueDate}` : ""}</title>
            <circle r="22" className="project-graph__hit" />
            <circle r={task ? 6 : 10} />
            <text y={task ? 25 : -23} textAnchor="middle">{!task && name.includes(" — ") ? name.split(" — ")[0] : label.length > 24 ? `${label.slice(0, 23)}…` : label}</text>
            {task && <text y="41" textAnchor="middle" className="project-graph__date">{task.dueDate.slice(5)}</text>}
          </g>;
        })}
      </g>
    </svg>
    <p className="project-graph__hint">{th ? "ลากจุดเพื่อจัดวาง · ลากพื้นที่ว่างเพื่อเลื่อน · เลื่อนล้อเพื่อซูม" : "Drag nodes to arrange · Drag canvas to pan · Scroll to zoom"}</p>
  </div>;
}
