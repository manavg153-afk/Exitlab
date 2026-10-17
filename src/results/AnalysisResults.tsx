import React from 'react';
import type { RunMetrics, Comparison, Layout } from '../../engine/types';

interface AnalysisResultsProps {
  metrics: RunMetrics | null;
  baselineMetrics: RunMetrics | null;
  comparison: Comparison | null;
  layout: Layout;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onSaveAsBaseline: () => void;
}

export function AnalysisResults({
  metrics,
  baselineMetrics,
  comparison,
  layout,
  showHeatmap,
  onToggleHeatmap,
  onSaveAsBaseline,
}: AnalysisResultsProps) {
  if (!metrics) {
    return (
      <div
        style={{
          background: '#1e293b',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#64748b',
          textAlign: 'center',
          fontSize: '0.85rem',
        }}
      >
        Run simulation to view analysis metrics & bottleneck detection.
      </div>
    );
  }

  const clearanceSec = (metrics.clearanceTicks * 0.5).toFixed(1);
  const avgWaitSec = (metrics.avgWait * 0.5).toFixed(1);

  // Generate simple rule-based bottleneck explanations (SPEC §7)
  const explanations: string[] = [];
  if (metrics.unreachableCount > 0) {
    explanations.push(
      `⚠️ Disconnected Region: ${metrics.unreachableCount} occupants are cut off from any open exit!`,
    );
  }
  if (metrics.maxQueueLength >= 4) {
    explanations.push(
      `🚪 Severe Bottleneck: A queue of up to ${metrics.maxQueueLength} occupants formed near exit doorways.`,
    );
  }
  if (comparison && comparison.clearanceDelta > 0) {
    const pct = isFinite(comparison.clearanceDeltaPct)
      ? `+${comparison.clearanceDeltaPct.toFixed(1)}%`
      : 'infinite';
    explanations.push(
      `⏱ Disruption Impact: Clearance time increased by ${(comparison.clearanceDelta * 0.5).toFixed(1)}s (${pct}) compared to baseline.`,
    );
  }

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
          📊 Metrics & Analysis
        </h3>
        <button
          onClick={onToggleHeatmap}
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '0.25rem',
            border: showHeatmap ? '1px solid #ef4444' : '1px solid #334155',
            background: showHeatmap ? '#450a0a' : '#0f172a',
            color: showHeatmap ? '#f87171' : '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {showHeatmap ? '🔥 Heatmap: ON' : '🔥 Heatmap: OFF'}
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem',
        }}
      >
        <div style={{ background: '#0f172a', padding: '0.6rem', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Clearance Time</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
            {clearanceSec}s{' '}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
              ({metrics.clearanceTicks} ticks)
            </span>
          </div>
          {comparison && (
            <div
              style={{
                fontSize: '0.7rem',
                color: comparison.clearanceDelta > 0 ? '#ef4444' : '#22c55e',
              }}
            >
              {comparison.clearanceDelta >= 0 ? '+' : ''}
              {(comparison.clearanceDelta * 0.5).toFixed(1)}s (
              {comparison.clearanceDeltaPct > 0 ? '+' : ''}
              {isFinite(comparison.clearanceDeltaPct)
                ? comparison.clearanceDeltaPct.toFixed(1) + '%'
                : 'inf'}
              )
            </div>
          )}
        </div>

        <div style={{ background: '#0f172a', padding: '0.6rem', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Max Queue Length</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
            {metrics.maxQueueLength} people
          </div>
          {comparison && (
            <div
              style={{
                fontSize: '0.7rem',
                color: comparison.maxQueueDelta > 0 ? '#ef4444' : '#22c55e',
              }}
            >
              {comparison.maxQueueDelta >= 0 ? '+' : ''}
              {comparison.maxQueueDelta} vs baseline
            </div>
          )}
        </div>

        <div style={{ background: '#0f172a', padding: '0.6rem', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Average Wait</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#cbd5e1' }}>
            {avgWaitSec}s{' '}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
              (max { (metrics.maxWait * 0.5).toFixed(1) }s)
            </span>
          </div>
        </div>

        <div style={{ background: '#0f172a', padding: '0.6rem', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Trapped (Unreachable)</div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: metrics.unreachableCount > 0 ? '#ef4444' : '#22c55e',
            }}
          >
            {metrics.unreachableCount}
          </div>
          {comparison && (
            <div
              style={{
                fontSize: '0.7rem',
                color: comparison.unreachableDelta > 0 ? '#ef4444' : '#22c55e',
              }}
            >
              {comparison.unreachableDelta >= 0 ? '+' : ''}
              {comparison.unreachableDelta} vs baseline
            </div>
          )}
        </div>
      </div>

      {/* Exit Usage Breakdown */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
          Exit Throughput Usage:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {layout.exits.map((ex) => {
            const usage = metrics.exitUsage[ex.id] || 0;
            return (
              <div
                key={ex.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#0f172a',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: '#94a3b8' }}>Exit {ex.id}:</span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {usage} people evacuated
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottleneck Findings & Explanations (Phase 5) */}
      {explanations.length > 0 && (
        <div
          style={{
            background: '#291818',
            border: '1px solid #7f1d1d',
            borderRadius: '0.375rem',
            padding: '0.6rem 0.75rem',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ fontWeight: 600, color: '#fca5a5' }}>
            Bottleneck Explanations:
          </div>
          {explanations.map((exp, i) => (
            <div key={i} style={{ color: '#fed7aa' }}>
              {exp}
            </div>
          ))}
        </div>
      )}

      {/* Baseline Action */}
      <button
        onClick={onSaveAsBaseline}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '0.375rem',
          background: '#0369a1',
          border: 'none',
          color: '#f8fafc',
          fontSize: '0.75rem',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        📌 Set This Run As Baseline
      </button>
    </div>
  );
}
