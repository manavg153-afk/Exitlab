import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Layout, Scenario, Disruptions, RunMetrics, Comparison } from '../engine/types';
import {
  createScenario,
  deriveScenario,
  createSimulation,
  stepSimulation,
  finishSimulation,
  compareRuns,
  normalizeHeat,
  type SimulationState,
  type SimFrame,
} from '../engine';
import { PRESET_LAYOUTS, createEmptyFloor } from './editor/presets';
import { FloorPlanEditor, type Tool } from './editor/FloorPlanEditor';
import { SimulationView } from './render/SimulationView';
import { ScenarioPanel } from './scenario/ScenarioPanel';
import { AnalysisResults } from './results/AnalysisResults';
import { ComparisonCharts } from './results/ComparisonCharts';
import { TutorialModal } from './components/TutorialModal';
import { ReportModal } from './components/ReportModal';
import { AddFloorModal } from './components/AddFloorModal';
import { AssistantPanel } from './components/AssistantPanel';

export function App() {
  // Current tab: 'editor' | 'simulation'
  const [activeTab, setActiveTab] = useState<'editor' | 'simulation'>('editor');
  const [selectedTool, setSelectedTool] = useState<Tool>('WALL');

  // Modals state
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    return !localStorage.getItem('exitlab_tutorial_seen');
  });
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isAddFloorOpen, setIsAddFloorOpen] = useState<boolean>(false);

  // Custom floors state (persisted across sessions via localStorage)
  const [customFloors, setCustomFloors] = useState<Layout[]>(() => {
    const saved = localStorage.getItem('exitlab_custom_floors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Layout state
  const [layout, setLayout] = useState<Layout>(() => {
    const saved = localStorage.getItem('exitlab_layout');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return PRESET_LAYOUTS[0]; // Default to Demo preset
  });

  // All available selectable layouts (built-in presets + user custom floors)
  const allLayouts = useMemo(() => {
    return [...PRESET_LAYOUTS, ...customFloors];
  }, [customFloors]);

  // Keep custom floors in sync if the current active layout belongs to custom floors and is edited
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout(newLayout);
    setCustomFloors((prev) =>
      prev.map((f) => (f.name === newLayout.name ? JSON.parse(JSON.stringify(newLayout)) : f)),
    );
  }, []);

  // Handler for creating a new custom floor from the modal
  const handleCreateFloor = useCallback((name: string) => {
    const newFloor = createEmptyFloor(name);
    setCustomFloors((prev) => [...prev, newFloor]);
    setLayout(newFloor);
    setDisruptions({ blockedExits: [], extraObstacles: [] });
    setActiveTab('editor');
    setIsAddFloorOpen(false);
  }, []);

  // Names of all current layouts for duplicate validation
  const existingFloorNames = useMemo(() => {
    return allLayouts.map((l) => l.name);
  }, [allLayouts]);

  // Persist custom floors to localStorage
  useEffect(() => {
    localStorage.setItem('exitlab_custom_floors', JSON.stringify(customFloors));
  }, [customFloors]);

  // Calculate total SPAWN capacity in layout
  const spawnCapacity = useMemo(() => {
    let count = 0;
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (layout.cells[y][x].type === 'SPAWN') count++;
      }
    }
    return count;
  }, [layout]);

  // Disruptions state
  const [disruptions, setDisruptions] = useState<Disruptions>({
    blockedExits: [],
    extraObstacles: [],
  });

  // Occupant settings
  const [occupantCount, setOccupantCount] = useState<number>(30);
  const [seed, setSeed] = useState<number>(42);

  // Simulation execution state
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [currentFrame, setCurrentFrame] = useState<SimFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [latestMetrics, setLatestMetrics] = useState<RunMetrics | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<RunMetrics | null>(null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  const animTimerRef = useRef<number | null>(null);

  // Auto-save layout to localStorage
  useEffect(() => {
    localStorage.setItem('exitlab_layout', JSON.stringify(layout));
  }, [layout]);

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    localStorage.setItem('exitlab_tutorial_seen', 'true');
  };

  // Ensure occupant count doesn't exceed spawn cells
  useEffect(() => {
    if (occupantCount > spawnCapacity && spawnCapacity > 0) {
      setOccupantCount(spawnCapacity);
    }
  }, [spawnCapacity, occupantCount]);

  // Active scenario
  const scenario: Scenario = useMemo(() => {
    const validCount = Math.min(occupantCount, spawnCapacity);
    const base = createScenario(layout, {
      name: 'Baseline',
      seed,
      occupantCount: validCount,
    });
    return deriveScenario(base, 'Current Scenario', disruptions);
  }, [layout, seed, occupantCount, spawnCapacity, disruptions]);

  // Reset/rebuild simulation when scenario or layout changes
  const resetSimulation = useCallback(() => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    setIsPlaying(false);

    try {
      const state = createSimulation(layout, scenario);
      setSimState(state);
      setCurrentFrame({
        tick: 0,
        remaining: state.active.length,
        exitedNow: 0,
        maxQueueNow: 0,
        agents: state.agents.map((a) => ({
          id: a.id,
          x: a.x,
          y: a.y,
          status: a.status,
          waitTicks: a.waitTicks,
        })),
      });
      setLatestMetrics(null);
    } catch (err) {
      console.error(err);
    }
  }, [layout, scenario]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Step simulation forward
  const handleStep = useCallback(() => {
    if (!simState || simState.done) return;
    const frame = stepSimulation(simState);
    if (frame) {
      setCurrentFrame(frame);
    }
    if (simState.done) {
      setIsPlaying(false);
      const finished = finishSimulation(simState);
      setLatestMetrics(finished.result.metrics);
    }
  }, [simState]);

  // Run full simulation instantly (for quick comparison or baseline capture)
  const handleRunFull = () => {
    if (!simState) return;
    const finished = finishSimulation(simState);
    setLatestMetrics(finished.result.metrics);
    setCurrentFrame({
      tick: finished.result.metrics.clearanceTicks,
      remaining: 0,
      exitedNow: 0,
      maxQueueNow: finished.result.metrics.maxQueueLength,
      agents: finished.agents.map((a) => ({
        id: a.id,
        x: a.x,
        y: a.y,
        status: a.status,
        waitTicks: a.waitTicks,
      })),
    });
    setIsPlaying(false);
  };

  // Keyboard accessibility controls for simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleStep();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetSimulation();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHeatmap((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStep, resetSimulation]);

  // Play / Pause timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(20, Math.floor(250 / speedMultiplier));
      animTimerRef.current = window.setInterval(() => {
        if (!simState || simState.done) {
          setIsPlaying(false);
          return;
        }
        const frame = stepSimulation(simState);
        if (frame) {
          setCurrentFrame(frame);
        }
        if (simState.done) {
          setIsPlaying(false);
          const finished = finishSimulation(simState);
          setLatestMetrics(finished.result.metrics);
        }
      }, intervalMs);
    } else {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    }

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [isPlaying, simState, speedMultiplier]);

  // Toggle extra obstacle by clicking a cell during simulation tab
  const handleCellClickDisruption = (x: number, y: number) => {
    const exists = disruptions.extraObstacles.some((o) => o.x === x && o.y === y);
    const nextObstacles = exists
      ? disruptions.extraObstacles.filter((o) => !(o.x === x && o.y === y))
      : [...disruptions.extraObstacles, { x, y }];
    setDisruptions({
      ...disruptions,
      extraObstacles: nextObstacles,
    });
  };

  // Normalized heat overlay
  const heatOverlay = useMemo(() => {
    if (!latestMetrics?.heat) return undefined;
    return normalizeHeat(latestMetrics.heat);
  }, [latestMetrics]);

  // Comparison against baseline
  const comparison: Comparison | null = useMemo(() => {
    if (!latestMetrics || !baselineMetrics) return null;
    return compareRuns(baselineMetrics, latestMetrics);
  }, [latestMetrics, baselineMetrics]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '1rem 1.5rem',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚪 ExitLab</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 500,
                background: '#0284c7',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                color: '#fff',
              }}
            >
              v0.2 Core
            </span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>
            Browser-based evacuation stress-testing & bottleneck simulator
          </p>
        </div>

        {/* Tab, Preset & Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Preset selector */}
          <select
            value={layout.name}
            aria-label="Select layout preset"
            onChange={(e) => {
              if (e.target.value === '__ADD_NEW_FLOOR__') {
                setIsAddFloorOpen(true);
                return;
              }
              const selected = allLayouts.find((p) => p.name === e.target.value);
              if (selected) {
                setLayout(JSON.parse(JSON.stringify(selected)));
                setDisruptions({ blockedExits: [], extraObstacles: [] });
              }
            }}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
            }}
          >
            {PRESET_LAYOUTS.map((p) => (
              <option key={p.name} value={p.name}>
                Preset: {p.name}
              </option>
            ))}
            {customFloors.length > 0 && (
              <optgroup label="Custom Floors">
                {customFloors.map((f) => (
                  <option key={f.name} value={f.name}>
                    Floor: {f.name}
                  </option>
                ))}
              </optgroup>
            )}
            <option
              value="__ADD_NEW_FLOOR__"
              style={{ fontWeight: 700, color: '#38bdf8' }}
            >
              ＋ Add Floor
            </option>
          </select>

          {/* Tab switcher */}
          <div
            style={{
              display: 'flex',
              background: '#1e293b',
              borderRadius: '0.375rem',
              padding: '0.2rem',
              border: '1px solid #334155',
            }}
          >
            <button
              onClick={() => setActiveTab('editor')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '0.25rem',
                border: 'none',
                background: activeTab === 'editor' ? '#0284c7' : 'transparent',
                color: activeTab === 'editor' ? '#fff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ✏️ Floor-Plan Editor
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '0.25rem',
                border: 'none',
                background: activeTab === 'simulation' ? '#0284c7' : 'transparent',
                color: activeTab === 'simulation' ? '#fff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ▶️ Simulation & Stress-Test
            </button>
          </div>

          {/* Quick Help & Export Report Buttons */}
          <button
            onClick={() => setIsReportOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              background: '#047857',
              border: 'none',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📄 Report
          </button>
          <button
            onClick={() => setIsTutorialOpen(true)}
            aria-label="Open Tutorial"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.6rem',
              borderRadius: '0.375rem',
              background: '#334155',
              border: 'none',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            ❓ Help
          </button>
        </div>
      </header>

      {/* Main Grid: Left Stage (Canvas / Editor) + Right Control Pane */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          flex: 1,
        }}
      >
        {/* Left Column: Editor or Live Canvas */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#131c2e',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid #1e293b',
            minHeight: '520px',
          }}
        >
          {activeTab === 'editor' ? (
            <FloorPlanEditor
              layout={layout}
              onChange={handleLayoutChange}
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              isSimulating={isPlaying}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
              {/* Playback Controls Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#1e293b',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '0.375rem',
                      background: isPlaying ? '#eab308' : '#22c55e',
                      border: 'none',
                      color: '#0f172a',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    {isPlaying ? '⏸ Pause (Space)' : '▶ Play (Space)'}
                  </button>
                  <button
                    onClick={handleStep}
                    disabled={isPlaying || simState?.done}
                    aria-label="Step 1 tick"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '0.375rem',
                      background: '#334155',
                      border: 'none',
                      color: '#f8fafc',
                      cursor: isPlaying || simState?.done ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    ⏭ Step (S)
                  </button>
                  <button
                    onClick={resetSimulation}
                    aria-label="Restart simulation"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '0.375rem',
                      background: '#334155',
                      border: 'none',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    🔄 Restart (R)
                  </button>
                  <button
                    onClick={handleRunFull}
                    aria-label="Run full simulation instantly"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '0.375rem',
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Instant Run
                  </button>
                </div>

                {/* Speed selector */}
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Speed:</span>
                  {[0.5, 1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSpeedMultiplier(speed)}
                      aria-label={`Set speed to ${speed}x`}
                      style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '0.25rem',
                        border: speedMultiplier === speed ? '1px solid #38bdf8' : '1px solid #334155',
                        background: speedMultiplier === speed ? '#0369a1' : '#0f172a',
                        color: '#fff',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Canvas */}
              <SimulationView
                layout={layout}
                scenario={scenario}
                currentFrame={currentFrame}
                heatOverlay={heatOverlay}
                showHeatmap={showHeatmap}
                onCellClick={handleCellClickDisruption}
                disruptions={disruptions}
              />

              {/* Live Status Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#1e293b',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Tick: <strong style={{ color: '#fff' }}>{currentFrame?.tick ?? 0}</strong>{' '}
                  ({((currentFrame?.tick ?? 0) * 0.5).toFixed(1)}s elapsed)
                </span>
                <span>
                  People Remaining:{' '}
                  <strong style={{ color: '#38bdf8' }}>{currentFrame?.remaining ?? 0}</strong>
                </span>
                <span>
                  Max Queue:{' '}
                  <strong style={{ color: '#f59e0b' }}>{currentFrame?.maxQueueNow ?? 0}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Evacuation progression charts */}
          <ComparisonCharts
            baselineMetrics={baselineMetrics}
            scenarioMetrics={latestMetrics}
          />
        </section>

        {/* Right Column: Disruptions & Scenario Settings + Analysis */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '380px' }}>
          <ScenarioPanel
            layout={layout}
            scenario={scenario}
            disruptions={disruptions}
            onUpdateDisruptions={setDisruptions}
            onUpdateOccupantCount={setOccupantCount}
            onUpdateSeed={setSeed}
            isSimulating={isPlaying}
            spawnCapacity={spawnCapacity}
          />

          <AnalysisResults
            metrics={latestMetrics}
            baselineMetrics={baselineMetrics}
            comparison={comparison}
            layout={layout}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            onSaveAsBaseline={() => setBaselineMetrics(latestMetrics)}
          />

          <AssistantPanel
            metrics={latestMetrics}
            baselineMetrics={baselineMetrics}
            comparison={comparison}
            layout={layout}
            disruptions={disruptions}
          />
        </aside>
      </main>

      {/* Honest educational footer */}
      <footer
        style={{
          marginTop: '1rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.75rem',
          borderTop: '1px solid #1e293b',
          paddingTop: '0.5rem',
        }}
      >
        ExitLab is an educational comparative estimate simulator, not a life-safety certification tool.
      </footer>

      {/* Modals */}
      <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} />
      <AddFloorModal
        isOpen={isAddFloorOpen}
        onClose={() => setIsAddFloorOpen(false)}
        onCreate={handleCreateFloor}
        existingNames={existingFloorNames}
      />
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        layout={layout}
        scenario={scenario}
        disruptions={disruptions}
        metrics={latestMetrics}
        baselineMetrics={baselineMetrics}
        comparison={comparison}
      />
    </div>
  );
}
