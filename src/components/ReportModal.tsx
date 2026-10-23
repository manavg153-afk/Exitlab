import React from 'react';
import type { Layout, Scenario, Disruptions, RunMetrics, Comparison } from '../engine/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: Layout;
  scenario: Scenario;
  disruptions: Disruptions;
  metrics: RunMetrics | null;
  baselineMetrics: RunMetrics | null;
  comparison: Comparison | null;
}

export function ReportModal({
  isOpen,
  onClose,
  layout,
  scenario,
  disruptions,
  metrics,
  baselineMetrics,
  comparison,
}: ReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    if (!metrics) return;
    const clearanceSec = (metrics.clearanceTicks * 0.5).toFixed(1);
    const avgWaitSec = (metrics.avgWait * 0.5).toFixed(1);
    const maxWaitSec = (metrics.maxWait * 0.5).toFixed(1);

    const mdContent = `# ExitLab Simulation Report
Generated on: ${new Date().toLocaleString()}

## 1. Scenario Summary
- **Layout:** ${layout.name} (${layout.width}x${layout.height} cells)
- **Occupants:** ${scenario.occupantCount}
- **Seed:** ${scenario.seed}
- **Blocked Exits:** ${disruptions.blockedExits.length > 0 ? disruptions.blockedExits.join(', ') : 'None'}
- **Extra Obstacles:** ${disruptions.extraObstacles.length} cells

## 2. Core Metrics
- **Clearance Duration:** ${clearanceSec}s (${metrics.clearanceTicks} ticks)
- **Timed Out:** ${metrics.timedOut ? 'Yes' : 'No'}
- **Max Queue Length:** ${metrics.maxQueueLength} occupants
- **Average Wait Time:** ${avgWaitSec}s
- **Max Wait Time:** ${maxWaitSec}s
- **Unreachable / Trapped:** ${metrics.unreachableCount} occupants

## 3. Exit Throughput Usage
${layout.exits.map((ex) => `- Exit ${ex.id} (capacity ${ex.capacity}/tick): ${metrics.exitUsage[ex.id] || 0} evacuated`).join('\n')}

${
  comparison
    ? `## 4. Comparison vs Baseline
- **Clearance Delta:** ${(comparison.clearanceDelta * 0.5).toFixed(1)}s (${isFinite(comparison.clearanceDeltaPct) ? comparison.clearanceDeltaPct.toFixed(1) + '%' : 'Infinite'})
- **Max Queue Delta:** ${comparison.maxQueueDelta >= 0 ? '+' : ''}${comparison.maxQueueDelta}
- **Unreachable Delta:** ${comparison.unreachableDelta >= 0 ? '+' : ''}${comparison.unreachableDelta}
`
    : ''
}
## 5. Assumptions & Limitations
- Grid-based discrete cellular automaton (0.5m x 0.5m cells, 0.5s per tick, max 1m/s velocity).
- 4-directional cardinal movement without diagonals.
- Exits feature finite throughput capacity (flow restrictions).
- **Educational comparative estimate only — NOT certified life-safety or structural egress validation.**
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExitLab_Report_${layout.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        id="exitlab-print-report"
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          maxWidth: '750px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          color: '#e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 id="report-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📄 Evacuation Stress-Test Report
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Layout: {layout.name} | Date: {new Date().toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
            }}
          >
            ✕
          </button>
        </div>

        {!metrics ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            No completed simulation metrics available to export. Please run a simulation first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Condition parameters */}
            <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scenario Parameters & Conditions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Occupants:</span>{' '}
                  <strong style={{ color: '#fff' }}>{scenario.occupantCount}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Seed (PRNG):</span>{' '}
                  <strong style={{ color: '#fff' }}>{scenario.seed}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Max Ticks:</span>{' '}
                  <strong style={{ color: '#fff' }}>{scenario.maxTicks}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Blocked Exits:</span>{' '}
                  <strong style={{ color: disruptions.blockedExits.length > 0 ? '#ef4444' : '#22c55e' }}>
                    {disruptions.blockedExits.length > 0 ? disruptions.blockedExits.join(', ') : 'None'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Extra Obstacles:</span>{' '}
                  <strong style={{ color: disruptions.extraObstacles.length > 0 ? '#f59e0b' : '#fff' }}>
                    {disruptions.extraObstacles.length} cells
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Building Size:</span>{' '}
                  <strong style={{ color: '#fff' }}>{layout.width} x {layout.height} ({(layout.width * 0.5).toFixed(1)}m x {(layout.height * 0.5).toFixed(1)}m)</strong>
                </div>
              </div>
            </div>

            {/* Performance KPIs */}
            <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Simulation Results
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Clearance Time</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
                    {(metrics.clearanceTicks * 0.5).toFixed(1)}s
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>({metrics.clearanceTicks} ticks)</div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Peak Queue</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>
                    {metrics.maxQueueLength} people
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>at doorway zones</div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Trapped (Cut Off)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: metrics.unreachableCount > 0 ? '#ef4444' : '#22c55e' }}>
                    {metrics.unreachableCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>occupants</div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div>Average Wait: <strong>{(metrics.avgWait * 0.5).toFixed(1)}s</strong></div>
                <div>Maximum Wait: <strong>{(metrics.maxWait * 0.5).toFixed(1)}s</strong></div>
                <div>Timed Out: <strong>{metrics.timedOut ? 'Yes' : 'No'}</strong></div>
              </div>
            </div>

            {/* Exit Breakdown */}
            <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Throughput by Exit
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {layout.exits.map((ex) => (
                  <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#0f172a', padding: '0.4rem 0.75rem', borderRadius: '0.25rem' }}>
                    <span>Exit {ex.id} (flow limit: {ex.capacity} people/tick)</span>
                    <strong style={{ color: disruptions.blockedExits.includes(ex.id) ? '#ef4444' : '#22c55e' }}>
                      {disruptions.blockedExits.includes(ex.id) ? 'BLOCKED (0 evacuated)' : `${metrics.exitUsage[ex.id] || 0} evacuated`}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Delta comparison if available */}
            {comparison && (
              <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Baseline Comparison
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Clearance Delta:</span>{' '}
                    <strong style={{ color: comparison.clearanceDelta > 0 ? '#ef4444' : '#22c55e' }}>
                      {comparison.clearanceDelta >= 0 ? '+' : ''}{(comparison.clearanceDelta * 0.5).toFixed(1)}s ({comparison.clearanceDeltaPct > 0 ? '+' : ''}{isFinite(comparison.clearanceDeltaPct) ? comparison.clearanceDeltaPct.toFixed(1) + '%' : 'inf'})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Queue Length Delta:</span>{' '}
                    <strong style={{ color: comparison.maxQueueDelta > 0 ? '#ef4444' : '#22c55e' }}>
                      {comparison.maxQueueDelta >= 0 ? '+' : ''}{comparison.maxQueueDelta}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Trapped Delta:</span>{' '}
                    <strong style={{ color: comparison.unreachableDelta > 0 ? '#ef4444' : '#22c55e' }}>
                      {comparison.unreachableDelta >= 0 ? '+' : ''}{comparison.unreachableDelta}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer & Known limits */}
            <div style={{ background: '#020617', padding: '0.75rem 1rem', borderRadius: '0.375rem', border: '1px solid #1e293b', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
              <strong>Disclaimer & Known Limitations:</strong> ExitLab simulates 4-directional grid movement under shortest-distance BFS logic and discrete capacity constraints. It does not account for fire spread, smoke stratification, toxic gas toxicity, panicking behavior, individual speed distributions, or ADA accessibility egress. Results are comparative educational estimates and do NOT constitute professional fire engineering or legal egress certification.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            ExitLab v0.2 • Evacuation Stress-Testing Report
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleDownloadMarkdown}
              disabled={!metrics}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '0.375rem',
                background: '#334155',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: !metrics ? 'not-allowed' : 'pointer',
              }}
            >
              📥 Download .MD
            </button>
            <button
              onClick={handlePrint}
              disabled={!metrics}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '0.375rem',
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: !metrics ? 'not-allowed' : 'pointer',
              }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
