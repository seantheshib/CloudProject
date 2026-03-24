import { useRef, useCallback } from 'react';

export function useForceSimulation() {
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const targetRef = useRef([]);
  const animRef = useRef(1);
  const filterRef = useRef('all');

  const init = useCallback((photos, edges, width, height) => {
    const rand = mulberry32(77);
    nodesRef.current = photos.map((p) => ({
      x: width * 0.12 + rand() * width * 0.76,
      y: height * 0.08 + rand() * height * 0.8,
      vx: 0,
      vy: 0,
      r: p.radius,
    }));
    edgesRef.current = edges;
    targetRef.current = nodesRef.current.map((n) => ({ x: n.x, y: n.y }));
  }, []);

  const setTargets = useCallback((photos, filter, width, height, clusterConfigs) => {
    filterRef.current = filter;
    animRef.current = 0;
    const rand = mulberry32(99);

    if (filter === 'all') {
      targetRef.current = photos.map(() => ({
        x: width * 0.12 + rand() * width * 0.76,
        y: height * 0.08 + rand() * height * 0.8,
      }));
    } else {
      const clusters = clusterConfigs[filter].clusters;
      const count = clusters.length;
      const positions = getClusterPositions(count, width, height);

      targetRef.current = photos.map((p) => {
        const ci = p[filter];
        const pos = positions[ci];
        const angle = rand() * Math.PI * 2;
        const dist = rand() * Math.min(width, height) * 0.12;
        return {
          x: pos.x + Math.cos(angle) * dist,
          y: pos.y + Math.sin(angle) * dist,
        };
      });
    }
  }, []);

  const tick = useCallback((width, height) => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const targets = targetRef.current;
    const N = nodes.length;

    // Repulsion
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 45) {
          const force = (45 - dist) * 0.025;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }
    }

    // Edge springs
    const isFiltered = filterRef.current !== 'all';
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = isFiltered ? 25 : 55;
      const force = (dist - target) * 0.0008 * e.strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Animate toward cluster targets
    if (animRef.current < 1) {
      animRef.current = Math.min(1, animRef.current + 0.02);
      const ease = 1 - Math.pow(1 - animRef.current, 3);
      for (let i = 0; i < N; i++) {
        nodes[i].vx += (targets[i].x - nodes[i].x) * 0.055 * ease;
        nodes[i].vy += (targets[i].y - nodes[i].y) * 0.055 * ease;
      }
    }

    // Integrate
    for (const n of nodes) {
      n.vx *= 0.84; n.vy *= 0.84;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.r + 8, Math.min(width - n.r - 8, n.x));
      n.y = Math.max(n.r + 8, Math.min(height - n.r - 8, n.y));
    }

    return nodes;
  }, []);

  return { nodesRef, edgesRef, init, setTargets, tick };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getClusterPositions(count, w, h) {
  const layouts = {
    3: [
      { x: 0.25, y: 0.35 },
      { x: 0.65, y: 0.3 },
      { x: 0.45, y: 0.7 },
    ],
    4: [
      { x: 0.25, y: 0.3 },
      { x: 0.7, y: 0.28 },
      { x: 0.3, y: 0.7 },
      { x: 0.72, y: 0.68 },
    ],
    5: [
      { x: 0.22, y: 0.28 },
      { x: 0.58, y: 0.22 },
      { x: 0.82, y: 0.42 },
      { x: 0.35, y: 0.65 },
      { x: 0.7, y: 0.72 },
    ],
  };

  const positions = layouts[count] || layouts[5];
  return positions.map((p) => ({ x: p.x * w, y: p.y * h }));
}
