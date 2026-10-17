# ExitLab: Project Flow (step by step, phase by phase)

This is the full plan for building ExitLab, from idea to demo. It collects everything we discussed: the problem, the solution, the features, the tech stack, every phase with its steps, the rules of the simulation, the MVP cut, the demo story, the risks and the team split.

How this file relates to the others:

- `flow.md` (this file): the plan. What to build, in what order, and how to know it is done.
- `progress.md`: the live status. What is actually done right now. Claude reads it before every phase and updates it after every piece of work.
- `SPEC.md`: the exact simulation rules (v0.2). If code and spec disagree, fix one of them.

Status key used below: **[DONE]** finished and tested, **[PARTLY]** some of it exists, **[TODO]** not started. Statuses match `progress.md` as of 2026-10-17.

---

## 0. One-page summary

| Item | Answer |
|---|---|
| Name | ExitLab |
| What | A browser-based evacuation stress-testing simulator |
| Core question | "What if this exit is blocked?" |
| How it works | Draw a building on a grid, place people, run a seeded simulation, disrupt it, compare with a baseline, read a plain-language explanation |
| Engine | Rule-based: BFS distance map, step toward lower distance, one agent per cell, per-exit throughput limit, seeded RNG |
| Not | Not machine learning, not a safety certification, not validated crowd physics |
| Stack | React + TypeScript (Vite), HTML Canvas, Recharts, localStorage + JSON, Vitest, Vercel or Netlify |
| Effort | About 7 to 9 weeks for one person; 3 to 4 people can split the work |
| MVP | Phases 1 to 4 (editor, simulation, blocked-exit testing, heatmap, comparison) |
| Biggest risk | Trying to build all nine features. Build the simulator core first, the explanation engine second |

---

## 1. Problem statement

**The problem.** Buildings such as colleges, schools, hospitals, offices and shopping complexes depend on evacuation plans. Most people judge a plan by counting exits. But a layout that looks safe under normal conditions can fail badly when:

- one exit is locked or blocked,
- a corridor is obstructed, or
- too many people converge on one narrow passage.

Counting exits does not show how people will actually move, where queues will form, or which areas may be cut off from every exit.

**Who faces this problem**

- Small schools, colleges, clinics and shops that cannot afford specialist evacuation consultants or software.
- Facility managers and event organizers who need a quick first check of a layout.
- Teachers and trainers who have no visual way to demonstrate bottlenecks in safety courses.
- Architecture and civil engineering students who want to compare layout alternatives.

---

## 2. Proposed solution

ExitLab lets a user build a simplified digital version of a building, simulate people moving to the exits, introduce disruptions, and see exactly where and why the evacuation breaks down.

**The user flow (the heart of the product is the rerun loop: change something, same seed, compare)**

1. **Create a layout.** Draw walls, rooms, corridors, doors, exits and occupant starting areas on a grid, or load a preset building.
2. **Configure a scenario.** Set the number of occupants, block exits, close corridors or add obstacles.
3. **Simulate.** Occupants are animated as individual agents that find routes to the nearest available exit. Each exit has limited throughput, so queues form at doors.
4. **Analyze and compare.** ExitLab highlights congestion, flags people who cannot reach any exit, explains the cause of each bottleneck, and compares the result against a baseline.

**How it answers each problem**

| Problem | ExitLab's answer |
|---|---|
| Exit count does not show real behavior | Agent-based simulation shows actual movement and queues |
| Hidden single points of failure | One-click blocked-exit testing with instant re-simulation |
| Unclear where danger lies | Congestion heatmap and unreachable-occupant detection |
| Vague claims that a layout is "better" | Fixed starting conditions and measured before/after metrics |
| Specialist tools are costly and complex | Free, no-install, runs in any browser |

---

## 3. Key features

