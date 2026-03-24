import React from 'react';

export default function StatsPanel({ photoCount, edgeCount, filter }) {
  return (
    <div style={styles.panel}>
      <div style={styles.stat}>
        <span style={styles.value}>{photoCount}</span>
        <span style={styles.label}>photos</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.stat}>
        <span style={styles.value}>{edgeCount}</span>
        <span style={styles.label}>connections</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.stat}>
        <span style={styles.value}>{filter === 'all' ? '—' : '5'}</span>
        <span style={styles.label}>clusters</span>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: '16px',
    right: '180px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 20,
  },
  stat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  value: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  label: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.02em',
  },
  divider: {
    width: '1px',
    height: '16px',
    background: 'var(--border-subtle)',
  },
};
