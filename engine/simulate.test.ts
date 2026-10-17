import { describe, expect, it } from 'vitest';
import { buildDistanceMap } from './bfs';
import { compareRuns, pctChange, runComparison } from './compare';
import { emptyHeat, normalizeHeat } from './metrics';
import { createScenario, deriveScenario, pickStartPositions, validateScenario } from './scenario';
import { simulate, simulateDetailed } from './simulate';
import type { Cell, Disruptions, Layout, Scenario } from './types';

// ---------- helpers ----------

function room(width: number, height: number): Layout {
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return { type: edge ? 'WALL' : 'EMPTY' } as Cell;
    }),
  );
  return { version: 1, name: 'test', width, height, cells, exits: [] };
}

function addExit(layout: Layout, id: string, x: number, y: number, capacity = 1) {
  layout.cells[y][x] = { type: 'EXIT', exitId: id };
  layout.exits.push({ id, x, y, capacity });
}

const noDisruptions = (): Disruptions => ({ blockedExits: [], extraObstacles: [] });

/** A scenario with hand-placed agents, for exact expectations. */
function at(
  positions: [number, number][],
  extra: Partial<Scenario> = {},
): Scenario {
  return {
    version: 1,
    name: 'hand',
    seed: 1,
    occupantCount: positions.length,
    startPositions: positions.map(([x, y]) => ({ x, y })),
    disruptions: noDisruptions(),
    maxTicks: 3000,
    ...extra,
  };
}

// ---------- SPEC section 9 checklist ----------

describe('SPEC 9: single agent', () => {
  it('clearance equals the distance', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2);
    const { result, agents } = simulateDetailed(l, at([[5, 2]]));
    expect(result.metrics.clearanceTicks).toBe(5);
    expect(result.metrics.timedOut).toBe(false);
    expect(agents[0].status).toBe('exited');
    expect(agents[0].exitedAtTick).toBe(5);
    expect(agents[0].waitTicks).toBe(0);
    expect(result.metrics.avgWait).toBe(0);
    expect(result.metrics.exitUsage).toEqual({ A: 1 });
  });

  it('an agent adjacent to an exit leaves on tick 1', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2);
    const { result, agents, exitedPerTick } = simulateDetailed(l, at([[1, 2]]));
    expect(agents[0].exitedAtTick).toBe(1);
    expect(result.metrics.clearanceTicks).toBe(1);
    expect(exitedPerTick).toEqual([0, 1]);
    expect(result.metrics.remainingOverTime).toEqual([1, 0]);
  });
});

describe('SPEC 9: enclosed room', () => {
  it('all agents are stuck, no crash, no infinite loop', () => {
    const l = room(7, 5);
    const { result, agents } = simulateDetailed(
      l,
      at([[1, 1], [3, 2], [5, 3], [2, 3]]),
    );
    expect(agents.every((a) => a.status === 'stuck')).toBe(true);
    expect(result.metrics.unreachableCount).toBe(4);
    expect(result.metrics.clearanceTicks).toBe(0);
    expect(result.metrics.timedOut).toBe(false);
    expect(result.metrics.remainingOverTime).toEqual([0]);
  });

  it('stuck agents do not stop the reachable ones from finishing', () => {
    // wall column at x=4 seals the east half off from the exit
    const l = room(9, 5);
    for (let y = 1; y <= 3; y++) l.cells[y][4] = { type: 'WALL' };
    addExit(l, 'A', 0, 2);
    const { result, agents } = simulateDetailed(l, at([[2, 2], [6, 2]]));
    expect(agents[0].status).toBe('exited');
    expect(agents[1].status).toBe('stuck');
    expect(result.metrics.unreachableCount).toBe(1);
    expect(result.metrics.clearanceTicks).toBe(2);
    expect(result.metrics.timedOut).toBe(false);
  });
});