| # | Feature | Priority | What it is |
|---|---|---|---|
| 1 | Interactive floor-plan editor | Essential | Grid drawing of walls, corridors, doors, exits, obstacles and occupant start areas. Save/load as JSON. Preset buildings. |
| 2 | Dynamic occupant simulation | Essential | Each occupant is an agent that picks a reachable exit and moves under collision rules (one agent per cell, fair conflict resolution). Exits have limited throughput so queues form naturally. |
| 3 | Emergency scenario controls | Essential | Block an exit, close a corridor, add an obstacle or change occupant density without rebuilding the layout. Routes recalculate immediately. |
| 4 | Congestion heatmap and bottleneck detection | Essential | Shows where occupants accumulate or wait, and flags areas with no reachable exit. |
| 5 | Baseline-versus-disruption comparison | Essential | Compares clearance duration, occupants remaining over time, maximum queue length, waiting times and unreachable occupants, with charts. |
| 6 | Bottleneck explanation engine | High-value | Plain-language cause for each problem, derived from simulation data: door capacity, merging junction, one-cell-wide corridor, disconnected region. |
| 7 | Alternative-layout analysis | High-value | Change an exit or corridor, rerun with identical starting positions and settings, report what improved or worsened. |
| 8 | Repeatable scenarios | High-value | A seeded random generator means saved scenarios replay identically, so comparisons are fair. |
| 9 | Scenario report | Optional | Summary of assumptions, conditions, results, bottlenecks and limitations. |

---

## 4. Tech stack and architecture

| Layer | Choice | Why |
|---|---|---|
| UI | React + TypeScript (Vite) | Fast setup, typed state for the editor |
| Drawing | HTML Canvas | Handles hundreds of moving agents |
| Engine | Plain TypeScript module, no React inside | Testable alone, can move to a Web Worker later |
| Charts | Recharts | Quick line and bar comparisons |
| Storage | localStorage + JSON import/export | No backend needed |
| Tests | Vitest | BFS, collisions, determinism |
| Hosting | Vercel or Netlify | Free static hosting |
| Optional | Supabase accounts and cloud saves, LLM rewording of explanations | Only after the MVP works |

**Suggested folders**

```
exitlab/
  engine/        grid, bfs, rng, scenario, simulate, metrics, compare (pure TS, no React)   [exists]
  editor/        canvas floor-plan editor, tools, undo, presets
  scenario/      scenario panel, disruptions UI, saved scenarios
  results/       heatmap, charts, comparison view, explanations
  render/        canvas drawing of grid, agents, heat
  SPEC.md  progress.md  flow.md
  package.json  tsconfig.json
```

**Architecture rules**

1. Keep the engine independent of React. If it lives inside components, testing and later speedups become painful.
2. Fixed time step. The simulation runs in discrete ticks. Drawing happens at the screen's frame rate, separately.
3. Determinism is a feature. All randomness goes through one seeded generator (mulberry32). No `Math.random()` in `engine/`.
4. Fair conflict resolution. When two agents want the same cell, pick with the seeded RNG, never "first in the list wins".
5. Recalculate the BFS distance map only when the layout or exit states change, never every tick.
6. Performance target: a few hundred agents on a 100x100 grid should be easy.

**On AI.** The core simulator is deliberately rule-based, not machine learning, so every result is explainable and repeatable. Optionally, a language model could rephrase the engine's findings into friendlier sentences, but it would only reword facts the simulation already computed.

---

## 5. Simulation rules (short form; full text in SPEC.md)

**World.** 2D grid, origin top-left, x right, y down. One cell is 0.5 m x 0.5 m, one tick is 0.5 s, an agent moves at most one cell per tick (about 1 m/s). 4-directional movement, no diagonals.

**Cell types.** `EMPTY` (walkable), `WALL` (not), `DOOR` (walkable, no flow limit unless it is an exit), `EXIT` (agents leave; has `capacity` per tick), `OBSTACLE` (like a wall), `SPAWN` (occupant start area, walkable). A blocked exit behaves like a wall.

**Routing.** BFS outward from every open exit gives each cell its step distance to the nearest exit. Cells never reached are `Infinity`: cut-off areas. Agents standing there are `stuck` from tick 0.

**Tick procedure (fixed order)**

1. Propose: each active agent looks at its free 4-neighbours with strictly lower distance and proposes the lowest (ties broken by the seeded RNG).
2. Resolve conflicts: one random winner per normal cell; losers wait.
3. Exit throughput: at an exit cell up to `capacity` randomly chosen proposers pass per tick; the rest wait.
4. Move: winners move; those entering an exit are `exited`.
5. Record metrics and heat.
6. Stop when nobody is moving or waiting, or at `maxTicks` (default 3000 = 25 minutes).

**Settled details (SPEC section 10).** Tick 0 is the initial state and the first processed tick is 1. All decisions use the start-of-tick snapshot (so a follower waits a tick behind a leader). Any active agent that does not advance is `waiting`, adds to `waitTicks` and to heat. Stuck agents occupy their cell. Scenarios are validated and the engine throws on invalid input.

