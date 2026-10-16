export interface GraphPoint {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function createGraphPoints(ids: readonly string[]): GraphPoint[] {
  return ids.map((id, index) => {
    const angle = index * 2.39996;
    const radius = index === 0 ? 0 : 70 + Math.sqrt(index) * 35;
    return { id, x: 320 + Math.cos(angle) * radius, y: 245 + Math.sin(angle) * radius, vx: 0, vy: 0 };
  });
}

/** A damped force simulation: cooling is managed by the caller, never runs forever. */
export function stepGraph(points: GraphPoint[], links: readonly [string, string][], heldId: string | null): number {
  const byId = new Map(points.map((point) => [point.id, point]));
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    a.vx += (320 - a.x) * 0.002;
    a.vy += (245 - a.y) * 0.002;
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      const dx = a.x - b.x || 0.01;
      const dy = a.y - b.y || 0.01;
      const distance = Math.max(Math.hypot(dx, dy), 12);
      const force = Math.min(2, 2200 / (distance * distance));
      a.vx += dx / distance * force;
      a.vy += dy / distance * force;
      b.vx -= dx / distance * force;
      b.vy -= dy / distance * force;
    }
  }
  for (const [source, target] of links) {
    const a = byId.get(source), b = byId.get(target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const force = (distance - 150) * 0.008;
    a.vx += dx / distance * force;
    a.vy += dy / distance * force;
    b.vx -= dx / distance * force;
    b.vy -= dy / distance * force;
  }
  let energy = 0;
  for (const point of points) {
    if (point.id === heldId) { point.vx = 0; point.vy = 0; continue; }
    point.vx *= 0.78;
    point.vy *= 0.78;
    point.x += point.vx;
    point.y += point.vy;
    energy += Math.abs(point.vx) + Math.abs(point.vy);
  }
  return energy;
}