describe('SPEC 9: conflicts', () => {
  // Both agents have exactly one lower-distance neighbour: (1,2).
  function contested() {
    const l = room(5, 5);
    addExit(l, 'A', 0, 2);
    return l;
  }

  it('exactly one moves, the loser waits and its waitTicks increments', () => {
    const l = contested();
    const { agents, result } = simulateDetailed(l, at([[1, 1], [1, 3]], { maxTicks: 1 }));
    const movedToTarget = agents.filter((a) => a.x === 1 && a.y === 2);
    expect(movedToTarget).toHaveLength(1);
    const winner = movedToTarget[0];
    const loser = agents.find((a) => a.id !== winner.id)!;
    expect(winner.status).toBe('moving');
    expect(winner.waitTicks).toBe(0);
    expect(loser.status).toBe('waiting');
    expect(loser.waitTicks).toBe(1);
    // the loser stayed on its start cell and left heat there
    const start = loser.id === 0 ? { x: 1, y: 1 } : { x: 1, y: 3 };
    expect({ x: loser.x, y: loser.y }).toEqual(start);
    expect(result.metrics.heat[start.y][start.x]).toBe(1);
    expect(result.metrics.maxQueueLength).toBe(1);
  });

  it('snapshot rule: the loser also waits while the winner is still in the cell', () => {
    const l = contested();
    const { agents } = simulateDetailed(l, at([[1, 1], [1, 3]]));
    const exitTicks = agents.map((a) => a.exitedAtTick).sort();
    expect(exitTicks).toEqual([2, 4]);
    const waits = agents.map((a) => a.waitTicks).sort();
    expect(waits).toEqual([0, 2]);
  });

  it('winners are chosen by the RNG, not by array order', () => {
    const l = contested();
    const winners = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const { agents } = simulateDetailed(l, at([[1, 1], [1, 3]], { seed, maxTicks: 1 }));
      winners.add(agents.find((a) => a.x === 1 && a.y === 2)!.id);
    }
    expect(winners).toEqual(new Set([0, 1]));
  });
});

describe('SPEC 9: exit capacity', () => {
  // Exit in the middle of an open room so four agents can reach it in the same tick.
  function open() {
    const l = room(9, 9);
    return l;
  }
  const ring: [number, number][] = [[3, 4], [5, 4], [4, 3], [4, 5]];
  const crowd: [number, number][] = [
    ...ring,
    [3, 3], [5, 3], [3, 5], [5, 5], [2, 4], [6, 4],
  ];

  it('capacity 1 and 10 agents: at most 1 exits per tick', () => {
    const l = open();
    addExit(l, 'X', 4, 4, 1);
    const { result, exitedPerTick, agents } = simulateDetailed(l, at(crowd));
    expect(Math.max(...exitedPerTick)).toBe(1);
    expect(agents.every((a) => a.status === 'exited')).toBe(true);
    expect(result.metrics.clearanceTicks).toBeGreaterThanOrEqual(10);
    expect(result.metrics.maxQueueLength).toBeGreaterThanOrEqual(3);
    expect(result.metrics.exitUsage.X).toBe(10);
  });

  it('capacity N lets up to N through per tick, and never more', () => {
    for (const cap of [1, 2, 3, 4]) {
      const l = open();
      addExit(l, 'X', 4, 4, cap);
      const { exitedPerTick } = simulateDetailed(l, at(ring));
      expect(exitedPerTick[1]).toBe(cap); // 4 agents are adjacent, so capacity is the limit
      expect(Math.max(...exitedPerTick)).toBeLessThanOrEqual(cap);
    }
  });

  it('higher capacity clears the same crowd faster', () => {
    const run = (cap: number) => {
      const l = open();
      addExit(l, 'X', 4, 4, cap);
      return simulate(l, at(crowd)).metrics.clearanceTicks;
    };
    expect(run(4)).toBeLessThan(run(1));
  });

  it('capacity 0 never lets anyone out and the run times out at maxTicks', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2, 0);
    const { result, agents } = simulateDetailed(l, at([[1, 2]], { maxTicks: 20 }));
    expect(agents[0].status).toBe('waiting');
    expect(result.metrics.timedOut).toBe(true);
    expect(result.metrics.clearanceTicks).toBe(20);
    expect(result.metrics.remainingOverTime).toHaveLength(21);
    expect(result.metrics.remainingOverTime.every((n) => n === 1)).toBe(true);
  });
});

