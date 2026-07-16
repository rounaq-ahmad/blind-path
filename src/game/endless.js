import { LEVELS } from './levels';

const MOODS = ['Abyss', 'Void', 'Murk', 'Hollow', 'Shade', 'Drift'];
const SUBS  = [
  'the walls forget your name',
  'no map reaches this far',
  'deeper than memory',
  'only the glow knows the way',
  'the corridor breathes',
  'silence louder than before',
];

export function getEndlessLevel(endlessIdx) {
  const n    = endlessIdx + 1;
  const pal  = LEVELS[endlessIdx % LEVELS.length].pal;
  const cols = Math.min(55, 33 + n * 4);
  const rows = Math.min(41, 23 + n * 3);

  return {
    mood:   MOODS[endlessIdx % MOODS.length],
    sub:    SUBS[endlessIdx % SUBS.length],
    cols,   rows,
    seed:   (99991 + n * 7919) >>> 0,
    reveal: Math.max(1.8, 2.8 - n * 0.1),
    pulse:  Math.max(3.5, 5.2 - n * 0.2),
    exitF:  1.0,
    loop:   Math.max(8, 18 - n),
    par:     Math.round(cols * rows * 0.13),
    pal,
    portals: endlessIdx >= 4,
  };
}