**Metrics.** `clearanceTicks`, `remainingOverTime[]`, `maxQueueLength` (waiting agents within 3 walking steps of an exit), `avgWait`, `maxWait`, `unreachableCount`, `heat[y][x]`, `exitUsage[exitId]`. Comparison is scenario minus baseline, absolute and percent.

**Known limits (shown in the UI).** Grid-based, 4-neighbour, one agent per cell. No panic behaviour, no speed differences, no smoke or fire, no stairs. Results are comparative educational estimates, not predictions or safety certification.

---

## 6. Phases at a glance

| Phase | Name | Time (one person) | Status |
|---|---|---|---|
| 0 | Setup | 2 to 3 days | [PARTLY] data model and spec done; app scaffold and git missing |
| 1 | Floor-plan editor | 1 week | [TODO] |
| 2 | Simulation core | 1.5 to 2 weeks | [DONE] engine; [TODO] play/pause/step UI |
| 3 | Scenarios and disruptions | 1 week | [PARTLY] engine done; UI todo |
| 4 | Analysis | 1 week | [PARTLY] metrics and comparison math done; heatmap and charts todo |
| 5 | Explanation engine and layout comparison | 1 week | [TODO] |
| 6 | Polish and report | 1 week | [TODO] |
| 7 | Optional extras | open | [TODO] |

Total is roughly 7 to 9 weeks for one person. The MVP is Phases 1 to 4.

**How each phase is run (the working loop with Claude)**

1. Claude reads `progress.md` first.
2. Do the steps of the phase in order, running tests as you go.
3. Check the phase's "done when" list.
4. Claude updates `progress.md` (status, decisions, gaps, next steps) and `SPEC.md` if any rule changed.
5. Only then start the next phase.

---

## Phase 0: Setup (2 to 3 days) [PARTLY]

**Goal.** A working project skeleton, a defined data model, and the written rules before any simulation code.

**Steps**

1. [TODO] Create the Vite + React + TypeScript project. Keep `engine/` as a plain folder with no React imports. (Run the installs on your own machine.)
2. [TODO] Create the folder structure: `engine/`, `editor/`, `scenario/`, `results/`, `render/`.
3. [TODO] `git init`, add a `.gitignore` (at least `node_modules`, `dist`), make the first commit.
4. [DONE] Define the data model in `engine/types.ts`: Cell (empty, wall, door, exit, obstacle, spawn), ExitDef, Layout, Disruptions, Scenario, Agent, RunMetrics, RunResult, Comparison.
5. [DONE] Write the one-page rules spec (`SPEC.md`): one agent per cell, tick length, exit throughput, determinism, metrics.
6. [DONE] Configure Vitest and TypeScript (`package.json`, `tsconfig.json`).

**Done when:** `npm run dev` shows a page, `npm test` runs, the repo has a first commit, and `SPEC.md` matches the types.

---

## Phase 1: Floor-plan editor (1 week) [TODO]

**Goal.** Let a user draw a building on a canvas grid and save it.

**Steps**

1. Canvas grid component: draws `Layout.cells`, handles mouse and touch, maps pixels to cells.
2. Tools: wall, door, exit, obstacle, occupant area (SPAWN), erase. Dragging paints many cells. Each placed exit gets an id (A, B, C...) and a default `capacity`.
3. Keep `Layout.exits` in sync with `EXIT` cells (add on place, remove on erase, unique ids). This also closes a known gap: the engine does not validate that EXIT cells match `layout.exits`.
4. Exit properties panel: edit capacity (integer, 0 or more) per exit.
5. Grid size controls (width and height) with sane limits.
6. Save and load: JSON export, JSON import (validate before loading), autosave to localStorage.
7. Undo and redo (history stack of layout snapshots or strokes), and a clear-all button with confirmation.
8. Build 2 to 3 preset buildings: classroom block, small clinic, shop.
9. **Demo preset:** at least one preset where blocking a single exit visibly breaks the evacuation (long queue or cut-off region). The 60-second demo depends on it.
10. Visible note in the UI: cell size and tick assumptions, and "comparative estimate, not a safety certification".

**Edge cases to test early**

- A doorway one cell wide.
- An enclosed room with no exit.
- Agents spawning on top of each other (SPAWN cells are distinct, the engine rejects duplicates).
- Exit placed in an interior doorway (not only on the outer wall).

**Done when:** you can draw a floor plan, save it, reload it, undo mistakes, and load any preset.

---

## Phase 2: Simulation core (1.5 to 2 weeks) [DONE engine / TODO UI]

**Goal.** Agents walk to exits under the SPEC rules, deterministically, with queues forming at exits. This is the most important phase: budget more time here than for the UI, because collision and throughput logic is where bugs hide.

