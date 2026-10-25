import React, { useState } from 'react';

interface AddFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  existingNames: string[];
}

export function AddFloorModal({
  isOpen,
  onClose,
  onCreate,
  existingNames,
}: AddFloorModalProps) {
  const [floorName, setFloorName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = floorName.trim();
    if (!trimmed) {
      setError('Floor name cannot be empty.');
      return;
    }
    const duplicate = existingNames.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setError('A floor or preset with this name already exists.');
      return;
    }

    setError(null);
    setFloorName('');
    onCreate(trimmed);
  };

  const handleCancel = () => {
    setError(null);
    setFloorName('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-floor-title"
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
      onClick={handleCancel}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          maxWidth: '440px',
          width: '100%',
          padding: '1.5rem',
          color: '#e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2
            id="add-floor-title"
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0,
            }}
          >
            <span>＋ Add New Floor</span>
          </h2>
          <button
            onClick={handleCancel}
            aria-label="Close add floor dialog"
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="floor-name-input"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#cbd5e1',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Enter Floor Name
            </label>
            <input
              id="floor-name-input"
              type="text"
              autoFocus
              value={floorName}
              onChange={(e) => {
                setFloorName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Level 2, Annex Wing, Cafeteria"
              style={{
                width: '100%',
                background: '#0f172a',
                border: error ? '1px solid #ef4444' : '1px solid #334155',
                color: '#f8fafc',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {error && (
              <p
                style={{
                  color: '#f87171',
                  fontSize: '0.75rem',
                  marginTop: '0.35rem',
                  marginBottom: 0,
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '0.375rem',
                background: '#334155',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '0.375rem',
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create Floor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
