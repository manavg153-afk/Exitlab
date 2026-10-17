export function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🚪 ExitLab</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
          Evacuation stress-testing simulator
        </p>
      </header>

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '1rem',
          minHeight: 'calc(100vh - 8rem)',
        }}
      >
        {/* Left: canvas area */}
        <section
          style={{
            background: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          Canvas editor (Phase 1)
        </section>

        {/* Right: controls panel */}
        <aside
          style={{
            background: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#64748b',
          }}
        >
          Controls panel (Phase 2)
        </aside>
      </main>

      <footer
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.75rem',
        }}
      >
        Comparative educational estimate — not a safety certification.
      </footer>
    </div>
  );
}
