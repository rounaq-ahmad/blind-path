"use strict";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildGrid(cols, rows, seed, loop) {
  const r = mulberry32(seed);
  const g = Array.from({ length: rows }, () => Array(cols).fill(0));
  (function carve(x, y) {
    g[y][x] = 1;
    for (const d of shuffle(
      [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }],
      r
    )) {
      const nx = x + d.x, ny = y + d.y;
      if (nx <= 0 || nx >= cols - 1 || ny <= 0 || ny >= rows - 1 || g[ny][nx] === 1) continue;
      g[y + d.y / 2][x + d.x / 2] = 1;
      carve(nx, ny);
    }
  })(1, 1);

  const attempts = Math.floor((cols * rows) / loop);
  for (let i = 0; i < attempts; i++) {
    const x = 2 + Math.floor(r() * (cols - 4));
    const y = 2 + Math.floor(r() * (rows - 4));
    if (g[y][x] === 1) continue;
    if ((g[y][x - 1] === 1 && g[y][x + 1] === 1) || (g[y - 1][x] === 1 && g[y + 1][x] === 1)) {
      g[y][x] = 1;
    }
  }
  return g;
}

const DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

export function findExit(g, start, f) {
  const rows = g.length, cols = g[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const q = [start];
  dist[start.y][start.x] = 0;
  let far = start;
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    if (dist[c.y][c.x] > dist[far.y][far.x]) far = c;
    for (const d of DIRS) {
      const nx = c.x + d.x, ny = c.y + d.y;
      if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
      if (g[ny][nx] !== 1 || dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[c.y][c.x] + 1;
      q.push({ x: nx, y: ny });
    }
  }
  if (f >= 1) return far;
  const target = Math.max(4, Math.round(dist[far.y][far.x] * f));
  let best = far, bd = Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (dist[y][x] < 0) continue;
      const dd = Math.abs(dist[y][x] - target);
      if (dd < bd || (dd === bd && dist[y][x] > dist[best.y][best.x])) {
        bd = dd; best = { x, y };
      }
    }
  }
  return best;
}

export function canMove(grid, x, y) {
  const rows = grid.length, cols = grid[0].length;
  if (y < 0 || y >= rows || x < 0 || x >= cols) return false;
  return grid[y][x] === 1;
}
