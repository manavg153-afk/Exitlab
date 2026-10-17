// Public surface of the ExitLab engine. Pure TypeScript, no React, no Math.random().
export * from './types';
export { createRng, randInt, shuffle } from './rng';
export type { Rng } from './rng';
export { buildDistanceMap, isWalkable } from './bfs';
export {
  DEFAULT_MAX_TICKS,
  pickStartPositions,
  createScenario,
  deriveScenario,
  validateScenario,
} from './scenario';
export type { ScenarioOptions } from './scenario';
export { emptyHeat, summarizeWaits, normalizeHeat } from './metrics';
export { simulate, simulateDetailed } from './simulate';
export type { DetailedRun } from './simulate';
export { compareRuns, runComparison, pctChange } from './compare';
