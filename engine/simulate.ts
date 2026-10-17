import { buildDistanceMap } from './bfs';
import { emptyHeat, summarizeWaits } from './metrics';
import { createRng, randInt, shuffle } from './rng';
import { validateScenario } from './scenario';
import type { Agent, Layout, RunMetrics, RunResult, Scenario } from './types';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Cells within this many steps of an exit count as that exit's queue zone (SPEC section 6). */
const QUEUE_RADIUS = 3;

export interface DetailedRun {
  result: RunResult;
  /** Final state of every agent, indexed by agent id. */
  agents: Agent[];
  /** exitedPerTick[t] = agents that left during tick t. Index 0 is always 0. */
  exitedPerTick: number[];
}

/**
 * Runs one simulation per SPEC sections 2-6. Pure and deterministic:
 * same layout + scenario (including seed) always gives an identical result.
 * Throws if the scenario is invalid for the layout (see validateScenario).
 */
export function simulate(layout: Layout, scenario: Scenario): RunResult {
  return simulateDetailed(layout, scenario).result;
}

/** Same as simulate, plus final agent states and per-tick exit counts (used by tests and later the UI). */
export function simulateDetailed(layout: Layout, scenario: Scenario): DetailedRun {
  validateScenario(layout, scenario);

  const { width, height } = layout;
  const { disruptions, maxTicks } = scenario;
  const rng = createRng(scenario.seed);

  // SPEC section 2: the distance map is built once per run.
  const dist = buildDistanceMap(layout, disruptions);

  // Open exits are the cells BFS seeded from (distance 0). Capacity is looked up by cell.
  const blocked = new Set(disruptions.blockedExits);
  const covered = new Set(disruptions.extraObstacles.map((o) => o.y * width + o.x));
  const capacityByCell = new Map<number, number>();
  const exitIdByCell = new Map<number, string>();
  const openExits = layout.exits.filter((ex) => {
    const idx = ex.y * width + ex.x;
    return !blocked.has(ex.id) && !covered.has(idx);
  });
  for (const ex of openExits) {
    const idx = ex.y * width + ex.x;
    capacityByCell.set(idx, ex.capacity);
    exitIdByCell.set(idx, ex.id);
  }

  // Queue zones: for each open exit, the cells within QUEUE_RADIUS walking steps of it.
  const zonesOfCell: (number[] | undefined)[] = new Array(width * height);
  openExits.forEach((ex, exitNo) => {
    const others = layout.exits.filter((o) => o.id !== ex.id).map((o) => o.id);
    const own = buildDistanceMap(layout, {
      blockedExits: [...disruptions.blockedExits, ...others],
      extraObstacles: disruptions.extraObstacles,
    });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = own[y][x];
        if (d >= 1 && d <= QUEUE_RADIUS) {
          (zonesOfCell[y * width + x] ??= []).push(exitNo);
        }
      }
    }
  });

  // Agents. Those on unreachable cells are stuck from tick 0 and never move.
  const agents: Agent[] = scenario.startPositions.map((p, id) => ({
    id,
    x: p.x,
    y: p.y,
    status: dist[p.y][p.x] === Infinity ? 'stuck' : 'moving',
    waitTicks: 0,
    exitedAtTick: null,
  }));

  // Occupancy snapshot source: agent id per cell, -1 when free. Stuck agents occupy their cell.
  const occupant = new Int32Array(width * height).fill(-1);
  for (const a of agents) occupant[a.y * width + a.x] = a.id;

  const heat = emptyHeat(width, height);
  const exitUsage: Record<string, number> = {};
  for (const ex of layout.exits) exitUsage[ex.id] = 0;

  let active: number[] = agents.filter((a) => a.status === 'moving').map((a) => a.id);
  const remainingOverTime: number[] = [active.length];
  const exitedPerTick: number[] = [0];
  let maxQueueLength = 0;
  let tick = 0;

  while (active.length > 0 && tick < maxTicks) {
    tick++;

    // 1. Propose, all from the snapshot at the start of the tick.
    const proposals = new Map<number, number[]>(); // target cell -> proposing agent ids
    for (const id of active) {
      const a = agents[id];
      const here = dist[a.y][a.x];
      let best = Infinity;
      let candidates: number[] = [];
      for (const [dx, dy] of DIRS) {
        const nx = a.x + dx;
        const ny = a.y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const d = dist[ny][nx];
        if (d >= here) continue; // must be strictly lower
        const cell = ny * width + nx;
        if (occupant[cell] !== -1) continue; // occupied at start of tick
        if (d < best) {
          best = d;
          candidates = [cell];
        } else if (d === best) {
          candidates.push(cell);
        }
      }
      if (candidates.length === 0) continue; // proposes to stay
      const target = candidates.length === 1 ? candidates[0] : candidates[randInt(rng, candidates.length)];
      const list = proposals.get(target);
      if (list) list.push(id);
      else proposals.set(target, [id]);
    }

    // 2 + 3. Resolve conflicts and apply exit throughput.
    // Normal cells hold one agent, so one random winner. An EXIT cell never holds an
    // agent, so up to `capacity` randomly chosen proposers pass through it per tick.
    const winners: { id: number; target: number }[] = [];
    for (const [target, ids] of proposals) {
      const capacity = capacityByCell.get(target);
      if (capacity !== undefined) {
        const order = ids.length > 1 ? shuffle(rng, ids) : ids;
        for (let k = 0; k < Math.min(capacity, order.length); k++) {
          winners.push({ id: order[k], target });
        }
      } else {
        const id = ids.length === 1 ? ids[0] : ids[randInt(rng, ids.length)];
        winners.push({ id, target });
      }
    }

    // 4. Move.
    const advanced = new Set<number>();
    let exitedNow = 0;
    for (const { id, target } of winners) {
      const a = agents[id];
      occupant[a.y * width + a.x] = -1;
      advanced.add(id);
      const exitId = exitIdByCell.get(target);
      if (exitId !== undefined) {
        a.x = target % width;
        a.y = (target - a.x) / width;
        a.status = 'exited';
        a.exitedAtTick = tick;
        exitUsage[exitId]++;
        exitedNow++;
      } else {
        a.x = target % width;
        a.y = (target - a.x) / width;
        a.status = 'moving';
        occupant[target] = id;
      }
    }

    // 5. Record. Every active agent that did not advance this tick is waiting.
    const queueCounts = new Array<number>(openExits.length).fill(0);
    for (const id of active) {
      if (advanced.has(id)) continue;
      const a = agents[id];
      a.status = 'waiting';
      a.waitTicks += 1;
      heat[a.y][a.x] += 1;
      const zones = zonesOfCell[a.y * width + a.x];
      if (zones) for (const z of zones) queueCounts[z]++;
    }
    for (const q of queueCounts) if (q > maxQueueLength) maxQueueLength = q;

    active = active.filter((id) => agents[id].status !== 'exited');
    remainingOverTime.push(active.length);
    exitedPerTick.push(exitedNow);
  }

  // 6. Stop. clearanceTicks is the tick of the last exit, or maxTicks if the run timed out.
  const { avgWait, maxWait } = summarizeWaits(agents);
  const metrics: RunMetrics = {
    clearanceTicks: tick,
    timedOut: active.length > 0,
    remainingOverTime,
    maxQueueLength,
    avgWait,
    maxWait,
    unreachableCount: agents.filter((a) => a.status === 'stuck').length,
    heat,
    exitUsage,
  };

  return { result: { scenario, metrics }, agents, exitedPerTick };
}
