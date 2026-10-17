import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { buildDistanceMap } from './bfs';
import type { Cell, Layout } from './types';

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

const none = { blockedExits: [], extraObstacles: [] };

describe('rng', () => {
  it('same seed gives same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('different seed differs', () => {
    expect(createRng(1)()).not.toEqual(createRng(2)());
  });
});

describe('buildDistanceMap', () => {
  it('measures steps to the exit', () => {
    const l = room(7, 5);
    addExit(l, 'A', 0, 2);
    const d = buildDistanceMap(l, none);
    expect(d[2][1]).toBe(1);
    expect(d[2][5]).toBe(5);
  });

  it('enclosed room has Infinity everywhere', () => {
    const l = room(7, 5);
    const d = buildDistanceMap(l, none);
    expect(d[2][3]).toBe(Infinity);
  });

  it('blocking an exit changes the map', () => {
    const l = room(9, 5);
    addExit(l, 'A', 0, 2);
    addExit(l, 'B', 8, 2);
    const before = buildDistanceMap(l, none);
    const after = buildDistanceMap(l, { blockedExits: ['B'], extraObstacles: [] });
    expect(before[2][7]).toBe(1);
    expect(after[2][7]).toBe(7);
  });

  it('extra obstacle cuts off a region', () => {
    const l = room(7, 3);
    addExit(l, 'A', 0, 1);
    const d = buildDistanceMap(l, { blockedExits: [], extraObstacles: [{ x: 3, y: 1 }] });
    expect(d[1][5]).toBe(Infinity);
  });
});
