import { LEVELS } from './levels';

const WEEKLY_MOODS = [
  { mood: 'Labyrinth', cols: 29, rows: 19, palIdx: 5 },
  { mood: 'Twilight',  cols: 27, rows: 19, palIdx: 3 },
  { mood: 'Abyss',     cols: 31, rows: 21, palIdx: 6 },
  { mood: 'Mirage',    cols: 25, rows: 19, palIdx: 2 },
  { mood: 'Deepstone', cols: 29, rows: 21, palIdx: 4 },
  { mood: 'Rift',      cols: 27, rows: 21, palIdx: 1 },
  { mood: 'Veil',      cols: 33, rows: 19, palIdx: 0 },
];

export function getWeeklyConfig() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const day   = Math.floor((now - start) / 86400000);
  const week  = Math.floor((day + start.getDay()) / 7);
  const key   = `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  const seed  = ((now.getFullYear() * 53 + week) * 7919 + 9901) >>> 0;
  const cfg   = WEEKLY_MOODS[week % WEEKLY_MOODS.length];
  return {
    mood:    cfg.mood,
    sub:     `week ${week} · bigger & harder`,
    cols:    cfg.cols,
    rows:    cfg.rows,
    seed,
    reveal:  2.2,
    pulse:   5.0,
    exitF:   1.0,
    loop:    14,
    par:     Math.round(cfg.cols * cfg.rows * 0.14),
    pal:     LEVELS[cfg.palIdx].pal,
    portals: true,
    dateKey: key,
  };
}