**Engine steps (all [DONE])**

1. BFS distance map from all open exits (`engine/bfs.ts`).
2. Seeded RNG with tie-breaks (`engine/rng.ts`).
3. Place agents from SPAWN cells with the seeded RNG and store the positions in the scenario (`engine/scenario.ts`).
4. Tick loop: propose, resolve conflicts, apply exit throughput, move, record, stop (`engine/simulate.ts`).
5. Metrics and comparison helpers (`engine/metrics.ts`, `engine/compare.ts`).
6. Unit tests (34 passing), including the full SPEC section 9 checklist:
   - single room, one exit, one agent: clearance equals the distance
   - enclosed room: all agents stuck, no crash, no infinite loop
   - two agents want one cell: exactly one moves, the loser's `waitTicks` increases
   - capacity 1 with 10 agents: at most 1 exits per tick
   - blocking an exit changes the distance map and agents reroute
   - same seed gives identical results, a different seed may differ
   - an agent next to an exit leaves on tick 1

**UI steps ([TODO])**

7. Engine addition for animation: the engine currently returns only the final state, so add either a per-tick position trace option on `simulateDetailed` or a step-wise API (`createSim` and `step()`). Decide this first.
8. Canvas renderer: draw cells, exits, and agents from the current tick. Draw at the screen frame rate, independent of the tick rate.
9. Controls: play, pause, step one tick, restart, speed control (for example 0.5x, 1x, 2x, 5x), and a tick scrubber if a trace is stored.
10. Live counters: people remaining, people exited, current tick and elapsed simulated time (ticks x 0.5 s).
11. Seed field with a "new random seed" button; the seed is saved in the scenario.
12. Add performance checks: a few hundred agents on 100x100 stays smooth. If not, consider a Web Worker for the engine.

**Done when:** you can load a preset, press play and watch agents queue at exits, and re-running with the same seed gives the identical animation.

---

## Phase 3: Scenarios and disruptions (1 week) [PARTLY]

**Goal.** Break the building in one click and rerun instantly.

**Engine side [DONE]:** blocked exits act as walls, extra obstacles, stuck detection from `Infinity` distance, `deriveScenario` keeps the exact same start positions for what-if variants. There is no separate flood-fill function; unreachable cells come from BFS.

**Steps**

1. [TODO] Scenario panel: occupant count, seed, max time.
2. [TODO] Block or unblock an exit with a toggle per exit.
3. [TODO] Close a corridor or add an obstacle by clicking cells (stored in `Disruptions.extraObstacles`, drawn in a different colour).
4. [TODO] Change occupant count; regenerate start positions from the seed, then reuse them for every variant.
5. [TODO] "Baseline" versus "What-if" scenarios held side by side, always created with `deriveScenario` so starting positions match.
6. [TODO] Instant rerun: recompute the distance map and rerun on every change. Run in a worker or debounce if slow.
7. [TODO] Mark unreachable regions and stuck occupants visibly (for example a hatched overlay and red agents), with a counter.
8. [TODO] Save and load scenarios (JSON), including seed, positions and disruptions.
9. [TODO] Friendly handling of engine errors (invalid scenario) in the UI.

**Edge cases to test:** exit blocked with people already beside it, an obstacle placed on someone's start cell (that person becomes stuck), all exits blocked.

**Done when:** blocking an exit visibly changes routes and queues, and cut-off people are marked.

---

## Phase 4: Analysis (1 week) [PARTLY]

**Goal.** Turn a run into numbers and pictures, and compare baseline with scenario.

**Metrics (engine [DONE]):** clearance time, remaining over time, max queue length, average and max wait, unreachable count, heat per cell, exit usage.

**Steps**

1. [TODO] Congestion heatmap: draw `normalizeHeat(metrics.heat)` as a colour overlay on the canvas (accumulated waiting per cell). Add a legend and an on/off toggle.
2. [TODO] Results summary panel with the key numbers for the run, with plain units (seconds and minutes as well as ticks).
3. [TODO] Recharts line chart: people remaining over time, baseline and scenario overlaid.
4. [TODO] Recharts bar charts: exit usage per exit, wait statistics, queue length.
5. [TODO] Baseline-versus-scenario comparison view using `compareRuns`: clearance change (absolute and percent), max queue change, unreachable change, for example "clearance time up 38%, longest queue from 12 to 31".
6. [TODO] Handle special cases in the display: timed-out runs, zero baselines (percent is `Infinity`), runs where nobody can reach an exit.
7. [TODO] Add an exit-usage delta helper (needed for rerouting text in Phase 5).

