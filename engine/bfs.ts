import type { Disruptions, Layout } from './types';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function isWalkable(layout: Layout, x: number, y: number, extra: Set<number>): boolean {
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return false;
  if (extra.has(y * layout.width + x)) return false;
  const t = layout.cells[y][x].type;
  return t !== 'WALL' && t !== 'OBSTACLE';
}

/**
 * Distance map per SPEC section 2.
 * BFS outward from every open EXIT over walkable cells.
 * Unreachable cells stay Infinity. Returns dist[y][x].
 */
export function buildDistanceMap(layout: Layout, disruptions: Disruptions): number[][] {
  const { width, height } = layout;
  const blocked = new Set(disruptions.blockedExits);
  const extra = new Set(disruptions.extraObstacles.map((o) => o.y * width + o.x));
  // SPEC section 1: a blocked exit behaves like a WALL for routing.
  for (const ex of layout.exits) {
    if (blocked.has(ex.id)) extra.add(ex.y * width + ex.x);
  }

  const dist: number[][] = Array.from({ length: height }, () =>
    new Array<number>(width).fill(Infinity),
  );

  const queue: number[] = [];
  for (const ex of layout.exits) {
    if (blocked.has(ex.id)) continue;
    if (extra.has(ex.y * width + ex.x)) continue;
    dist[ex.y][ex.x] = 0;
    queue.push(ex.y * width + ex.x);
  }

  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head];
    const x = idx % width;
    const y = (idx - x) / width;
    const d = dist[y][x];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkable(layout, nx, ny, extra)) continue;
      if (dist[ny][nx] !== Infinity) continue;
      dist[ny][nx] = d + 1;
      queue.push(ny * width + nx);
    }
  }
  return dist;
}
