import { isWalkable } from './bfs';
import { createRng, shuffle } from './rng';
import type { Disruptions, Layout, Scenario } from './types';

export const DEFAULT_MAX_TICKS = 3000; // 25 minutes at 0.5 s per tick

/**
 * Picks `count` distinct start cells from the layout's SPAWN cells (SPEC section 5).
 * Uses its own seeded stream (seed offset) so spawn choices and in-run tie-breaks
 * are not correlated. Throws if there are not enough SPAWN cells.
 */
export function pickStartPositions(
  layout: Layout,
  count: number,
  seed: number,
): { x: number; y: number }[] {
  const spawnCells: { x: number; y: number }[] = [];
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      if (layout.cells[y][x].type === 'SPAWN') spawnCells.push({ x, y });
    }
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`occupant count must be a non-negative integer, got ${count}`);
  }
  if (count > spawnCells.length) {
    throw new Error(`requested ${count} occupants but the layout has only ${spawnCells.length} SPAWN cells`);
  }
  const rng = createRng((seed + 0x9e3779b9) >>> 0);
  return shuffle(rng, spawnCells).slice(0, count);
}

export interface ScenarioOptions {
  name: string;
  seed: number;
  occupantCount: number;
  disruptions?: Disruptions;
  maxTicks?: number;
}

/** Builds a scenario and fixes its start positions from the seed. */
export function createScenario(layout: Layout, opts: ScenarioOptions): Scenario {
  return {
    version: 1,
    name: opts.name,
    seed: opts.seed,
    occupantCount: opts.occupantCount,
    startPositions: pickStartPositions(layout, opts.occupantCount, opts.seed),
    disruptions: opts.disruptions ?? { blockedExits: [], extraObstacles: [] },
    maxTicks: opts.maxTicks ?? DEFAULT_MAX_TICKS,
  };
}

/**
 * A what-if variant of a scenario: same seed, same occupants, same exact start
 * positions, different disruptions. This is what comparisons run against the baseline.
 */
export function deriveScenario(base: Scenario, name: string, disruptions: Disruptions): Scenario {
  return {
    ...base,
    name,
    startPositions: base.startPositions.map((p) => ({ ...p })),
    disruptions: {
      blockedExits: [...disruptions.blockedExits],
      extraObstacles: disruptions.extraObstacles.map((o) => ({ ...o })),
    },
  };
}

/**
 * Throws a descriptive Error if the scenario cannot be run on this layout.
 * Start cells on an extra obstacle are allowed (the agent is trapped, so it becomes stuck).
 */
export function validateScenario(layout: Layout, scenario: Scenario): void {
  if (scenario.startPositions.length !== scenario.occupantCount) {
    throw new Error(
      `occupantCount (${scenario.occupantCount}) does not match startPositions (${scenario.startPositions.length})`,
    );
  }
  if (!Number.isInteger(scenario.maxTicks) || scenario.maxTicks < 0) {
    throw new Error(`maxTicks must be a non-negative integer, got ${scenario.maxTicks}`);
  }
  for (const ex of layout.exits) {
    if (!Number.isInteger(ex.capacity) || ex.capacity < 0) {
      throw new Error(`exit ${ex.id} capacity must be a non-negative integer, got ${ex.capacity}`);
    }
  }
  const none = new Set<number>();
  const seen = new Set<number>();
  for (const p of scenario.startPositions) {
    if (!isWalkable(layout, p.x, p.y, none)) {
      throw new Error(`start position (${p.x},${p.y}) is outside the grid or not walkable`);
    }
    if (layout.cells[p.y][p.x].type === 'EXIT') {
      throw new Error(`start position (${p.x},${p.y}) is on an EXIT cell`);
    }
    const key = p.y * layout.width + p.x;
    if (seen.has(key)) throw new Error(`two agents start on cell (${p.x},${p.y})`);
    seen.add(key);
  }
}
