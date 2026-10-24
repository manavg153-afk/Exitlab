import React, { useRef, useEffect } from 'react';
import type { Layout, Scenario, Disruptions } from '../../engine/types';
import { CELL_SIZE, drawGrid, drawAgents } from '../render/canvasRenderer';
import type { SimFrame } from '../../engine/simulate';

interface SimulationViewProps {
  layout: Layout;
  scenario: Scenario;
  currentFrame: SimFrame | null;
  heatOverlay?: number[][];
  showHeatmap: boolean;
  onCellClick?: (x: number, y: number) => void;
  disruptions: Disruptions;
}

export function SimulationView({
  layout,
  currentFrame,
  heatOverlay,
  showHeatmap,
  onCellClick,
  disruptions,
}: SimulationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw floor plan with disruptions
    const blockedExitsSet = new Set(disruptions.blockedExits);
    const extraObstaclesSet = new Set(
      disruptions.extraObstacles.map((o) => o.y * layout.width + o.x),
    );

    drawGrid(ctx, layout, {
      blockedExits: blockedExitsSet,
      extraObstacles: extraObstaclesSet,
      heat: showHeatmap ? heatOverlay : undefined,
    });

    // Draw agents if there is an active frame
    if (currentFrame?.agents) {
      drawAgents(ctx, currentFrame.agents);
    }
  }, [layout, currentFrame, heatOverlay, showHeatmap, disruptions]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (x >= 0 && y >= 0 && x < layout.width && y < layout.height) {
      onCellClick(x, y);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: '#090d16',
        borderRadius: '0.5rem',
        border: '1px solid #1e293b',
        display: 'flex',
        padding: '1rem',
      }}
    >
      <canvas
        ref={canvasRef}
        width={layout.width * CELL_SIZE}
        height={layout.height * CELL_SIZE}
        onClick={handleClick}
        style={{
          margin: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          borderRadius: '4px',
          cursor: onCellClick ? 'pointer' : 'default',
        }}
      />
    </div>
  );
}