describe('SPEC 9: blocking an exit', () => {
  function twoExits() {
    const l = room(9, 5);
    addExit(l, 'A', 0, 2);
    addExit(l, 'B', 8, 2);
    return l;
  }
  const agentsAt: [number, number][] = [[7, 2], [6, 2], [2, 2]];

  it('changes the distance map and agents reroute', () => {
    const l = twoExits();
    const blocked: Disruptions = { blockedExits: ['B'], extraObstacles: [] };
    expect(buildDistanceMap(l, noDisruptions())[2][7]).toBe(1);
    expect(buildDistanceMap(l, blocked)[2][7]).toBe(7);

    const base = simulate(l, at(agentsAt)).metrics;
    const hit = simulate(l, at(agentsAt, { disruptions: blocked })).metrics;
    expect(base.exitUsage).toEqual({ A: 1, B: 2 });
    expect(hit.exitUsage).toEqual({ A: 3, B: 0 });
    expect(hit.clearanceTicks).toBeGreaterThan(base.clearanceTicks);
  });

  it('exact clearance numbers (hand-checked, including the follow-the-leader lag)', () => {
    const l = twoExits();
    const blocked: Disruptions = { blockedExits: ['B'], extraObstacles: [] };
    const cmp = runComparison(l, at(agentsAt), at(agentsAt, { disruptions: blocked }));
    expect(cmp.baseline.clearanceTicks).toBe(3);
    expect(cmp.scenario.clearanceTicks).toBe(8);
    expect(cmp.clearanceDelta).toBe(5);
    expect(cmp.clearanceDeltaPct).toBeCloseTo(166.667, 2);
    expect(cmp.unreachableDelta).toBe(0);
  });

  it('a blocked exit acts as a wall even when it is an interior doorway', () => {
    const l = room(9, 3);
    l.cells[1][4] = { type: 'EXIT', exitId: 'M' };
    l.exits.push({ id: 'M', x: 4, y: 1, capacity: 1 });
    l.cells[1][0] = { type: 'EXIT', exitId: 'A' };
    l.exits.push({ id: 'A', x: 0, y: 1, capacity: 1 });
    l.cells[0][4] = { type: 'WALL' };
    l.cells[2][4] = { type: 'WALL' };
    const d = buildDistanceMap(l, { blockedExits: ['M'], extraObstacles: [] });
    expect(d[1][6]).toBe(Infinity); // east side is sealed off, nobody walks through M
    expect(d[1][3]).toBe(3);
  });

  it('an extra obstacle on an agent start cell traps that agent', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2);
    const s = at([[3, 2]], { disruptions: { blockedExits: [], extraObstacles: [{ x: 3, y: 2 }] } });
    const { agents, result } = simulateDetailed(l, s);
    expect(agents[0].status).toBe('stuck');
    expect(result.metrics.unreachableCount).toBe(1);
  });
});

describe('SPEC 9: determinism', () => {
  function crowdedLayout() {
    const l = room(14, 9);
    addExit(l, 'A', 0, 4, 1);
    for (let y = 1; y <= 7; y++) for (let x = 7; x <= 12; x++) l.cells[y][x] = { type: 'SPAWN' };
    return l;
  }

  it('same seed gives identical results, tick for tick', () => {
    const l = crowdedLayout();
    const s = createScenario(l, { name: 'x', seed: 7, occupantCount: 25 });
    const a = simulateDetailed(l, s);
    const b = simulateDetailed(l, s);
    expect(b).toEqual(a);
  });

  it('a different seed may differ', () => {
    const l = crowdedLayout();
    const results = [1, 2, 3, 4, 5].map((seed) => {
      const s = createScenario(l, { name: 'x', seed, occupantCount: 25 });
      return JSON.stringify(simulate(l, s).metrics);
    });
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  it('same start positions but a different run seed can still differ in who waits', () => {
    const l = crowdedLayout();
    const base = createScenario(l, { name: 'base', seed: 3, occupantCount: 25 });
    const other = { ...base, seed: 4 };
    expect(other.startPositions).toEqual(base.startPositions);
    // both runs are valid and finish; only tie-breaks may differ
    expect(simulate(l, other).metrics.timedOut).toBe(false);
  });
});

// ---------- invariants ----------

describe('invariants', () => {
  it('never puts two agents on one cell, and agents never leave the grid', () => {
    const l = room(14, 9);
    addExit(l, 'A', 0, 4, 1);
    addExit(l, 'B', 13, 4, 2);
    for (let y = 1; y <= 7; y++) for (let x = 3; x <= 10; x++) l.cells[y][x] = { type: 'SPAWN' };
    const base = createScenario(l, { name: 'x', seed: 11, occupantCount: 40 });
    for (let t = 0; t <= 60; t++) {
      const { agents } = simulateDetailed(l, { ...base, maxTicks: t });
      const seen = new Set<number>();
      for (const a of agents) {
        if (a.status === 'exited') continue;
        const key = a.y * l.width + a.x;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(a.x).toBeGreaterThan(0);
        expect(a.x).toBeLessThan(l.width - 1);
      }
    }
  });

  it('agents facing each other in a corridor never cross', () => {
    const l = room(9, 3);
    addExit(l, 'A', 0, 1);
    addExit(l, 'B', 8, 1);
    const { agents } = simulateDetailed(l, at([[3, 1], [5, 1]], { maxTicks: 1 }));
    // each steps toward its own nearer exit; neither ever ends up on the other's side
    expect(agents[0].x).toBeLessThan(agents[1].x);
  });

  it('metrics line up: remainingOverTime counts down and matches exitedPerTick', () => {
    const l = room(9, 9);
    addExit(l, 'X', 4, 4, 2);
    const { result, exitedPerTick } = simulateDetailed(
      l,
      at([[3, 4], [5, 4], [4, 3], [4, 5], [2, 4], [6, 4]]),
    );
    const rem = result.metrics.remainingOverTime;
    expect(rem[0]).toBe(6);
    expect(rem[rem.length - 1]).toBe(0);
    for (let t = 1; t < rem.length; t++) expect(rem[t]).toBe(rem[t - 1] - exitedPerTick[t]);
    expect(rem).toHaveLength(result.metrics.clearanceTicks + 1);
  });
});

// ---------- scenario helpers ----------

describe('scenario helpers', () => {
  function spawnRoom() {
    const l = room(10, 6);
    addExit(l, 'A', 0, 2);
    for (let y = 1; y <= 4; y++) for (let x = 5; x <= 8; x++) l.cells[y][x] = { type: 'SPAWN' };
    return l;
  }

  it('pickStartPositions is seeded, distinct and only uses SPAWN cells', () => {
    const l = spawnRoom();
    const a = pickStartPositions(l, 10, 5);
    const b = pickStartPositions(l, 10, 5);
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => `${p.x},${p.y}`)).size).toBe(10);
    expect(a.every((p) => l.cells[p.y][p.x].type === 'SPAWN')).toBe(true);
    expect(pickStartPositions(l, 10, 6)).not.toEqual(a);
  });

  it('pickStartPositions throws when there are too few SPAWN cells', () => {
    expect(() => pickStartPositions(spawnRoom(), 17, 1)).toThrow(/only 16 SPAWN/);
  });

  it('deriveScenario keeps the exact start positions', () => {
    const l = spawnRoom();
    const base = createScenario(l, { name: 'base', seed: 9, occupantCount: 8 });
    const variant = deriveScenario(base, 'blocked', { blockedExits: ['A'], extraObstacles: [] });
    expect(variant.startPositions).toEqual(base.startPositions);
    expect(variant.startPositions).not.toBe(base.startPositions);
    expect(variant.seed).toBe(base.seed);
    expect(variant.disruptions.blockedExits).toEqual(['A']);
    expect(base.disruptions.blockedExits).toEqual([]);
  });

  it('validateScenario rejects bad scenarios', () => {
    const l = spawnRoom();
    expect(() => validateScenario(l, at([[5, 1], [5, 1]]))).toThrow(/two agents/);
    expect(() => validateScenario(l, at([[0, 1]]))).toThrow(/not walkable/);
    expect(() => validateScenario(l, at([[0, 2]]))).toThrow(/EXIT/);
    expect(() => validateScenario(l, at([[99, 1]]))).toThrow(/outside/);
    expect(() => validateScenario(l, at([[5, 1]], { occupantCount: 3 }))).toThrow(/occupantCount/);
    expect(() => validateScenario(l, at([[5, 1]], { maxTicks: Infinity }))).toThrow(/maxTicks/);
    expect(() => validateScenario(l, at([[5, 1]]))).not.toThrow();
  });
});

