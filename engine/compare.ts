import { simulate } from './simulate';
import type { Comparison, Layout, RunMetrics, Scenario } from './types';

/**
 * Percentage change from `base` to `value`.
 * 0 when both are 0. Infinity when base is 0 and value is above it (no finite percentage exists).
 */
export function pctChange(base: number, value: number): number {
  if (base === 0) return value === 0 ? 0 : value > 0 ? Infinity : -Infinity;
  return ((value - base) / base) * 100;
}

/** Scenario metrics minus baseline metrics, as absolute and percentage change (SPEC section 6). */
export function compareRuns(baseline: RunMetrics, scenario: RunMetrics): Comparison {
  const clearanceDelta = scenario.clearanceTicks - baseline.clearanceTicks;
  return {
    baseline,
    scenario,
    clearanceDelta,
    clearanceDeltaPct: pctChange(baseline.clearanceTicks, scenario.clearanceTicks),
    maxQueueDelta: scenario.maxQueueLength - baseline.maxQueueLength,
    unreachableDelta: scenario.unreachableCount - baseline.unreachableCount,
  };
}

/** Runs the baseline and the what-if scenario on the same layout and compares them. */
export function runComparison(layout: Layout, baseline: Scenario, scenario: Scenario): Comparison {
  return compareRuns(simulate(layout, baseline).metrics, simulate(layout, scenario).metrics);
}
