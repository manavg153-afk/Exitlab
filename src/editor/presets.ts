import type { Layout } from '../../engine/types';

/**
 * 1. Demo Preset: Two-Wing Complex (Clinic/Hallway)
 * Perfect for the 60-second demo:
 * - Two main wings, left and right.
 * - Wing A has Exit A (west).
 * - Wing B has Exit B (east).
 * - Central corridor links them.
 * Blocking Exit B forces all occupants of Wing B to traverse the central bottleneck
 * to reach Exit A, drastically causing queues, heat buildup, and delayed clearance!
 */
export function createDemoPreset(): Layout {
  const width = 25;
  const height = 15;
  const cells: Layout['cells'] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      // Outer perimeter walls
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        return { type: 'WALL' };
      }
      return { type: 'EMPTY' };
    }),
  );

  // Divide into Left Wing (x: 1..10) and Right Wing (x: 14..23) with central bottleneck (x: 11..13)
  // Vertical dividing walls leaving a 1-cell corridor at y=7
  for (let y = 1; y < height - 1; y++) {
    if (y !== 7) {
      cells[y][11] = { type: 'WALL' };
      cells[y][13] = { type: 'WALL' };
    }
  }

  // Add spawn areas in both wings
  // Left Wing spawn area
  for (let y = 2; y <= 5; y++) {
    for (let x = 2; x <= 6; x++) {
      cells[y][x] = { type: 'SPAWN' };
    }
  }
  for (let y = 9; y <= 12; y++) {
    for (let x = 2; x <= 6; x++) {
      cells[y][x] = { type: 'SPAWN' };
    }
  }

  // Right Wing spawn area (crowded!)
  for (let y = 2; y <= 6; y++) {
    for (let x = 16; x <= 22; x++) {
      cells[y][x] = { type: 'SPAWN' };
    }
  }
  for (let y = 8; y <= 12; y++) {
    for (let x = 16; x <= 22; x++) {
      cells[y][x] = { type: 'SPAWN' };
    }
  }

  // Exit A on West wall
  cells[7][0] = { type: 'EXIT', exitId: 'A' };
  // Exit B on East wall
  cells[7][width - 1] = { type: 'EXIT', exitId: 'B' };

  return {
    version: 1,
    name: 'Demo: Two-Wing Complex',
    width,
    height,
    cells,
    exits: [
      { id: 'A', x: 0, y: 7, capacity: 1 },
      { id: 'B', x: width - 1, y: 7, capacity: 1 },
    ],
  };
}

/**
 * 2. Classroom Floor Preset
 * Central hallway with 4 classrooms, exits at north and south ends.
 */
export function createClassroomPreset(): Layout {
  const width = 21;
  const height = 15;
  const cells: Layout['cells'] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        return { type: 'WALL' };
      }
      return { type: 'EMPTY' };
    }),
  );

  // Central corridor is x: 9..11
  // Classroom walls west (x=8) and east (x=12)
  for (let y = 1; y < height - 1; y++) {
    cells[y][8] = { type: 'WALL' };
    cells[y][12] = { type: 'WALL' };
  }
  // Horizontal dividing walls at y=7
  for (let x = 1; x <= 7; x++) cells[7][x] = { type: 'WALL' };
  for (let x = 13; x <= width - 2; x++) cells[7][x] = { type: 'WALL' };

  // Doors into the classrooms
  cells[3][8] = { type: 'DOOR' };
  cells[11][8] = { type: 'DOOR' };
  cells[3][12] = { type: 'DOOR' };
  cells[11][12] = { type: 'DOOR' };

  // Spawns inside classrooms
  for (let y = 2; y <= 5; y++) {
    for (let x = 2; x <= 6; x++) cells[y][x] = { type: 'SPAWN' };
    for (let x = 14; x <= 18; x++) cells[y][x] = { type: 'SPAWN' };
  }
  for (let y = 9; y <= 12; y++) {
    for (let x = 2; x <= 6; x++) cells[y][x] = { type: 'SPAWN' };
    for (let x = 14; x <= 18; x++) cells[y][x] = { type: 'SPAWN' };
  }

  // Exits at top and bottom of hallway
  cells[0][10] = { type: 'EXIT', exitId: 'North' };
  cells[height - 1][10] = { type: 'EXIT', exitId: 'South' };

  return {
    version: 1,
    name: 'Classroom Floor',
    width,
    height,
    cells,
    exits: [
      { id: 'North', x: 10, y: 0, capacity: 2 },
      { id: 'South', x: 10, y: height - 1, capacity: 2 },
    ],
  };
}

/**
 * 3. Retail Store Preset
 * Open floor plan with shelving units (obstacles) and a main entrance/fire exit.
 */
export function createRetailPreset(): Layout {
  const width = 19;
  const height = 13;
  const cells: Layout['cells'] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        return { type: 'WALL' };
      }
      return { type: 'EMPTY' };
    }),
  );

  // Shelving obstacles
  for (let x of [4, 8, 12]) {
    for (let y = 3; y <= 9; y++) {
      if (y !== 6) {
        cells[y][x] = { type: 'OBSTACLE' };
      }
    }
  }

  // Spawns scattered in aisles
  for (let y = 2; y <= 10; y += 2) {
    for (let x of [2, 6, 10, 15, 16]) {
      cells[y][x] = { type: 'SPAWN' };
    }
  }

  cells[6][0] = { type: 'EXIT', exitId: 'Main' };
  cells[6][width - 1] = { type: 'EXIT', exitId: 'Emergency' };

  return {
    version: 1,
    name: 'Retail Store',
    width,
    height,
    cells,
    exits: [
      { id: 'Main', x: 0, y: 6, capacity: 2 },
      { id: 'Emergency', x: width - 1, y: 6, capacity: 1 },
    ],
  };
}

export const PRESET_LAYOUTS: Layout[] = [
  createDemoPreset(),
  createClassroomPreset(),
  createRetailPreset(),
];
