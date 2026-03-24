import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { generatePhotos, generateEdges, clusterConfigs, getDefaultColor } from '../data/photos';
import { useForceSimulation } from '../hooks/useForceSimulation';
import FilterBar from './FilterBar';
import Legend from './Legend';
import Tooltip from './Tooltip';
import StatsPanel from './StatsPanel';

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GraphCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const frameRef = useRef(null);
  const colorsRef = useRef([]);

  const photos = useMemo(() => generatePhotos(120), []);
  const edges = useMemo(() => generateEdges(photos), [photos]);
  const sim = useForceSimulation();

  // Assign default colors
  const assignColors = useCallback(
    (currentFilter) => {
      const rand = mulberry32(55);
      colorsRef.current = photos.map((p) => {
        if (currentFilter === 'all') {
          const mix = rand();
          if (mix < 0.35) return '#ffffff';
          if (mix < 0.48) return '#aaaaaa';
          if (mix < 0.56) return '#85B7EB';
          if (mix < 0.64) return '#5DCAA5';
          if (mix < 0.72) return '#F0997B';
          if (mix < 0.80) return '#AFA9EC';
          if (mix < 0.88) return '#ED93B1';
          return '#FAC775';
        }
        return clusterConfigs[currentFilter].clusters[p[currentFilter]].color;
      });
    },
    [photos]
  );

  // Initialize simulation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    setDims({ w, h });
    sim.init(photos, edges, w, h);
    assignColors('all');
  }, [photos, edges, sim.init, assignColors]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter change
  const handleFilterChange = useCallback(
    (f) => {
      setFilter(f);
      assignColors(f);
      sim.setTargets(photos, f, dims.w, dims.h, clusterConfigs);
    },
    [photos, dims, sim.setTargets, assignColors]
  );

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const render = () => {
      const { w, h } = dims;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nodes = sim.tick(w, h);
      const colors = colorsRef.current;

      // Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      for (let gx = 0; gx < w; gx += 40) {
        for (let gy = 0; gy < h; gy += 40) {
          ctx.fillRect(gx, gy, 1, 1);
        }
      }

      // Edges
      for (const e of edges) {
        const a = nodes[e.source];
        const b = nodes[e.target];
        if (!a || !b) continue;
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        let alpha = Math.max(0, 0.07 - dist * 0.00018) * e.strength;
        const isHighlighted =
          hovered !== null && (e.source === hovered || e.target === hovered);
        if (isHighlighted) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.45, alpha * 6)})`;
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.4;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Cluster labels
      if (filter !== 'all') {
        const config = clusterConfigs[filter];
        const positions = getClusterLabelPositions(config.clusters.length, w, h);
        ctx.textAlign = 'center';
        ctx.font = `500 11px 'DM Sans', sans-serif`;
        config.clusters.forEach((c, i) => {
          ctx.fillStyle = c.color + '44';
          ctx.fillText(c.name, positions[i].x, positions[i].y - h * 0.14);
        });
      }

      // Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const col = colors[i] || '#888';
        const isHov = hovered === i;
        if (isHov) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 16;
        }
        ctx.globalAlpha = isHov ? 1 : 0.82;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(n.x, n.y, isHov ? n.r + 2 : n.r, 0, Math.PI * 2);
        ctx.fill();
        if (isHov) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [dims, edges, filter, hovered, sim.tick]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setMousePos({ x: mx, y: my });

      const nodes = sim.nodesRef.current;
      let found = null;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const dx = mx - nodes[i].x;
        const dy = my - nodes[i].y;
        if (dx * dx + dy * dy < (nodes[i].r + 5) * (nodes[i].r + 5)) {
          found = i;
          break;
        }
      }
      setHovered(found);
    },
    [sim.nodesRef]
  );

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
  }, []);

  const tooltipData = hovered !== null ? photos[hovered] : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#050505',
      }}
    >
      <FilterBar active={filter} onChange={handleFilterChange} />
      <StatsPanel photoCount={photos.length} edgeCount={edges.length} filter={filter} />
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: hovered !== null ? 'pointer' : 'default' }}
      />
      <Tooltip data={tooltipData} x={mousePos.x} y={mousePos.y} />
      <Legend filter={filter} />
    </div>
  );
}

function getClusterLabelPositions(count, w, h) {
  const layouts = {
    3: [{ x: 0.25, y: 0.35 }, { x: 0.65, y: 0.3 }, { x: 0.45, y: 0.7 }],
    4: [{ x: 0.25, y: 0.3 }, { x: 0.7, y: 0.28 }, { x: 0.3, y: 0.7 }, { x: 0.72, y: 0.68 }],
    5: [
      { x: 0.22, y: 0.28 },
      { x: 0.58, y: 0.22 },
      { x: 0.82, y: 0.42 },
      { x: 0.35, y: 0.65 },
      { x: 0.7, y: 0.72 },
    ],
  };
  return (layouts[count] || layouts[5]).map((p) => ({ x: p.x * w, y: p.y * h }));
}
