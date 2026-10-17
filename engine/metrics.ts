import type { Agent } from './types';

/** A width x height grid of zeros, indexed [y][x]. */
export function emptyHeat(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => new Array<number>(width).fill(0));
}

/** Mean and max of waitTicks over agents who exited (SPEC section 6). 0/0 when nobody exited. */
export function summarizeWaits(agents: readonly Agent[]): { avgWait: number; maxWait: number } {
  let total = 0;
  let max = 0;
  let count = 0;
  for (const a of agents) {
    if (a.status !== 'exited') continue;
    total += a.waitTicks;
    if (a.waitTicks > max) max = a.waitTicks;
    count++;
  }
  return { avgWait: count === 0 ? 0 : total / count, maxWait: max };
}

/**
 * Scales raw heat counters to 0..1 for the heatmap. Raw counters stay in RunMetrics;
 * the UI calls this when drawing. Returns a new grid; all zeros if nothing ever waited.
 */
export function normalizeHeat(heat: readonly (readonly number[])[]): number[][] {
  let max = 0;
  for (const row of heat) for (const v of row) if (v > max) max = v;
  return heat.map((row) => row.map((v) => (max === 0 ? 0 : v / max)));
}
