// ExitLab data model. Pure types, no logic and no React.

export type CellType = 'EMPTY' | 'WALL' | 'DOOR' | 'EXIT' | 'OBSTACLE' | 'SPAWN';

export interface Cell {
  type: CellType;
  /** Only used when type === 'EXIT' */
  exitId?: string;
}

export interface ExitDef {
  id: string;
  x: number;
  y: number;
  /** Max agents allowed to leave per tick */
  capacity: number;
}

export interface Layout {
  version: 1;
  name: string;
  width: number;
  height: number;
  /** cells[y][x] */
  cells: Cell[][];
  exits: ExitDef[];
}

export interface Disruptions {
  /** ExitDef ids that are blocked in this scenario */
  blockedExits: string[];
  /** Extra obstacle cells added on top of the layout */
  extraObstacles: { x: number; y: number }[];
}

export interface Scenario {
  version: 1;
  name: string;
  seed: number;
  occupantCount: number;
  /** Fixed start positions, generated once from the seed and then reused */
  startPositions: { x: number; y: number }[];
  disruptions: Disruptions;
  maxTicks: number;
}

export type AgentStatus = 'moving' | 'waiting' | 'exited' | 'stuck';

export interface Agent {
  id: number;
  x: number;
  y: number;
  status: AgentStatus;
  waitTicks: number;
  exitedAtTick: number | null;
}

export interface TickMetrics {
  tick: number;
  remaining: number;
  maxQueue: number;
}

export interface RunMetrics {
  clearanceTicks: number;
  timedOut: boolean;
  remainingOverTime: number[];
  maxQueueLength: number;
  avgWait: number;
  maxWait: number;
  unreachableCount: number;
  /** heat[y][x] = waiting agent-ticks accumulated on that cell */
  heat: number[][];
  exitUsage: Record<string, number>;
}

export interface RunResult {
  scenario: Scenario;
  metrics: RunMetrics;
}

export interface Comparison {
  baseline: RunMetrics;
  scenario: RunMetrics;
  clearanceDelta: number;
  clearanceDeltaPct: number;
  maxQueueDelta: number;
  unreachableDelta: number;
}
