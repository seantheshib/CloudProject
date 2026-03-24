import React from 'react';

const filters = [
  { key: 'all', label: 'All photos', icon: '◎' },
  { key: 'location', label: 'Location', icon: '◈' },
  { key: 'time', label: 'Timeline', icon: '◷' },
  { key: 'people', label: 'People', icon: '◉' },
];

export default function FilterBar({ active, onChange }) {
  return (
    <div style={styles.bar}>
      <div style={styles.filters}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              ...styles.btn,
              ...(active === f.key ? styles.btnActive : {}),
            }}
          >
            <span style={styles.icon}>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>⬡</span>
        <span style={styles.brandText}>CloudGraph</span>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    zIndex: 20,
    background: 'linear-gradient(to bottom, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0) 100%)',
    pointerEvents: 'none',
  },
  filters: {
    display: 'flex',
    gap: '6px',
    pointerEvents: 'auto',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 400,
    letterSpacing: '0.01em',
    transition: 'all var(--transition-default)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  btnActive: {
    background: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.25)',
    color: '#fff',
    fontWeight: 500,
  },
  icon: {
    fontSize: '11px',
    opacity: 0.7,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'auto',
  },
  brandIcon: {
    fontSize: '18px',
    color: 'var(--accent-purple)',
    opacity: 0.8,
  },
  brandText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
};
