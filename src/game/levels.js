export const LEVELS = [
  {
    mood: "Glow",
    sub: "where the dark is still kind",
    cols: 15, rows: 11, seed: 4103,
    reveal: 3.5, pulse: 6.6, exitF: 0.8, loop: 40, par: 42,
    pal: { wall: "#322747", rim: "#69538c", floor: "#130d1c", lit: "#e3c8ee", glow: "#f3e6fb", air: "#cda9e6", bg: "#130d1f" },
  },
  {
    mood: "Gentle",
    sub: "a soft turn, then another",
    cols: 19, rows: 13, seed: 6239,
    reveal: 3.4, pulse: 6.4, exitF: 0.85, loop: 32, par: 63,
    pal: { wall: "#1e3328", rim: "#3f6e52", floor: "#0a160f", lit: "#a6e6bf", glow: "#cdf2dd", air: "#84dcae", bg: "#0e1a14" },
  },
  {
    mood: "Quiet",
    sub: "the walls remember your steps",
    cols: 21, rows: 15, seed: 7331,
    reveal: 3.3, pulse: 6.0, exitF: 0.9, loop: 22, par: 50,
    pal: { wall: "#2a2546", rim: "#564d88", floor: "#0d0b1a", lit: "#c6b6ff", glow: "#e4dafc", air: "#b09cff", bg: "#100c22" },
  },
  {
    mood: "Winding",
    sub: "long corridors of held breath",
    cols: 25, rows: 17, seed: 8201,
    reveal: 3.3, pulse: 5.9, exitF: 1.0, loop: 18, par: 70,
    pal: { wall: "#203046", rim: "#3c5c84", floor: "#0a121f", lit: "#9ec9ff", glow: "#cfe4ff", air: "#8fb6ff", bg: "#0c1422" },
  },
  {
    mood: "Deep",
    sub: "where the light grows thin",
    cols: 29, rows: 19, seed: 9034,
    reveal: 3.1, pulse: 5.6, exitF: 1.0, loop: 18, par: 86,
    pal: { wall: "#153034", rim: "#2f6068", floor: "#06141a", lit: "#84d8cf", glow: "#bdeee8", air: "#6fd2c8", bg: "#08161a" },
  },
  {
    mood: "Blind",
    sub: "trust the glow you carry",
    cols: 31, rows: 21, seed: 12041,
    reveal: 2.9, pulse: 5.4, exitF: 1.0, loop: 17, par: 122,
    pal: { wall: "#301f2b", rim: "#623f56", floor: "#150810", lit: "#f3aecd", glow: "#fcd4e6", air: "#df9fc4", bg: "#160a12" },
  },
  {
    mood: "Ember",
    sub: "warmth at the edge of nothing",
    cols: 35, rows: 23, seed: 17483,
    reveal: 2.7, pulse: 5.0, exitF: 1.0, loop: 14, par: 148,
    pal: { wall: "#3d1f00", rim: "#a0522d", floor: "#1a0a00", lit: "#ffd07a", glow: "#fff0c0", air: "#ffb347", bg: "#180900" },
  },
];

// Returns a config whose seed changes every calendar day — no backend needed
export function getDailyConfig() {
  const d   = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) {
    seed = ((seed * 31 + dateKey.charCodeAt(i)) >>> 0);
  }
  return {
    mood: 'Daily',
    sub: dateKey,
    cols: 23, rows: 17,
    seed: seed || 42,
    reveal: 3.2, pulse: 6.0, exitF: 0.95, loop: 25, par: 65,
    pal: LEVELS[2].pal,   // purple Quiet palette
    dateKey,
  };
}
