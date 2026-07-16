import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY        = '@bp_bests_v1';
const STREAK_KEY = '@bp_streak';
const ACH_KEY    = '@bp_achievements';

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getStreak() {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
  } catch { return { count: 0, lastDate: '' }; }
}

export async function touchStreak() {
  try {
    const data  = await getStreak();
    const today = dateStr(new Date());
    if (data.lastDate === today) return data.count;
    const yest  = new Date(); yest.setDate(yest.getDate() - 1);
    const count = data.lastDate === dateStr(yest) ? data.count + 1 : 1;
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ count, lastDate: today }));
    return count;
  } catch { return 0; }
}

export async function getAchievements() {
  try {
    const raw = await AsyncStorage.getItem(ACH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function unlockAchievements(ids) {
  try {
    const existing = await getAchievements();
    const updated  = [...new Set([...existing, ...ids])];
    if (updated.length !== existing.length)
      await AsyncStorage.setItem(ACH_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

export async function getBests() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Returns true if this is a new personal best
export async function saveBest(levelKey, data) {
  try {
    const bests = await getBests();
    const prev  = bests[levelKey];
    const isNew = !prev || data.score > prev.score;
    if (isNew) {
      bests[levelKey] = data;
      await AsyncStorage.setItem(KEY, JSON.stringify(bests));
    }
    return isNew;
  } catch {
    return false;
  }
}

const GHOST_PFX = '@bp_ghost_';
const SKIN_KEY  = '@bp_skin';
const SKINS_KEY = '@bp_skins_unlocked';

export async function saveGhost(levelKey, trail) {
  try { await AsyncStorage.setItem(GHOST_PFX + levelKey, JSON.stringify(trail)); } catch {}
}

export async function getGhost(levelKey) {
  try {
    const raw = await AsyncStorage.getItem(GHOST_PFX + levelKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getSelectedSkin() {
  try { return (await AsyncStorage.getItem(SKIN_KEY)) || 'default'; } catch { return 'default'; }
}

export async function saveSelectedSkin(id) {
  try { await AsyncStorage.setItem(SKIN_KEY, id); } catch {}
}

export async function getUnlockedSkins() {
  try {
    const raw = await AsyncStorage.getItem(SKINS_KEY);
    return raw ? JSON.parse(raw) : ['default'];
  } catch { return ['default']; }
}

export async function unlockSkins(ids) {
  try {
    const existing = await getUnlockedSkins();
    const updated = [...new Set([...existing, ...ids])];
    if (updated.length !== existing.length)
      await AsyncStorage.setItem(SKINS_KEY, JSON.stringify(updated));
    return updated;
  } catch { return ['default']; }
}

const SAVE_KEY   = '@bp_autosave';
const REPLAY_PFX = '@bp_replay_';

export async function saveGame(data) {
  try { await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

export async function loadSavedGame() {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearSavedGame() {
  try { await AsyncStorage.removeItem(SAVE_KEY); } catch {}
}

export async function saveReplay(levelKey, data) {
  try { await AsyncStorage.setItem(REPLAY_PFX + levelKey, JSON.stringify(data)); } catch {}
}

export async function loadReplay(levelKey) {
  try {
    const raw = await AsyncStorage.getItem(REPLAY_PFX + levelKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
