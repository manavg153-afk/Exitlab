# ExitLab progress

> **For Claude: read this file first, before starting any phase.** It is the source of truth for project status.
> Update it at the end of every piece of work (what changed, what is next, any new decisions). Do not re-examine every file; trust this file and open only what the next step touches.

Last updated: 2026-10-23 (Phase 6 Polish and Report Complete)

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
| 5 | Explanation engine, layout comparison | **DONE (Rule-based).** Integrated bottleneck explanations (door capacity, queue severity, disconnected regions, clearance impact). |
| 6 | Polish and report | **DONE.** Scenario report export (print/PDF layout + downloadable Markdown), first-time user tutorial overlay modal, keyboard accessibility controls (`Space`, `S`, `R`, `H`), layout empty-state warnings, responsive UI, README documentation with demo script. |
| 7 | Optional extras | Open for future exploration (cloud saves, multi-floor, smoke/fire spread). |

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
    components/
      TutorialModal.tsx First-time onboarding overlay with 60s demo guide & keyboard shortcuts
      ReportModal.tsx   Print-ready evacuation stress-test report with Markdown export
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
    App.tsx               Main application shell connecting editor, simulation, modals, and hotkeys
    main.tsx              React DOM root
  SPEC.md                 Rules spec v0.2 with Section 10 settled rules
  progress.md             This file (source of truth)
  flow.md                 Full roadmap and specifications
  README.md               Comprehensive project overview, 60s demo script, and quickstart
  package.json            Dependencies and scripts
  tsconfig.json           TypeScript strict configuration
  vite.config.ts          Vite config with React plugin
  index.html              HTML entry point with print stylesheets
  .gitignore              Standard ignore list
```

## Decisions and deviations from the original spec

1. **Stepwise Simulation API:** Added `createSimulation`, `stepSimulation`, and `finishSimulation` to `engine/simulate.ts` so the UI canvas can animate frames at arbitrary framerates while keeping 100% deterministic parity with batch `simulate`.
2. **Duplicated files cleaned:** Deleted obsolete `_1` files (`types_1.ts`, `bfs_1.ts`, `progress_1.md`, `SPEC_1.md`, `SPEC_2.md`) and updated `SPEC.md` to v0.2.
3. **Demo Story Ready:** Included the Two-Wing complex preset where blocking Exit B forces occupants to choke the 1-cell central hallway, creating an immediate visual demonstration of bottlenecks, queues, and clearance delays.
4. **Phase 6 Polish Finished:** Integrated full report generation (print-friendly CSS + dynamic Markdown export), interactive tutorial modal, keyboard shortcuts, defensive UI validation (alerting when layout lacks exits or spawn cells), and comprehensive README.

## Next steps (in order)

1. Run `npm install` on user machine when Node.js is installed.
2. Optional extras (Phase 7): Cloud saves or multi-floor stairs if desired.
