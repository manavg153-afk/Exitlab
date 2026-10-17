import { buildDistanceMap } from './bfs';
import { emptyHeat, summarizeWaits } from './metrics';
import { createRng, randInt, shuffle, type Rng } from './rng';
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

/** Snapshot of agent positions/statuses at a specific tick. */
export interface AgentFrame {
  id: number;
  x: number;
  y: number;
  status: Agent['status'];
  waitTicks: number;
}

export interface SimFrame {
  tick: number;
  remaining: number;
  exitedNow: number;
  maxQueueNow: number;
  agents: AgentFrame[];
}

export interface DetailedRun {
  result: RunResult;
  /** Final state of every agent, indexed by agent id. */
  agents: Agent[];
  /** exitedPerTick[t] = agents that left during tick t. Index 0 is always 0. */
  exitedPerTick: number[];
  /** Optional per-tick frames if recordTrace was enabled */
  frames?: SimFrame[];
}

export interface SimulationState {
  readonly layout: Layout;
  readonly scenario: Scenario;
  readonly dist: number[][];
  readonly openExits: Layout['exits'];
  readonly zonesOfCell: (number[] | undefined)[];
  agents: Agent[];
  occupant: Int32Array;
  heat: number[][];
  exitUsage: Record<string, number>;
  active: number[];
  remainingOverTime: number[];
  exitedPerTick: number[];
  maxQueueLength: number;
  tick: number;
  done: boolean;
  rng: Rng;
}

/**
 * Creates an interactive stepwise simulation instance for UI playback/stepping.
 */
export function createSimulation(layout: Layout, scenario: Scenario): SimulationState {
  validateScenario(layout, scenario);

  const { width, height } = layout;
  const { disruptions } = scenario;
  const rng = createRng(scenario.seed);

  const dist = buildDistanceMap(layout, disruptions);

  const blocked = new Set(disruptions.blockedExits);
  const covered = new Set(disruptions.extraObstacles.map((o) => o.y * width + o.x));
  const openExits = layout.exits.filter((ex) => {
    const idx = ex.y * width + ex.x;
    return !blocked.has(ex.id) && !covered.has(idx);
  });

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

  const agents: Agent[] = scenario.startPositions.map((p, id) => ({
    id,
    x: p.x,
    y: p.y,
    status: dist[p.y][p.x] === Infinity ? 'stuck' : 'moving',
    waitTicks: 0,
    exitedAtTick: null,
  }));

  const occupant = new Int32Array(width * height).fill(-1);
  for (const a of agents) occupant[a.y * width + a.x] = a.id;

  const heat = emptyHeat(width, height);
  const exitUsage: Record<string, number> = {};
  for (const ex of layout.exits) exitUsage[ex.id] = 0;

  const active: number[] = agents.filter((a) => a.status === 'moving').map((a) => a.id);
  const remainingOverTime: number[] = [active.length];
  const exitedPerTick: number[] = [0];

  return {
    layout,
    scenario,
    dist,
    openExits,
    zonesOfCell,
    agents,
    occupant,
    heat,
    exitUsage,
    active,
    remainingOverTime,
    exitedPerTick,
    maxQueueLength: 0,
    tick: 0,
    done: active.length === 0,
    rng,
  };
}

/**
 * Steps the simulation forward by exactly one tick according to SPEC section 4.
 * Returns the SimFrame of this tick, or null if already done.
 */
