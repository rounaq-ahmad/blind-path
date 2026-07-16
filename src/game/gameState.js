import { buildGrid, findExit, canMove } from './maze';
import { LEVELS } from './levels';

export function createLevel(idx, customConfig) {
  const t = customConfig || LEVELS[Math.min(idx, LEVELS.length - 1)];
  const grid = buildGrid(t.cols, t.rows, t.seed, t.loop);
  const start = { x: 1, y: 1 };
  const exit = findExit(grid, start, t.exitF);
  const revealed = Array.from({ length: t.rows }, () => Array(t.cols).fill(false));

  return {
    idx,
    t,
    grid,
    start,
    exit,
    revealed,
    player: { ...start },
    steps: 0,
    complete: false,
    pulseCharge: 1,
    pulseActive: false,
    pulseRadius: 0,
  };
}

export function revealAround(state, radius) {
  const { player, grid, revealed, t } = state;
  const rows = t.rows, cols = t.cols;
  const r = Math.ceil(radius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const nx = player.x + dx, ny = player.y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        revealed[ny][nx] = true;
      }
    }
  }
}

export function movePlayer(state, dir) {
  if (state.complete) return { moved: false, hit: false };
  const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const nx = state.player.x + dx, ny = state.player.y + dy;
  if (!canMove(state.grid, nx, ny)) return { moved: false, hit: true };
  state.player = { x: nx, y: ny };
  state.steps += 1;
  revealAround(state, state.t.reveal);
  if (nx === state.exit.x && ny === state.exit.y) {
    state.complete = true;
  }
  return { moved: true, hit: false };
}

export function triggerPulse(state) {
  if (state.pulseCharge < 1) return false;
  state.pulseCharge = 0;
  state.pulseActive = true;
  state.pulseRadius = 0;
  revealAround(state, state.t.pulse);
  return true;
}

export function calcScore(steps, par) {
  if (steps <= par) return 100;
  const ratio = steps / par;
  return Math.max(0, Math.round(100 - (ratio - 1) * 60));
}

export function calcPercentile(score) {
  if (score >= 95) return 99;
  if (score >= 85) return 90;
  if (score >= 70) return 75;
  if (score >= 50) return 55;
  if (score >= 30) return 35;
  return 15;
}