**Done when:** after a run you can see where people waited, read the key numbers, and compare any scenario against the baseline with charts.

---

## Phase 5: Explanation engine and layout comparison (1 week) [TODO]

**Goal.** Tell the user why the evacuation broke down, in plain language, using only computed data. Build this only after the metrics are solid. It sounds like AI, but it is a set of rules over simulation data.

**Rules (from SPEC section 7)**

| Rule | Condition | Example sentence |
|---|---|---|
| Door capacity | An exit with high `exitUsage`, a long queue within 3 cells, and capacity reached on most ticks | "Exit A is the bottleneck: it was at its limit on most ticks and up to 31 people queued near it." |
| Merge junction | A cell with 3 or more walkable neighbours on the shortest paths of agents from 2 or more regions, with high heat | "Three corridors merge at this junction and people pile up here." |
| Narrow corridor | A run of 3 or more cells, each with walls on two opposite sides (width 1), with high heat | "This one-cell-wide corridor limits flow." |
| Disconnected region | The reachability set excludes cells that contain agents | "12 people are in an area with no route to any open exit." |
| Rerouting | Compare `exitUsage` against the baseline | "Exit B is blocked, so 140 people rerouted to Exit A." |

**Steps**

1. [TODO] Decide thresholds ("high", "most ticks") and write them down in `SPEC.md`.
2. [TODO] Collect the extra data the rules need (per-exit capacity-reached counts per tick, shortest-path region membership, corridor and junction detection).
3. [TODO] Implement each rule as a small pure function returning a finding (type, location, severity, numbers).
4. [TODO] Rank findings by severity and turn them into sentences from templates.
5. [TODO] Show findings in a panel and highlight the location on the canvas when one is selected.
6. [TODO] Unit tests with hand-built layouts that trigger exactly one rule each.
7. [TODO] Alternative-layout mode: edit the layout (move or add an exit, widen a corridor), rerun with the same seed and the same start positions, and report which metrics improved or got worse.
8. [TODO] Optional only after all of this works: LLM rewording of the sentences. It may only reword facts already computed.

**Done when:** blocking an exit produces a correct one-or-two-sentence explanation, and changing the layout produces a clear improved/worse report.

---

## Phase 6: Polish and report (1 week) [TODO]

**Steps**

1. [TODO] Scenario report export: a print-friendly page or PDF with assumptions, conditions, results, charts, bottlenecks and limitations.
2. [TODO] Tutorial overlay for first-time users.
3. [TODO] Error handling and empty states: bad JSON, invalid scenario, no exits, no occupants.
4. [TODO] Responsive layout (usable on a laptop and a tablet at least).
5. [TODO] Accessibility basics: keyboard controls for play/pause/step, labels, colour choices that do not rely on colour alone, sufficient contrast.
6. [TODO] Visible honesty note throughout: "comparative estimate, not a safety certification", plus a Known Limits section.
7. [TODO] Demo script (see section 9), README with setup and limitations.
8. [TODO] Deploy to Vercel or Netlify and test the live link.

**Done when:** a stranger can open the link, follow the tutorial, run the demo story, and export a report.

---

## Phase 7: Optional extras [TODO]

Only after the MVP works:

- Supabase accounts and cloud-saved buildings.
- LLM rewording of the engine's explanations.
- Fire or smoke spread.
- Multiple floors and stairs.
- Different occupant speeds and groups.
- Diagonal movement.

Each of these changes the rules, so write the change into `SPEC.md` first and add tests before coding.

---

## 7. MVP if time is short

Do Phases 1 to 4 only: editor, simulation, blocked-exit testing, heatmap and comparison. A simple rule-based "one-line cause" (for example the rerouting sentence and the disconnected-region sentence) can replace the full explanation engine. That is already a complete, demoable project.

---

## 8. Testing plan

- **Engine (Vitest, exists):** distance maps, single-room evacuation, blocked path, enclosed room, two agents one cell, capacity limits, rerouting, determinism, invariants (no two agents on one cell), scenario validation, comparison maths. 34 tests pass.
- **Add as the app grows:** layout JSON import validation, editor undo/redo logic, exit/EXIT-cell sync, explanation rules (one hand-built layout per rule), larger-grid performance, non-square grids.
- **Edge cases to keep covered:** exit blocked with people already beside it, enclosed room with no exit, doors one cell wide, agents spawning on top of each other, all exits blocked, zero occupants, maxTicks reached.
- **Before every release:** run all tests, typecheck, and play the demo script once by hand.

