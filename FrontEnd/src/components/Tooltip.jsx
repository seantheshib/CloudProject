import React from 'react';

export default function Tooltip({ data, x, y }) {
  if (!data) return null;

  return (
    <div
      style={{
        ...styles.tooltip,
        left: x + 16,
        top: y - 12,
      }}
    >
      <div style={styles.label}>{data.label}</div>
      <div style={styles.meta}>
        <span style={styles.tag}>
          <span style={{ ...styles.tagDot, background: '#ED93B1' }} />
          {data.locationName}
        </span>
        <span style={styles.tag}>
          <span style={{ ...styles.tagDot, background: '#85B7EB' }} />
          {data.timeName}
        </span>
        <span style={styles.tag}>
          <span style={{ ...styles.tagDot, background: '#5DCAA5' }} />
          {data.peopleName}
        </span>
      </div>
    </div>
  );
}

const styles = {
  tooltip: {
    position: 'absolute',
    background: 'rgba(12, 12, 12, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    pointerEvents: 'none',
    zIndex: 30,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    maxWidth: '220px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    marginBottom: '6px',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
  },
  tagDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
};
