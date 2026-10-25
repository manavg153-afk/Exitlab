import type { Layout, CellType } from '../../engine/types';

export const CELL_SIZE = 28; // pixels per cell

export const CELL_COLORS: Record<CellType, string> = {
  EMPTY: '#1e293b',    // dark slate open floor
  WALL: '#020617',     // almost black wall
  DOOR: '#f59e0b',     // amber/orange door
  EXIT: '#22c55e',     // green exit
  OBSTACLE: '#64748b', // slate debris/obstacle
  SPAWN: '#0284c7',    // cyan/sky spawn area
};

export interface DrawOptions {
  showGridLines?: boolean;
  blockedExits?: Set<string>;
  extraObstacles?: Set<number>;
  heat?: number[][]; // normalized 0..1
  unreachableCells?: Set<number>;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  options: DrawOptions = {},
) {
  const { width, height, cells } = layout;
  const cellSize = CELL_SIZE;

  ctx.clearRect(0, 0, width * cellSize, height * cellSize);

  // 1. Draw base cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const cell = cells[y][x];

      // Check for extra obstacle disruption
      if (options.extraObstacles?.has(idx)) {
        ctx.fillStyle = '#ef4444'; // red obstacle
      } else if (cell.type === 'EXIT' && cell.exitId && options.blockedExits?.has(cell.exitId)) {
        ctx.fillStyle = '#7f1d1d'; // dark red blocked exit
      } else {
        ctx.fillStyle = CELL_COLORS[cell.type] || '#1e293b';
      }

      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

      // Label exits
      if (cell.type === 'EXIT' && cell.exitId) {
        ctx.fillStyle = options.blockedExits?.has(cell.exitId) ? '#fca5a5' : '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isBlocked = options.blockedExits?.has(cell.exitId);
        ctx.fillText(
          isBlocked ? '✕' : cell.exitId,
          x * cellSize + cellSize / 2,
          y * cellSize + cellSize / 2,
        );
      }
    }
  }

  // 2. Draw heat overlay if provided
  if (options.heat) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const val = options.heat[y][x];
        if (val > 0.01) {
          // Heat gradient: yellow to red
          ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(val * 0.85, 0.85)})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // 3. Draw unreachable overlay if provided
  if (options.unreachableCells) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    for (const idx of options.unreachableCells) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // 4. Grid lines
  if (options.showGridLines !== false) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, height * cellSize);
    }
    for (let y = 0; y <= height; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(width * cellSize, y * cellSize);
    }
    ctx.stroke();
  }
}

export function drawAgents(
  ctx: CanvasRenderingContext2D,
  agents: Array<{ x: number; y: number; status: string }>,
) {
  const cellSize = CELL_SIZE;
  const radius = cellSize * 0.35;

  for (const a of agents) {
    if (a.status === 'exited') continue;

    ctx.beginPath();
    ctx.arc(
      a.x * cellSize + cellSize / 2,
      a.y * cellSize + cellSize / 2,
      radius,
      0,
      Math.PI * 2,
    );

    if (a.status === 'stuck') {
      ctx.fillStyle = '#ef4444'; // Red for trapped / unreachable
    } else if (a.status === 'waiting') {
      ctx.fillStyle = '#f59e0b'; // Amber for waiting in queue
    } else {
      ctx.fillStyle = '#38bdf8'; // Sky blue for actively moving
    }
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
