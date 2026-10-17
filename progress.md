# ExitLab progress

> **For Claude: read this file first, before starting any phase.** It is the source of truth for project status.
> Update it at the end of every piece of work (what changed, what is next, any new decisions). Do not re-examine every file; trust this file and open only what the next step touches.

Last updated: 2026-10-17 (Phase 2 engine complete)

## What ExitLab is

Browser-based evacuation stress-testing simulator. Grid building, agents walk to the nearest open exit by BFS distance, exits have throughput limits so queues form. User blocks exits or adds obstacles, reruns with the same seed, and compares against a baseline. Results are comparative educational estimates, not safety certification. Rule-based and deterministic, no ML.

Planned stack: React + TypeScript (Vite), HTML Canvas, Recharts, localStorage + JSON import/export, Vitest, static hosting. The engine is plain TypeScript with no React inside.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Setup, data model, rules spec | Partly done: `types.ts` and `SPEC.md` written. **No Vite/React app, no git repo yet.** |
| 1 | Floor-plan editor (canvas, tools, JSON save/load, undo, presets) | Not started |
| 2 | Simulation core | **Engine done and tested.** UI controls (play/pause/step/speed/live counter) not started, they belong with the UI |
| 3 | Scenarios and disruptions | Engine side done (blocked exits, extra obstacles, stuck detection, `deriveScenario`). UI controls not started. No separate flood-fill function: unreachable cells come from BFS `Infinity` |
| 4 | Analysis (metrics, heatmap, comparison charts) | Metrics + comparison math done in engine. Heatmap drawing, Recharts charts, comparison view not started |
| 5 | Explanation engine, layout comparison | Not started (rules are described in SPEC section 7) |
| 6 | Polish and report | Not started |
| 7 | Optional extras | Not started |

## Files (all in `/home/claude`)

| File | Purpose | State |
|---|---|---|
| `SPEC.md` | Rules spec, now v0.2. Section 10 holds decisions made while coding | Current, matches the code |
| `progress.md` | This file | Keep updated |
| `package.json` | Scripts `test` (vitest run) and `typecheck` (tsc --noEmit); devDeps typescript, vitest | Written |
| `tsconfig.json` | strict, ES2022, Bundler resolution, includes `engine/**/*.ts` | Written |
| `engine/types.ts` | Data model: Cell, ExitDef, Layout, Disruptions, Scenario, Agent, RunMetrics, RunResult, Comparison (`TickMetrics` is declared but unused) | Done |
| `engine/rng.ts` | mulberry32 `createRng`, `randInt`, `shuffle` | Done |
| `engine/bfs.ts` | `isWalkable`, `buildDistanceMap` (blocked exits act as walls) | Done |
| `engine/scenario.ts` | `pickStartPositions`, `createScenario`, `deriveScenario`, `validateScenario`, `DEFAULT_MAX_TICKS` (3000) | Done |
| `engine/simulate.ts` | `simulate` and `simulateDetailed` (tick loop per SPEC 4) | Done |
| `engine/metrics.ts` | `emptyHeat`, `summarizeWaits`, `normalizeHeat` | Done |
| `engine/compare.ts` | `pctChange`, `compareRuns`, `runComparison` | Done |
| `engine/index.ts` | Barrel export of the public engine API | Done |
| `engine/engine.test.ts` | RNG + distance-map tests (original file, 6 tests) | Passing |
| `engine/simulate.test.ts` | Simulation, scenario, metrics, comparison tests (28 tests) | Passing |

## Verification (last run)

- **34 of 34 tests pass** (`bun test engine`).
- `tsc --strict` on all engine source files: clean.
- No `Math.random()` calls anywhere in `engine/`.
- SPEC section 9 checklist: 7 of 7 covered.
- Hand-checked oracle in tests: two exits, blocking B moves clearance from 3 to 8 ticks (+5, +166.7%), usage {A:1,B:2} becomes {A:3,B:0}.

## Environment notes (important)

- **The npm registry is blocked by this session's network policy** (`registry.npmjs.org` returns 403 through the proxy; direct DNS also fails). `npm install` does not work here, so `node_modules` does not exist.
- Workaround used: **`bun test engine`** runs the vitest-style tests unchanged (Bun rewrites `vitest` imports). Typecheck with the global compiler: `tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --lib ES2022 engine/<each source file>`. Test files are excluded from this because the `vitest` types are not installed.
- On the user's own machine, `npm install && npm test && npm run typecheck` should work as written.
- Do not try to get around the network block. If a phase needs npm packages (Vite, React, Recharts), say so and tell the user to run the install locally.

## Decisions and deviations from the original spec

All recorded in `SPEC.md` section 10. The ones that matter most:

1. **Exit capacity** is applied to all proposers at an EXIT cell (up to `capacity` pass per tick). The original "one winner per cell" rule would have made capacity above 1 meaningless.
2. **Bug fixed in the supplied `bfs.ts`:** a blocked exit used to be walkable, so an interior blocked doorway still worked as a passage. It now acts as a wall (SPEC section 1 says it should). Covered by a test.
3. Waiting includes being blocked by an occupied cell, not only losing a conflict.
4. Follower lag: an agent behind another waits a tick before entering the freed cell (snapshot rule).
5. `maxQueueLength` uses walking distance 1 to 3 from the exit (per-exit BFS), not straight-line distance.
6. Heat stored raw; normalise at draw time.
7. Engine throws on invalid scenarios rather than guessing.

## Known gaps and things to watch

- Engine returns only final state and aggregates. **There is no per-tick position trace**, so the UI cannot replay frames yet. Phase 2 UI work needs either a `trace` option on `simulateDetailed` or a step-wise engine (`createSim` / `step()`). Decide this at the start of the UI work.
- `Comparison` has only four deltas (clearance, clearance %, max queue, unreachable). Rerouting needs an `exitUsage` delta helper (Phase 5).
- No layout validation (e.g. exit cell vs `layout.exits` mismatch, exits not on EXIT cells, overlapping ids).
- No tests for non-square or large grids, or performance (target: a few hundred agents on 100x100).
- `TickMetrics` type is unused; remove it or use it for the trace.
- No git repository yet.

## Next steps (in order)

1. **Phase 0 leftovers:** scaffold the Vite + React + TS app around `engine/` (user must run the installs locally), `git init`, `.gitignore`.
2. **Engine addition for the UI:** per-tick trace or step API so the canvas can animate and scrub.
3. **Phase 1:** canvas floor-plan editor (wall, door, exit, obstacle, spawn, erase), JSON save/load, undo, clear, 2-3 presets. At least one preset where blocking one exit visibly breaks the evacuation (needed for the demo).
4. **Phase 2 UI:** play, pause, step, speed controls, live "people remaining" counter.
5. **Phase 3 UI:** scenario panel (block/unblock exit, add obstacles, occupant count), instant rerun with the same seed.
6. **Phase 4:** heatmap from `normalizeHeat`, Recharts comparison charts.
7. **Phase 5:** explanation rules from SPEC section 7, alternative-layout comparison.

## Change log

- 2026-10-17: Wrote the tick engine (`simulate.ts`), scenario helpers, metrics helpers, comparison, barrel export, and the full SPEC section 9 test suite. Fixed blocked-exit routing in `bfs.ts`. Added SPEC section 10. Created this file.
