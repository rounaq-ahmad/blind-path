export const ACH_DEFS = {
  // Milestones
  first_clear:      { label: 'First Light',      desc: 'Complete your first level',          group: 'Milestones' },
  mazes_10:         { label: 'Pathfinder',        desc: 'Complete 10 mazes total',            group: 'Milestones' },
  mazes_50:         { label: 'Deep Walker',       desc: 'Complete 50 mazes total',            group: 'Milestones' },
  // Journey
  journey_complete: { label: 'All Arches Found', desc: 'Complete all 7 journey levels',      group: 'Journey'    },
  // Skill
  sub_par:          { label: 'Under Par',         desc: 'Finish a level under par steps',     group: 'Skill'      },
  sub_par_5:        { label: 'Sharp Eye',         desc: 'Finish under par 5 times',           group: 'Skill'      },
  sub_par_10:       { label: 'Precision Walker',  desc: 'Finish under par 10 times',          group: 'Skill'      },
  // Steps
  steps_1k:         { label: 'Wanderer',          desc: 'Walk 1,000 total steps',             group: 'Steps'      },
  steps_10k:        { label: 'Pathseeker',        desc: 'Walk 10,000 total steps',            group: 'Steps'      },
  steps_50k:        { label: 'The Long Dark',     desc: 'Walk 50,000 total steps',            group: 'Steps'      },
  // Streak
  streak_3:         { label: '3-Day Glow',        desc: 'Play daily 3 days in a row',         group: 'Streak'     },
  streak_7:         { label: '7-Day Flame',       desc: 'Play daily 7 days in a row',         group: 'Streak'     },
  streak_14:        { label: 'Fortnight Fire',    desc: 'Play daily 14 days in a row',        group: 'Streak'     },
  streak_30:        { label: 'Eternal Ember',     desc: 'Play daily 30 days in a row',        group: 'Streak'     },
  // Daily / Weekly
  daily_3:          { label: 'Daily Devotee',     desc: 'Complete 3 daily mazes',             group: 'Daily'      },
  daily_10:         { label: 'Daily Pilgrim',     desc: 'Complete 10 daily mazes',            group: 'Daily'      },
  weekly_first:     { label: 'Weekly Wanderer',   desc: 'Complete your first weekly maze',    group: 'Daily'      },
  // Endless
  endless_5:        { label: 'Into the Depths',   desc: 'Reach depth 5 in Endless mode',      group: 'Endless'    },
  endless_20:       { label: 'Abyss Walker',      desc: 'Reach depth 20 in Endless mode',     group: 'Endless'    },
  // Social
  builder:          { label: 'Maze Crafter',      desc: 'Share a custom-built maze',          group: 'Social'     },
  card_share:       { label: 'Lantern Bearer',    desc: 'Share a score card image',           group: 'Social'     },
};

export function checkNewAchievements(existing, stats, streak, mode, results) {
  const earned = new Set(existing);
  const newly  = [];

  const check = (id) => { if (!earned.has(id)) { newly.push(id); earned.add(id); } };

  if (results.length > 0)                         check('first_clear');
  if (stats.totalMazes  >= 10)                    check('mazes_10');
  if (stats.totalMazes  >= 50)                    check('mazes_50');
  if (mode === 'journey' && results.length >= 7)  check('journey_complete');
  if (results.some(r => r.steps <= r.par))        check('sub_par');
  if (stats.subParCount >= 5)                     check('sub_par_5');
  if (stats.subParCount >= 10)                    check('sub_par_10');
  if (stats.totalSteps  >= 1000)                  check('steps_1k');
  if (stats.totalSteps  >= 10000)                 check('steps_10k');
  if (stats.totalSteps  >= 50000)                 check('steps_50k');
  if (streak >= 3)                                check('streak_3');
  if (streak >= 7)                                check('streak_7');
  if (streak >= 14)                               check('streak_14');
  if (streak >= 30)                               check('streak_30');
  if (stats.dailyCount  >= 3)                     check('daily_3');
  if (stats.dailyCount  >= 10)                    check('daily_10');
  if (mode === 'weekly' && results.length > 0)    check('weekly_first');
  if (stats.endlessMaxDepth >= 5)                 check('endless_5');
  if (stats.endlessMaxDepth >= 20)                check('endless_20');
  if (stats.customShared >= 1)                    check('builder');
  if (stats.cardShared   >= 1)                    check('card_share');

  return newly;
}