---

## 9. The 60-second demo story

1. **Baseline.** Load the demo preset and press play. People leave through two exits quickly. Point at the clearance time.
2. **Break it.** Block one exit with a single click. Rerun instantly with the same seed.
3. **See it.** The heatmap lights up at the remaining door. A group in one wing is flagged as cut off if the layout allows it.
4. **Read it.** The explanation says in plain language what happened, for example "Exit B is blocked, so 140 people reroute to Exit A, whose capacity limit creates the queue."
5. **Fix it.** Add or widen an exit in the editor.
6. **Compare.** Rerun with the same seed and show the measured improvement, for example "clearance time down 31%, longest queue from 31 to 9".
7. **Be honest.** Close with the limits: educational, comparative, not a safety certification.

---

## 10. Innovation and differentiation (for the pitch)

Professional tools such as Pathfinder, Legion and buildingEXODUS already simulate evacuations. The pitch is "accessible, instant, explained", not "new simulation".

1. **Instant failure testing.** Built around "what if this fails?": block an exit or corridor and re-run in seconds without rebuilding the model.
2. **Explains the bottleneck.** Most tools give a heatmap and expect an expert to interpret it. ExitLab says the cause in plain language.
3. **Fair comparison.** Starting positions and assumptions are held constant; changes are reported as measured differences, not vague claims.
4. **Reproducible scenarios.** Anyone can save a scenario and replay it exactly, so results are easy to verify and share.
5. **Open to everyone.** Free, runs in a browser, needs no training, and is upfront about its assumptions and limits.

---

## 11. Risks and how to handle them

| Risk | What to do |
|---|---|
| Trying to build all nine features | Follow the phase order; ship the MVP (Phases 1 to 4) before Phase 5 |
| Collision and throughput bugs | Keep the engine tests green; add a test for every bug found; budget extra time in Phase 2 |
| Explanation engine sounds like AI but is rules | Build it only after metrics are solid; present it honestly as rule-based |
| Competition from existing tools | Pitch accessibility, instant what-if testing and plain-language explanations |
| Misuse as a safety certificate | Show the limits note everywhere and in the report |
| Performance with many agents | Build the distance map once per run; consider a Web Worker; test 100x100 with a few hundred agents |
| Engine tangled with the UI | Keep `engine/` free of React and `Math.random()` |

---

## 12. Team split (if there are 3 to 4 people)

| Person | Focus | Phases |
|---|---|---|
| A | Editor and UI shell | 0, 1, 6 |
| B | Engine and tests | 2, 3 (engine) |
| C | Analysis, charts and explanations | 4, 5 |
| D (optional) | Presets, report, tutorial, deploy, QA | 1, 6 |

The engine API in `engine/index.ts` is the contract between the engine and everyone else. Agree on changes to it before changing it.

---

## 13. Engine API quick reference (what the UI will call)

```ts
import {
  createScenario, deriveScenario, validateScenario, pickStartPositions,
  simulate, simulateDetailed,
  compareRuns, runComparison, pctChange,
  buildDistanceMap, normalizeHeat,
} from './engine';

// 1. Build a baseline scenario (positions fixed from the seed)
const baseline = createScenario(layout, { name: 'Baseline', seed: 42, occupantCount: 120 });

// 2. A what-if variant with the exact same people and starting positions
const blockedB = deriveScenario(baseline, 'Exit B blocked',
  { blockedExits: ['B'], extraObstacles: [] });

// 3. Run both and compare
const cmp = runComparison(layout, baseline, blockedB);
// cmp.clearanceDelta, cmp.clearanceDeltaPct, cmp.maxQueueDelta, cmp.unreachableDelta
// cmp.baseline / cmp.scenario hold the full RunMetrics (heat, exitUsage, remainingOverTime...)

// 4. Heatmap values for drawing
const heat01 = normalizeHeat(cmp.scenario.heat);
```

Gap to close in Phase 2 UI work: add a per-tick trace or step API so the canvas can animate.

---

## 14. Next actions (as of 2026-10-17)

1. Phase 0 leftovers: scaffold the Vite + React + TypeScript app around `engine/` and run `git init` (you run the npm installs locally).
2. Add the per-tick trace or step API to the engine.
3. Start Phase 1: the canvas editor, with the demo preset as early as possible.
4. Keep `progress.md` updated after every piece of work.
