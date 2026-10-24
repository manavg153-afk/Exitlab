import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Layout, CellType, ExitDef } from '../../engine/types';
import { CELL_SIZE, drawGrid } from '../render/canvasRenderer';

export type Tool = CellType | 'ERASE';

interface FloorPlanEditorProps {
  layout: Layout;
  onChange: (layout: Layout) => void;
  selectedTool: Tool;
  onSelectTool: (tool: Tool) => void;
  isSimulating: boolean;
}

export function FloorPlanEditor({
  layout,
  onChange,
  selectedTool,
  onSelectTool,
  isSimulating,
}: FloorPlanEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<Layout[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(layout))]);
      setHistoryIndex(0);
    }
  }, []);

  const pushHistory = (newLayout: Layout) => {
    const upToCurrent = history.slice(0, historyIndex + 1);
    setHistory([...upToCurrent, JSON.parse(JSON.stringify(newLayout))]);
    setHistoryIndex(upToCurrent.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(JSON.parse(JSON.stringify(prev)));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange(JSON.parse(JSON.stringify(next)));
    }
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGrid(ctx, layout);
  }, [layout]);

  const applyToolAtCell = useCallback(
    (x: number, y: number, currentLayout: Layout): Layout => {
      if (x < 0 || y < 0 || x >= currentLayout.width || y >= currentLayout.height) {
        return currentLayout;
      }

      const nextLayout: Layout = {
        ...currentLayout,
        cells: currentLayout.cells.map((row) => row.map((cell) => ({ ...cell }))),
        exits: [...currentLayout.exits.map((e) => ({ ...e }))],
      };

      const targetCell = nextLayout.cells[y][x];

      if (selectedTool === 'ERASE') {
        // If it was an exit, remove from exits array
        if (targetCell.type === 'EXIT' && targetCell.exitId) {
          nextLayout.exits = nextLayout.exits.filter((e) => e.id !== targetCell.exitId);
        }
        nextLayout.cells[y][x] = { type: 'EMPTY' };
        return nextLayout;
      }

      if (selectedTool === 'EXIT') {
        // Generate a new unique exit letter (A, B, C...)
        const existingIds = new Set(nextLayout.exits.map((e) => e.id));
        let exitLetter = 'A';
        for (let i = 0; i < 26; i++) {
          const char = String.fromCharCode(65 + i);
          if (!existingIds.has(char)) {
            exitLetter = char;
            break;
          }
        }
        nextLayout.cells[y][x] = { type: 'EXIT', exitId: exitLetter };
        // Add exit definition with default capacity 1
        nextLayout.exits.push({ id: exitLetter, x, y, capacity: 1 });
        return nextLayout;
      }

      // If replacing an existing EXIT cell with a wall/empty/etc., remove from exits array
      if (targetCell.type === 'EXIT' && targetCell.exitId) {
        nextLayout.exits = nextLayout.exits.filter((e) => e.id !== targetCell.exitId);
      }

      nextLayout.cells[y][x] = { type: selectedTool };
      return nextLayout;
    },
    [selectedTool],
  );

  const getCellCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.floor(clientX / CELL_SIZE);
    const y = Math.floor(clientY / CELL_SIZE);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;
    const coords = getCellCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    const updated = applyToolAtCell(coords.x, coords.y, layout);
    onChange(updated);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSimulating) return;
    const coords = getCellCoords(e);
    if (!coords) return;
    const updated = applyToolAtCell(coords.x, coords.y, layout);
    onChange(updated);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      pushHistory(layout);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire floor plan?')) {
      const cleared: Layout = {
        ...layout,
        cells: Array.from({ length: layout.height }, () =>
          Array.from({ length: layout.width }, () => ({ type: 'EMPTY' })),
        ),
        exits: [],
      };
      onChange(cleared);
      pushHistory(cleared);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(layout, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${layout.name.toLowerCase().replace(/\s+/g, '_')}_layout.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.version === 1 && parsed.cells && parsed.exits) {
          onChange(parsed);
          pushHistory(parsed);
        } else {
          alert('Invalid layout JSON format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tools: { tool: Tool; label: string; icon: string; color: string }[] = [
    { tool: 'WALL', label: 'Wall', icon: '🧱', color: '#334155' },
    { tool: 'DOOR', label: 'Door', icon: '🚪', color: '#3b82f6' },
    { tool: 'EXIT', label: 'Exit', icon: '🟢', color: '#22c55e' },
    { tool: 'OBSTACLE', label: 'Obstacle', icon: '📦', color: '#64748b' },
    { tool: 'SPAWN', label: 'Spawn Area', icon: '👥', color: '#0284c7' },
    { tool: 'ERASE', label: 'Eraser', icon: '🧹', color: '#475569' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Tool bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.25rem' }}>
          Tools:
        </span>
        {tools.map((t) => (
          <button
            key={t.tool}
            onClick={() => onSelectTool(t.tool)}
            disabled={isSimulating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              border: selectedTool === t.tool ? '2px solid #38bdf8' : '1px solid #334155',
              background: selectedTool === t.tool ? '#0369a1' : '#1e293b',
              color: '#f8fafc',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 || isSimulating}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '0.375rem',
              background: '#334155',
              border: 'none',
              color: historyIndex <= 0 ? '#64748b' : '#f8fafc',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            ↩ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1 || isSimulating}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '0.375rem',
              background: '#334155',
              border: 'none',
              color: historyIndex >= history.length - 1 ? '#64748b' : '#f8fafc',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            ↪ Redo
          </button>
          <button
            onClick={handleClear}
            disabled={isSimulating}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '0.375rem',
              background: '#7f1d1d',
              border: 'none',
              color: '#f8fafc',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Canvas container */}
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            margin: 'auto',
            cursor: isSimulating ? 'default' : 'crosshair',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Bottom controls: Exit properties and JSON import/export */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1e293b',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#94a3b8' }}>Exits ({layout.exits.length}):</span>
          {layout.exits.map((ex) => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Exit {ex.id}:</span>
              <label style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>Capacity/tick:</label>
              <input
                type="number"
                min={0}
                max={10}
                value={ex.capacity}
                disabled={isSimulating}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  const nextExits = layout.exits.map((x) =>
                    x.id === ex.id ? { ...x, capacity: Math.max(0, val) } : x,
                  );
                  onChange({ ...layout, exits: nextExits });
                }}
                style={{
                  width: '45px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '3px',
                  padding: '2px 4px',
                  fontSize: '0.75rem',
                }}
              />
            </div>
          ))}
          {layout.exits.length === 0 && (
            <span style={{ color: '#ef4444', fontStyle: 'italic' }}>
              Place at least one Exit using the Exit tool!
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleExportJSON}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '0.25rem',
              background: '#0284c7',
              border: 'none',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Export JSON
          </button>
          <label
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '0.25rem',
              background: '#334155',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