export function stepSimulation(sim: SimulationState): SimFrame | null {
  if (sim.done) return null;
  if (sim.active.length === 0 || sim.tick >= sim.scenario.maxTicks) {
    sim.done = true;
    return null;
  }

  sim.tick++;
  const { width, height } = sim.layout;
  const { dist, openExits, rng, occupant, agents } = sim;

  const capacityByCell = new Map<number, number>();
  const exitIdByCell = new Map<number, string>();
  for (const ex of openExits) {
    const idx = ex.y * width + ex.x;
    capacityByCell.set(idx, ex.capacity);
    exitIdByCell.set(idx, ex.id);
  }

  // 1. Propose
  const proposals = new Map<number, number[]>();
  for (const id of sim.active) {
    const a = agents[id];
    const here = dist[a.y][a.x];
    let best = Infinity;
    let candidates: number[] = [];
    for (const [dx, dy] of DIRS) {
      const nx = a.x + dx;
      const ny = a.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const d = dist[ny][nx];
      if (d >= here) continue;
      const cell = ny * width + nx;
      if (occupant[cell] !== -1) continue;
      if (d < best) {
        best = d;
        candidates = [cell];
      } else if (d === best) {
        candidates.push(cell);
      }
    }
    if (candidates.length === 0) continue;
    const target = candidates.length === 1 ? candidates[0] : candidates[randInt(rng, candidates.length)];
    const list = proposals.get(target);
    if (list) list.push(id);
    else proposals.set(target, [id]);
  }

  // 2 + 3. Conflicts + exit throughput
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

  // 4. Move
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
      a.exitedAtTick = sim.tick;
      sim.exitUsage[exitId]++;
      exitedNow++;
    } else {
      a.x = target % width;
      a.y = (target - a.x) / width;
      a.status = 'moving';
      occupant[target] = id;
    }
  }

  // 5. Record
  const queueCounts = new Array<number>(openExits.length).fill(0);
  for (const id of sim.active) {
    if (advanced.has(id)) continue;
    const a = agents[id];
    a.status = 'waiting';
    a.waitTicks += 1;
    sim.heat[a.y][a.x] += 1;
    const zones = sim.zonesOfCell[a.y * width + a.x];
    if (zones) for (const z of zones) queueCounts[z]++;
  }

  let tickMaxQueue = 0;
  for (const q of queueCounts) {
    if (q > sim.maxQueueLength) sim.maxQueueLength = q;
    if (q > tickMaxQueue) tickMaxQueue = q;
  }

  sim.active = sim.active.filter((id) => agents[id].status !== 'exited');
  sim.remainingOverTime.push(sim.active.length);
  sim.exitedPerTick.push(exitedNow);

  if (sim.active.length === 0 || sim.tick >= sim.scenario.maxTicks) {
    sim.done = true;
  }

  return {
    tick: sim.tick,
    remaining: sim.active.length,
    exitedNow,
    maxQueueNow: tickMaxQueue,
    agents: agents.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      status: a.status,
      waitTicks: a.waitTicks,
    })),
  };
}

/**
 * Completes remaining ticks of simulation and compiles final metrics.
 */
export function finishSimulation(sim: SimulationState): DetailedRun {
  while (!sim.done) {
    stepSimulation(sim);
  }

  const { avgWait, maxWait } = summarizeWaits(sim.agents);
  const metrics: RunMetrics = {
    clearanceTicks: sim.tick,
    timedOut: sim.active.length > 0,
    remainingOverTime: sim.remainingOverTime,
    maxQueueLength: sim.maxQueueLength,
    avgWait,
    maxWait,
    unreachableCount: sim.agents.filter((a) => a.status === 'stuck').length,
    heat: sim.heat,
    exitUsage: sim.exitUsage,
  };

  return {
    result: { scenario: sim.scenario, metrics },
    agents: sim.agents,
    exitedPerTick: sim.exitedPerTick,
  };
}

/**
 * Runs one simulation per SPEC sections 2-6. Pure and deterministic:
 * same layout + scenario (including seed) always gives an identical result.
 * Throws if the scenario is invalid for the layout (see validateScenario).
 */
export function simulate(layout: Layout, scenario: Scenario): RunResult {
  return simulateDetailed(layout, scenario).result;
}

/**
 * Same as simulate, plus final agent states and per-tick exit counts (used by tests and the UI).
 * Optionally records full frame-by-frame animation traces when `recordTrace: true`.
 */
export function simulateDetailed(
  layout: Layout,
  scenario: Scenario,
  opts?: { recordTrace?: boolean },
): DetailedRun {
  const sim = createSimulation(layout, scenario);
  const frames: SimFrame[] = [];

  if (opts?.recordTrace) {
    // Record initial frame at tick 0
    frames.push({
      tick: 0,
      remaining: sim.active.length,
      exitedNow: 0,
      maxQueueNow: 0,
      agents: sim.agents.map((a) => ({
        id: a.id,
        x: a.x,
        y: a.y,
        status: a.status,
        waitTicks: a.waitTicks,
      })),
    });
  }

  while (!sim.done) {
    const frame = stepSimulation(sim);
    if (opts?.recordTrace && frame) {
      frames.push(frame);
    }
  }

  const finished = finishSimulation(sim);
  if (opts?.recordTrace) {
    finished.frames = frames;
  }
  return finished;
}
