import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@bp_lifetime_stats';

const DEFAULT = {
  totalSteps:     0,
  totalMazes:     0,
  totalTime:      0,
  moodCounts:     {},
  longestStreak:  0,
  subParCount:    0,
  dailyCount:     0,
  weeklyCount:    0,
  endlessMaxDepth: 0,
  customShared:   0,
  cardShared:     0,
};

export async function getStats() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

export async function recordResults(results, mode, streak) {
  try {
    const cur = await getStats();
    const u   = { ...cur, moodCounts: { ...cur.moodCounts } };

    for (const r of results) {
      u.totalSteps += r.steps || 0;
      u.totalMazes += 1;
      u.totalTime  += r.time  || 0;
      if (r.mood) u.moodCounts[r.mood] = (u.moodCounts[r.mood] || 0) + 1;
      if (r.steps <= r.par) u.subParCount += 1;
    }
    if (mode === 'daily')  u.dailyCount  += 1;
    if (mode === 'weekly') u.weeklyCount += 1;
    if (mode === 'endless' && results.length > 0) {
      const last  = results[results.length - 1];
      const depth = (last.level || 0) - 6;
      u.endlessMaxDepth = Math.max(u.endlessMaxDepth, depth > 0 ? depth : 0);
    }
    if (streak > (u.longestStreak || 0)) u.longestStreak = streak;

    await AsyncStorage.setItem(KEY, JSON.stringify(u));
    return u;
  } catch { return null; }
}

export async function incrementStat(key) {
  try {
    const cur = await getStats();
    const u   = { ...cur, [key]: (cur[key] || 0) + 1 };
    await AsyncStorage.setItem(KEY, JSON.stringify(u));
    return u;
  } catch { return null; }
}
