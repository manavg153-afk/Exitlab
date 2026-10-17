import React from 'react';
import type { Layout, Scenario, Disruptions } from '../../engine/types';

interface ScenarioPanelProps {
  layout: Layout;
  scenario: Scenario;
  disruptions: Disruptions;
  onUpdateDisruptions: (d: Disruptions) => void;
  onUpdateOccupantCount: (count: number) => void;
  onUpdateSeed: (seed: number) => void;
  isSimulating: boolean;
  spawnCapacity: number;
}

export function ScenarioPanel({
  layout,
  scenario,
  disruptions,
  onUpdateDisruptions,
  onUpdateOccupantCount,
  onUpdateSeed,
  isSimulating,
  spawnCapacity,
}: ScenarioPanelProps) {
  const toggleExitBlocked = (exitId: string) => {
    const isBlocked = disruptions.blockedExits.includes(exitId);
    const nextBlocked = isBlocked
      ? disruptions.blockedExits.filter((id) => id !== exitId)
      : [...disruptions.blockedExits, exitId];
    onUpdateDisruptions({
      ...disruptions,
      blockedExits: nextBlocked,
    });
  };

  const clearExtraObstacles = () => {
    onUpdateDisruptions({
      ...disruptions,
      extraObstacles: [],
    });
  };

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
      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
          ⚠️ Disruptions & Scenario
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Test the building: block exits or add extra obstacles, keeping the exact same seed.
        </p>
      </div>

      {/* Exit toggles */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
          Block / Unblock Exits:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {layout.exits.map((ex) => {
            const isBlocked = disruptions.blockedExits.includes(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggleExitBlocked(ex.id)}
                disabled={isSimulating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: isBlocked ? '1px solid #ef4444' : '1px solid #22c55e',
                  background: isBlocked ? '#450a0a' : '#052e16',
                  color: '#f8fafc',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{isBlocked ? '🚫' : '🚪'}</span>
                  <span>Exit {ex.id}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(cap: {ex.capacity}/t)</span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isBlocked ? '#f87171' : '#4ade80',
                  }}
                >
                  {isBlocked ? 'BLOCKED' : 'OPEN'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extra obstacles indicator */}
      <div
        style={{
          background: '#0f172a',
          padding: '0.6rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #334155',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ color: '#cbd5e1' }}>Extra Obstacles: </span>
          <span style={{ fontWeight: 600, color: '#f87171' }}>
            {disruptions.extraObstacles.length}
          </span>
          <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
            (Click simulation cells to toggle obstacles)
          </div>
        </div>
        {disruptions.extraObstacles.length > 0 && (
          <button
            onClick={clearExtraObstacles}
            disabled={isSimulating}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem',
              background: '#334155',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.7rem',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Occupant count & Seed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Occupants:</label>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>
              {scenario.occupantCount} / {spawnCapacity} max
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1, spawnCapacity)}
            value={scenario.occupantCount}
            disabled={isSimulating}
            onChange={(e) => onUpdateOccupantCount(parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '0.25rem' }}>
            Random Seed (Determinism):
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              value={scenario.seed}
              disabled={isSimulating}
              onChange={(e) => onUpdateSeed(parseInt(e.target.value, 10) || 1)}
              style={{
                flex: 1,
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '0.25rem',
                padding: '0.3rem 0.5rem',
                fontSize: '0.8rem',
              }}
            />
            <button
              onClick={() => onUpdateSeed(Math.floor(Math.random() * 100000))}
              disabled={isSimulating}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '0.25rem',
                background: '#334155',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.75rem',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
              }}
            >
              🎲 New Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
