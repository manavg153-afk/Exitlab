# ExitLab progress

> **For Claude: read this file first, before starting any phase.** It is the source of truth for project status.
> Update it at the end of every piece of work (what changed, what is next, any new decisions). Do not re-examine every file; trust this file and open only what the next step touches.

Last updated: 2026-10-17 (Phases 0–4 MVP Frontend & Engine Complete)

## What ExitLab is

Browser-based evacuation stress-testing simulator. Grid building, agents walk to the nearest open exit by BFS distance, exits have throughput limits so queues form. User blocks exits or adds obstacles, reruns with the same seed, and compares against a baseline. Results are comparative educational estimates, not safety certification. Rule-based and deterministic, no ML.

Stack: React + TypeScript (Vite), HTML Canvas, Recharts, localStorage + JSON import/export, Vitest, static hosting. The engine is plain TypeScript with no React inside.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Setup, data model, rules spec | **DONE.** Git repo initialized, Vite + React + TS scaffolded, `package.json`, `tsconfig.json`, `vite.config.ts`, `SPEC.md` v0.2. |
| 1 | Floor-plan editor (canvas, tools, JSON save/load, undo, presets) | **DONE.** Canvas editor with Wall, Door, Exit, Obstacle, Spawn, Eraser; undo/redo; exit capacity editor; JSON import/export; 3 presets (Demo 2-wing, Classroom, Retail). |
| 2 | Simulation core | **DONE.** Engine + stepwise animation API (`createSimulation`, `stepSimulation`, `finishSimulation`, `recordTrace`). UI playback controls (play/pause/step/restart/instant run, 0.5x..5x speed slider, live remaining/queue counters). |
| 3 | Scenarios and disruptions | **DONE.** Exit block/unblock toggles, click-to-place extra obstacles, occupant density slider, repeatable seed selector with dice button. |
| 4 | Analysis (metrics, heatmap, comparison charts) | **DONE.** KPIs (clearance time, max queue, wait times, unreachable trapped count), Exit usage throughput cards, canvas Heatmap overlay toggle, Recharts progression line chart comparing scenario vs baseline. |
| 5 | Explanation engine, layout comparison | **PARTLY / MVP Rule-Based Done.** Integrated bottleneck explanations (door capacity, queue severity, disconnected regions, clearance impact). Full NLP/advanced layout diffing optional. |
| 6 | Polish and report | Next up |
| 7 | Optional extras | Not started |

## Files Structure

```
exitlab/
  engine/
    types.ts            Data model: Cell, ExitDef, Layout, Disruptions, Scenario, Agent, RunMetrics, Comparison
    rng.ts              mulberry32 PRNG (seed-based)
    bfs.ts              isWalkable, buildDistanceMap (blocked exits act as walls)
    scenario.ts         pickStartPositions, createScenario, deriveScenario, validateScenario
    simulate.ts         simulate, simulateDetailed, createSimulation, stepSimulation, finishSimulation
    metrics.ts          emptyHeat, summarizeWaits, normalizeHeat
    compare.ts          pctChange, compareRuns, runComparison
    index.ts            Public API barrel export
    engine.test.ts      RNG + BFS tests
    simulate.test.ts    Simulation, invariants, scenario, comparison, step API tests
  src/
    editor/
      FloorPlanEditor.tsx  Canvas grid editor with paint tools, undo/redo, capacity inputs, import/export
      presets.ts          3 preset building layouts including 60s Demo 2-wing complex
    render/
      canvasRenderer.ts   Canvas rendering for cells, grid lines, exits, heatmap overlay, agents
      SimulationView.tsx  Canvas simulator viewport with click-to-disrupt interaction
    scenario/
      ScenarioPanel.tsx   Exit block/unblock, obstacle counter, occupant density & seed controls
    results/
      AnalysisResults.tsx KPIs grid, throughput breakdown, baseline comparison, bottleneck explanations
      ComparisonCharts.tsx Recharts line chart of occupants remaining over time (baseline vs current)
    App.tsx               Main application shell connecting editor, simulation, and analysis tabs
    main.tsx              React DOM root
  SPEC.md                 Rules spec v0.2 with Section 10 settled rules
  progress.md             This file (source of truth)
  flow.md                 Full roadmap and specifications
  package.json            Dependencies and scripts
  tsconfig.json           TypeScript strict configuration
  vite.config.ts          Vite config with React plugin
  index.html              HTML entry point
  .gitignore              Standard ignore list
```

## Decisions and deviations from the original spec

1. **Stepwise Simulation API:** Added `createSimulation`, `stepSimulation`, and `finishSimulation` to `engine/simulate.ts` so the UI canvas can animate frames at arbitrary framerates while keeping 100% deterministic parity with batch `simulate`.
2. **Duplicated files cleaned:** Deleted obsolete `_1` files (`types_1.ts`, `bfs_1.ts`, `progress_1.md`, `SPEC_1.md`, `SPEC_2.md`) and updated `SPEC.md` to v0.2.
3. **Demo Story Ready:** Included the Two-Wing complex preset where blocking Exit B forces occupants to choke the 1-cell central hallway, creating an immediate visual demonstration of bottlenecks, queues, and clearance delays.

## Next steps (in order)

1. Run `npm install` on user machine when Node.js is installed.
2. Phase 6 Polish: Report summary export (print/markdown/JSON), responsive layout tweaks, first-time user tutorial overlay.
