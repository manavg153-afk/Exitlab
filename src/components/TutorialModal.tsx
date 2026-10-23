import React from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          maxWidth: '650px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          color: '#e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="tutorial-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎓 Welcome to ExitLab!</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1rem' }}>
          ExitLab is an interactive, browser-based evacuation stress-testing simulator. It helps you explore the critical question:
          <strong style={{ color: '#38bdf8' }}> "What happens if an emergency exit is blocked or compromised?"</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>
              1. ✏️ Floor-Plan Editor
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Draw walls, doors, exits, obstacles, and occupant spawn zones. Customize exit throughput capacity (people per tick), export/import JSON, or choose from presets.
            </p>
          </div>

          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.25rem' }}>
              2. ▶️ Simulation & 60-Second Demo Story
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Run the baseline scenario with the Demo preset to see fast evacuation through exits A and B. Click <strong>"Set This Run As Baseline"</strong> to lock in the baseline metrics.
            </p>
          </div>

          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>
              3. ⚠️ Disruptions & Stress-Testing
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Block Exit B with a single click, or click cells to introduce debris/obstacles. Rerun with the exact same seed to observe rerouting, severe corridor congestion, and wait time deltas.
            </p>
          </div>

          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.25rem' }}>
              4. 📊 Analysis, Heatmaps & Reports
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Turn on the 🔥 Heatmap overlay to spot bottlenecks, inspect Recharts comparative curves, read plain-language bottleneck explanations, and export print-ready summary reports.
            </p>
          </div>

          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#a855f7', marginBottom: '0.25rem' }}>
              ⌨️ Keyboard Shortcuts (Simulation Tab)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              <kbd style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #475569', color: '#f8fafc' }}>Space</kbd> Play / Pause &nbsp;|&nbsp;
              <kbd style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #475569', color: '#f8fafc' }}>S</kbd> Step 1 Tick &nbsp;|&nbsp;
              <kbd style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #475569', color: '#f8fafc' }}>R</kbd> Restart &nbsp;|&nbsp;
              <kbd style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #475569', color: '#f8fafc' }}>H</kbd> Toggle Heatmap
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              background: '#0284c7',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Got it, let's explore!
          </button>
        </div>
      </div>
    </div>
  );
}
