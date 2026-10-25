# ExitLab progress

> **Read this file first, before starting any phase.** It is the source of truth for project status.
> Update it at the end of every piece of work (what changed, what is next, any new decisions). Do not re-examine every file; trust this file and open only what the next step touches.

Last updated: 2026-10-25 (All phases + post-launch fixes complete, merged to main)

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

## Post-launch fixes and features (all merged to main)

| Change | Files touched | Commit |
|---|---|---|
| **TS build fix (Vercel)** — `ReportModal.tsx` had wrong import path `'../engine/types'` → `'../../engine/types'`; added `ExitDef` type annotation to two `.map` callbacks to fix implicit-any errors | `src/components/ReportModal.tsx` | `59cd13d` |
| **Canvas clipping fix** — Left wing / Exit A of Two-Wing Complex was clipped when canvas was wider than the flex container. Replaced `justifyContent: 'center'` + `alignItems: 'center'` on the overflow container with `margin: 'auto'` on the canvas element so scrolling works correctly | `src/editor/FloorPlanEditor.tsx`, `src/render/SimulationView.tsx` | `be027c1` |
| **Add Floor feature** — New `＋ Add Floor` option at bottom of Preset dropdown. Shows `AddFloorModal` (name input + Create/Cancel). Creates an empty floor via `createEmptyFloor()`, stores custom floors in `localStorage` key `exitlab_custom_floors`, active layout in `exitlab_layout`. Sentinel value `__ADD_NEW_FLOOR__` detects the action in the `<select>` onChange handler. | `src/components/AddFloorModal.tsx` (new), `src/editor/presets.ts`, `src/App.tsx` | `364a214` |
| **Door color change** — Door cells changed from blue (`#3b82f6`) to amber (`#f59e0b`) in canvas renderer; Door tool button label color also updated to match | `src/render/canvasRenderer.ts`, `src/editor/FloorPlanEditor.tsx` | `66b9904` |

## Current git state

- Branch: `main`
- Working tree: **clean**
- All post-launch branches merged into `main`
- `npm test`: **35/35 pass** (engine/engine.test.ts + engine/simulate.test.ts)
- `npm run build`: **0 TypeScript errors**, vite build succeeds
- Deployed to Vercel (user confirmed working)

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
      AddFloorModal.tsx  Modal for entering a custom floor name (+ Add Floor feature)
      TutorialModal.tsx  First-time onboarding overlay with 60s demo guide & keyboard shortcuts
      ReportModal.tsx    Print-ready evacuation stress-test report with Markdown export
    editor/
      FloorPlanEditor.tsx  Canvas grid editor with paint tools, undo/redo, capacity inputs, import/export
      presets.ts           3 preset building layouts + createEmptyFloor() factory
    render/
      canvasRenderer.ts    Canvas rendering for cells, grid lines, exits, heatmap overlay, agents
                           DOOR color: #f59e0b (amber), EXIT: green, WALL: dark, OBSTACLE: orange-red
      SimulationView.tsx   Canvas simulator viewport with click-to-disrupt interaction
    scenario/
      ScenarioPanel.tsx    Exit block/unblock, obstacle counter, occupant density & seed controls
    results/
      AnalysisResults.tsx  KPIs grid, throughput breakdown, baseline comparison, bottleneck explanations
      ComparisonCharts.tsx Recharts line chart of occupants remaining over time (baseline vs current)
    App.tsx                Main application shell — preset dropdown (incl. ＋ Add Floor), custom floors state,
                           localStorage persistence, editor/simulation tab switching, modal wiring, hotkeys
    main.tsx               React DOM root
  SPEC.md                  Rules spec v0.2 with Section 10 settled rules
  progress.md              This file (source of truth)
  flow.md                  Full roadmap and specifications
  README.md                Comprehensive project overview, 60s demo script, and quickstart
  package.json             Dependencies and scripts
  tsconfig.json            TypeScript strict configuration
  vite.config.ts           Vite config with React plugin
  index.html               HTML entry point with print stylesheets
  .gitignore               Standard ignore list
```

## Decisions and constraints (DO NOT violate)

1. **Never modify**: `PRESET_LAYOUTS` array, engine BFS logic, simulation tick/evacuation algorithm, seed behavior, report calculations.
2. **Always run** `npm test` AND `npm run build` after any change and confirm 0 errors before committing.
3. **Style**: Dark theme (`#0f172a` background, `#1e293b` cards).
4. **No backend** — localStorage only for custom floor persistence.
5. Custom floors must not overwrite presets. Sentinel `__ADD_NEW_FLOOR__` in `<select>` detects Add Floor action.
6. The `color` field in the `tools` array in `FloorPlanEditor.tsx` is used for toolbar button label styling only (not button background). Canvas rendering colors are exclusively in `canvasRenderer.ts`.
7. **Canvas centering**: Use `margin: 'auto'` on the canvas element inside an `overflow: auto` container. Do NOT use `justifyContent: 'center'` + `alignItems: 'center'` on the scroll container — this clips the left side when the canvas overflows.

## Next steps

No pending work. Awaiting next user request.

Possible Phase 7 extras (not started):
- Cloud saves / shareable layout URLs
- Multi-floor with stairwell connections
- Smoke/fire spread simulation layer
