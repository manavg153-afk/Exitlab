import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RunMetrics } from '../../engine/types';

interface ComparisonChartsProps {
  baselineMetrics: RunMetrics | null;
  scenarioMetrics: RunMetrics | null;
}

export function ComparisonCharts({
  baselineMetrics,
  scenarioMetrics,
}: ComparisonChartsProps) {
  if (!scenarioMetrics) return null;

  // Build combined data points for Remaining Over Time
  const maxTicks = Math.max(
    scenarioMetrics.remainingOverTime.length,
    baselineMetrics ? baselineMetrics.remainingOverTime.length : 0,
  );

  const data: Array<{
    tick: number;
    scenario: number;
    baseline?: number;
  }> = [];

  // Sample data to keep charts smooth if there are many ticks
  const step = Math.max(1, Math.floor(maxTicks / 40));

  for (let t = 0; t < maxTicks; t += step) {
    const scVal =
      t < scenarioMetrics.remainingOverTime.length
        ? scenarioMetrics.remainingOverTime[t]
        : 0;

    let baseVal: number | undefined = undefined;
    if (baselineMetrics) {
      baseVal =
        t < baselineMetrics.remainingOverTime.length
          ? baselineMetrics.remainingOverTime[t]
          : 0;
    }

    data.push({
      tick: t,
      scenario: scVal,
      baseline: baseVal,
    });
  }

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginTop: '1rem',
      }}
    >
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
        📈 Evacuation Progression (Occupants Remaining Over Time)
      </h3>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="tick"
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(t) => `${t}t`}
            />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '4px' }}
              labelFormatter={(t) => `Tick ${t} (${(Number(t) * 0.5).toFixed(1)}s)`}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              type="monotone"
              dataKey="scenario"
              name="Current Scenario"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            {baselineMetrics && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline Run"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