// ---------- metrics and comparison ----------

describe('metrics helpers', () => {
  it('normalizeHeat scales to 0..1 and survives all-zero grids', () => {
    expect(normalizeHeat([[0, 2], [4, 1]])).toEqual([[0, 0.5], [1, 0.25]]);
    expect(normalizeHeat(emptyHeat(3, 2))).toEqual(emptyHeat(3, 2));
  });
});

describe('comparison', () => {
  it('pctChange handles zero baselines', () => {
    expect(pctChange(100, 150)).toBe(50);
    expect(pctChange(100, 50)).toBe(-50);
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(0, 5)).toBe(Infinity);
  });

  it('compareRuns is scenario minus baseline', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2);
    const base = simulate(l, at([[5, 2]])).metrics;
    const slow = simulate(l, at([[5, 2]], { disruptions: { blockedExits: ['A'], extraObstacles: [] } })).metrics;
    const cmp = compareRuns(base, slow);
    expect(cmp.unreachableDelta).toBe(1);
    expect(cmp.clearanceDelta).toBe(-5); // nobody can leave, so the run is empty at tick 0
    expect(cmp.baseline).toBe(base);
    expect(cmp.scenario).toBe(slow);
  });
});

// ---------- stepwise API & trace tests ----------

describe('stepwise simulation API', () => {
  it('stepping produces the exact same result as full simulation', () => {
    const l = room(9, 5);
    addExit(l, 'A', 0, 2);
    addExit(l, 'B', 8, 2);
    const s = at([[2, 2], [6, 2], [7, 2]]);

    const full = simulateDetailed(l, s);
    const withTrace = simulateDetailed(l, s, { recordTrace: true });

    expect(withTrace.result.metrics).toEqual(full.result.metrics);
    expect(withTrace.frames).toBeDefined();
    expect(withTrace.frames!.length).toBe(full.result.metrics.clearanceTicks + 1);
    expect(withTrace.frames![0].tick).toBe(0);
    expect(withTrace.frames![full.result.metrics.clearanceTicks].remaining).toBe(0);
  });
});

