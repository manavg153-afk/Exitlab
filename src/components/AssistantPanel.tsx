import React, { useState } from 'react';
import type { RunMetrics, Comparison, Layout, Disruptions } from '../../engine/types';

interface AssistantPanelProps {
  metrics: RunMetrics | null;
  baselineMetrics: RunMetrics | null;
  comparison: Comparison | null;
  layout: Layout;
  disruptions?: Disruptions;
}

export function AssistantPanel({
  metrics,
  baselineMetrics,
  comparison,
  layout,
  disruptions,
}: AssistantPanelProps) {
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // Compute ExitLab's rule-based explanations (matching SPEC §7)
  const computedExplanations: string[] = [];
  if (metrics) {
    if (metrics.unreachableCount > 0) {
      computedExplanations.push(
        `⚠️ Disconnected Region: ${metrics.unreachableCount} occupants are cut off from any open exit!`,
      );
    }
    if (metrics.maxQueueLength >= 4) {
      computedExplanations.push(
        `🚪 Severe Bottleneck: A queue of up to ${metrics.maxQueueLength} occupants formed near exit doorways.`,
      );
    }
    if (comparison && comparison.clearanceDelta > 0) {
      const pct = isFinite(comparison.clearanceDeltaPct)
        ? `+${comparison.clearanceDeltaPct.toFixed(1)}%`
        : 'infinite';
      computedExplanations.push(
        `⏱ Disruption Impact: Clearance time increased by ${(comparison.clearanceDelta * 0.5).toFixed(1)}s (${pct}) compared to baseline.`,
      );
    }
  }

  // Pre-configured question suggestion chips
  const suggestions = [
    'Why did clearance time increase?',
    'Where was the biggest bottleneck?',
    'Which exit had the highest queue?',
  ];

  const handleSubmit = async (qToSubmit?: string) => {
    const q = (qToSubmit || question).trim();
    if (!q || loading || !metrics) return;

    setLoading(true);
    setAnswer(null);
    setError(null);

    // Build compact JSON payload with actual units and values
    const runPayload = {
      clearanceSeconds: Number((metrics.clearanceTicks * 0.5).toFixed(1)),
      maxQueueLength: metrics.maxQueueLength,
      avgWaitSeconds: Number((metrics.avgWait * 0.5).toFixed(1)),
      maxWaitSeconds: Number((metrics.maxWait * 0.5).toFixed(1)),
      unreachableCount: metrics.unreachableCount,
      exitUsage: metrics.exitUsage || {},
      occupantCount: metrics.remainingOverTime?.[0] ?? 0,
      blockedExits: disruptions?.blockedExits ?? [],
      extraObstaclesCount: disruptions?.extraObstacles?.length ?? 0,
      baselineClearanceSeconds: baselineMetrics
        ? Number((baselineMetrics.clearanceTicks * 0.5).toFixed(1))
        : null,
      clearanceDeltaSeconds: comparison
        ? Number((comparison.clearanceDelta * 0.5).toFixed(1))
        : null,
      clearanceDeltaPct: comparison
        ? isFinite(comparison.clearanceDeltaPct)
          ? Number(comparison.clearanceDeltaPct.toFixed(1))
          : null
        : null,
      explanations: computedExplanations,
    };

    const backendBase = (import.meta as any).env?.VITE_ASSISTANT_URL || '';
    const endpoint = backendBase
      ? `${backendBase.replace(/\/$/, '')}/api/assistant/run-question`
      : '/api/assistant/run-question';

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          run: runPayload,
        }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        if (data && data.configured === false) {
          setIsConfigured(false);
          throw new Error(
            'Agent 37 is not configured on the backend service. Set AGENT37_API_KEY and AGENT37_INSTANCE_ID in your backend environment variables.',
          );
        }
        throw new Error(data?.error || `Assistant request failed with status ${resp.status}`);
      }

      setIsConfigured(true);
      setAnswer(data?.answer || 'No answer received from assistant.');
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with the Simulation Assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        border: '1px solid #334155',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Simulation Assistant
            </h3>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
              Ask about this run's clearance, queues &amp; bottlenecks
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.25rem',
            background: metrics ? '#065f46' : '#334155',
            color: metrics ? '#a7f3d0' : '#94a3b8',
            fontWeight: 500,
          }}
        >
          {metrics ? 'Run Data Ready' : 'Awaiting Run'}
        </span>
      </div>

      {/* Empty State (when simulation hasn't run yet) */}
      {!metrics ? (
        <div
          style={{
            background: '#0f172a',
            border: '1px dashed #334155',
            borderRadius: '0.375rem',
            padding: '1rem',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          <div style={{ marginBottom: '0.35rem', fontWeight: 500, color: '#94a3b8' }}>
            No run metrics available yet
          </div>
          Click <strong>"▶ Play"</strong> or <strong>"⚡ Instant Run"</strong> on the left to run an evacuation simulation, then ask questions about the results.
        </div>
      ) : (
        /* Active State */
        <>
          {/* Quick Suggestions Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuestion(s);
                  handleSubmit(s);
                }}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  color: '#93c5fd',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                💡 {s}
              </button>
            ))}
          </div>

          {/* Question Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Why did a bottleneck form at Exit A?"
              rows={2}
              maxLength={500}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.8rem',
                resize: 'none',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                {question.length}/500 chars
              </span>

              <button
                type="submit"
                disabled={loading || !question.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  background: loading || !question.trim() ? '#334155' : '#0284c7',
                  color: loading || !question.trim() ? '#94a3b8' : '#ffffff',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Thinking…' : 'Ask Assistant'}
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          {loading && (
            <div
              style={{
                background: '#0f172a',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #1e3a8a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#93c5fd',
              }}
            >
              <span style={{ animation: 'pulse 1.5s infinite' }}>⏳</span>
              Analyzing run metrics and contacting Agent 37…
            </div>
          )}

          {/* Error / Unconfigured Message */}
          {error && (
            <div
              style={{
                background: isConfigured === false ? '#451a03' : '#450a0a',
                border: `1px solid ${isConfigured === false ? '#b45309' : '#dc2626'}`,
                borderRadius: '0.375rem',
                padding: '0.6rem 0.75rem',
                fontSize: '0.75rem',
                color: isConfigured === false ? '#fef3c7' : '#fecaca',
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {isConfigured === false ? '⚙️ Agent 37 Not Configured' : '❌ Assistant Error'}
              </div>
              <div>{error}</div>
            </div>
          )}

          {/* Success Answer Display */}
          {answer && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>
                💡 Simulation Analysis:
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {answer}
              </div>

              {/* Mandatory Safety Disclaimer */}
              <div
                style={{
                  borderTop: '1px solid #1e293b',
                  paddingTop: '0.4rem',
                  fontSize: '0.65rem',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                ⚠️ Explanatory suggestion based on cellular simulation metrics — not legal building-safety, fire code, or life-safety certification advice.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
