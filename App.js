import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen        from './src/screens/SplashScreen';
import GameScreen          from './src/screens/GameScreen';
import ScoreScreen         from './src/screens/ScoreScreen';
import ReplayScreen        from './src/screens/ReplayScreen';
import EndlessSelectScreen from './src/screens/EndlessSelectScreen';
import SettingsScreen      from './src/screens/SettingsScreen';
import OnboardingScreen    from './src/screens/OnboardingScreen';
import ProfileScreen       from './src/screens/ProfileScreen';
import { LEVELS }          from './src/game/levels';
import {
  touchStreak, getStreak, getAchievements, unlockAchievements,
  getSelectedSkin, saveSelectedSkin, getUnlockedSkins, unlockSkins,
  loadSavedGame, clearSavedGame, loadReplay,
} from './src/storage/scores';
import { recordResults } from './src/storage/stats';
import { checkNewAchievements } from './src/game/achievements';

const HC_KEY     = '@bp_high_contrast';
const FOG_KEY    = '@bp_fog';
const HAP_KEY    = '@bp_haptics';
const OBD_KEY    = '@bp_onboarded';
const RATE_KEY   = '@bp_rated';
const MUSIC_KEY  = '@bp_music_level';
const SHAPE_KEY  = '@bp_fog_shape';
const MEMORY_KEY = '@bp_memory_mode';

const STORE_URL = Platform.OS === 'ios'
  ? 'itms-apps://itunes.apple.com/app/id000000000'
  : 'market://details?id=com.blindpath.game';

const FOG_OFFSETS   = { cozy: 1.2, normal: 0, blind: -0.6 };
const MUSIC_VOLUMES = { off: 0, low: 0.25, mid: 0.55, full: 1.0 };

const DEFAULT_PAL = {
  bg: '#0d0b1a', wall: '#1e1628', lit: '#e3c8ee',
  glow: '#f3e6fb', rim: '#69538c', air: '#cda9e6',
};


export default function App() {
  const [screen,             setScreen]             = useState('loading');
  const [results,            setResults]            = useState([]);
  const [newAchievements,    setNewAchievements]    = useState([]);
  const [mode,               setMode]               = useState('journey');
  const [startIdx,           setStartIdx]           = useState(0);
  const [highContrast,       setHighContrast]       = useState(false);
  const [fogPreset,          setFogPreset]          = useState('normal');
  const [fogShape,           setFogShape]           = useState('round');
  const [musicLevel,         setMusicLevel]         = useState('full');
  const [hapticsEnabled,     setHapticsEnabled]     = useState(true);
  const [memoryMode,         setMemoryMode]         = useState(false);
  const [streak,             setStreak]             = useState(0);
  const [achievements,       setAchievements]       = useState([]);
  const [selectedSkin,       setSelectedSkin]       = useState('default');
  const [unlockedSkins,      setUnlockedSkins]      = useState(['default']);
  const [customConfig,       setCustomConfig]       = useState(null);
  const [savedGame,          setSavedGame]          = useState(null);
  const [initialSavedState,  setInitialSavedState]  = useState(null);
  const [replayData,         setReplayData]         = useState(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HC_KEY),
      AsyncStorage.getItem(FOG_KEY),
      AsyncStorage.getItem(HAP_KEY),
      AsyncStorage.getItem(OBD_KEY),
      AsyncStorage.getItem(MUSIC_KEY),
      AsyncStorage.getItem(SHAPE_KEY),
      AsyncStorage.getItem(MEMORY_KEY),
      getStreak(),
      getAchievements(),
      getSelectedSkin(),
      getUnlockedSkins(),
      loadSavedGame(),
    ]).then(([hc, fog, hap, obd, music, shape, mem, streakData, achList, skinId, skinList, save]) => {
      if (hc    === '1') setHighContrast(true);
      if (fog)           setFogPreset(fog);
      if (hap   === '0') setHapticsEnabled(false);
      if (music)         setMusicLevel(music);
      if (shape)         setFogShape(shape);
      if (mem   === '1') setMemoryMode(true);
      setStreak(streakData.count);
      setAchievements(achList);
      setSelectedSkin(skinId || 'default');
      setUnlockedSkins(skinList.length > 0 ? skinList : ['default']);
      if (save)          setSavedGame(save);
      setScreen(obd === '1' ? 'splash' : 'onboarding');
    });
  }, []);

  // Deep link handler — challenge (seed-based)
  const handleDeepLink = useCallback((url) => {
    if (!url) return;

    if (url.includes('blindpath://challenge')) {
      const qs = url.split('?')[1] || '';
      const p  = {};
      qs.split('&').forEach(pair => {
        const eq = pair.indexOf('=');
        if (eq > 0) p[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1));
      });
      if (!p.seed) return;
      setCustomConfig({
        mood: p.mood || 'Challenge',
        sub:  'can you beat their score?',
        cols: Number(p.cols) || 25,
        rows: Number(p.rows) || 17,
        seed: Number(p.seed),
        reveal: 2.2, pulse: 4.5, exitF: 1.0, loop: 12,
        par:  Number(p.par) || 100,
        pal:  DEFAULT_PAL,
      });
      setMode('challenge');
      setStartIdx(0);
      setInitialSavedState(null);
      setScreen('game');
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  const handleOnboarded = useCallback(() => {
    AsyncStorage.setItem(OBD_KEY, '1');
    setScreen('splash');
  }, []);

  const handleToggleHC = useCallback(() => {
    setHighContrast(prev => {
      const next = !prev;
      AsyncStorage.setItem(HC_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleFogPreset = useCallback((preset) => {
    setFogPreset(preset);
    AsyncStorage.setItem(FOG_KEY, preset);
  }, []);

  const handleFogShape = useCallback((shape) => {
    setFogShape(shape);
    AsyncStorage.setItem(SHAPE_KEY, shape);
  }, []);

  const handleMusicLevel = useCallback((level) => {
    setMusicLevel(level);
    AsyncStorage.setItem(MUSIC_KEY, level);
  }, []);

  const handleToggleHaptics = useCallback(() => {
    setHapticsEnabled(prev => {
      const next = !prev;
      AsyncStorage.setItem(HAP_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleMemoryMode = useCallback(() => {
    setMemoryMode(prev => {
      const next = !prev;
      AsyncStorage.setItem(MEMORY_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleSkin = useCallback(async (id) => {
    setSelectedSkin(id);
    await saveSelectedSkin(id);
  }, []);

  const handleStart = useCallback((m) => {
    setMode(m);
    setCustomConfig(null);
    setInitialSavedState(null);
    if (m === 'endless') {
      setScreen('endless-select');
    } else {
      setStartIdx(0);
      setScreen('game');
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (!savedGame) return;
    setMode(savedGame.mode || 'journey');
    setStartIdx(savedGame.idx || 0);
    setCustomConfig(null);
    setInitialSavedState(savedGame);
    setSavedGame(null);
    setScreen('game');
  }, [savedGame]);

  const handleWatchReplay = useCallback(async (levelKey) => {
    if (!levelKey) return;
    const data = await loadReplay(levelKey);
    if (!data) return;
    setReplayData(data);
    setScreen('replay');
  }, []);

  const handleComplete = useCallback(async (r) => {
    setInitialSavedState(null);
    let currentStreak = streak;

    if (mode === 'daily') {
      currentStreak = await touchStreak();
      setStreak(currentStreak);
    }

    // Update lifetime stats
    const updatedStats = await recordResults(r, mode, currentStreak);

    // Check all achievements against updated stats
    const newly = checkNewAchievements(
      achievements,
      updatedStats || {},
      currentStreak,
      mode,
      r,
    );

    if (newly.length > 0) {
      const updated = await unlockAchievements(newly);
      setAchievements(updated);
    }

    // Skin unlocks
    const skinIds = [];
    if (!unlockedSkins.includes('ember') && newly.includes('journey_complete'))
      skinIds.push('ember');
    if (!unlockedSkins.includes('frost') && mode === 'endless' && r.length > 0) {
      const lastResult = r[r.length - 1];
      if (lastResult && (lastResult.level - LEVELS.length) >= 10) skinIds.push('frost');
    }
    if (skinIds.length > 0) {
      const updated = await unlockSkins(skinIds);
      setUnlockedSkins(updated);
    }

    setResults(r);
    setNewAchievements(newly);
    setScreen('score');

    if (mode === 'journey' && r.length >= 3) {
      const rated = await AsyncStorage.getItem(RATE_KEY);
      if (!rated) {
        await AsyncStorage.setItem(RATE_KEY, '1');
        setTimeout(() => {
          Alert.alert(
            'Enjoying Blind Path?',
            'A rating helps other quiet explorers find the game.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Rate It', onPress: () => Linking.openURL(STORE_URL) },
            ],
            { cancelable: true }
          );
        }, 900);
      }
    }
  }, [mode, streak, achievements, unlockedSkins]);

  if (screen === 'loading') return <View style={styles.root} />;

  const sfxEnabled         = musicLevel !== 'off';
  const musicVol           = MUSIC_VOLUMES[musicLevel] ?? 1;
  const memoryModeUnlocked = achievements.includes('journey_complete');

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {screen === 'onboarding' && (
        <OnboardingScreen onDone={handleOnboarded} />
      )}

      {screen === 'splash' && (
        <SplashScreen
          onStart={handleStart}
          streak={streak}
          onSettings={() => setScreen('settings')}
          onProfile={() => setScreen('profile')}
          savedGame={savedGame}
          onContinue={handleContinue}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          onBack={() => setScreen('splash')}
          musicLevel={musicLevel}         onMusicLevel={handleMusicLevel}
          hapticsEnabled={hapticsEnabled} onToggleHaptics={handleToggleHaptics}
          highContrast={highContrast}     onToggleHC={handleToggleHC}
          fogPreset={fogPreset}           onFogPreset={handleFogPreset}
          fogShape={fogShape}             onFogShape={handleFogShape}
          memoryMode={memoryMode}         onMemoryMode={handleMemoryMode}
          memoryModeUnlocked={memoryModeUnlocked}
          selectedSkin={selectedSkin}     onSkin={handleSkin}
          unlockedSkins={unlockedSkins}
        />
      )}

      {screen === 'profile' && (
        <ProfileScreen
          achievements={achievements}
          onBack={() => setScreen('splash')}
        />
      )}

      {screen === 'endless-select' && (
        <EndlessSelectScreen
          onSelect={(idx) => { setStartIdx(idx); setScreen('game'); }}
          onBack={() => setScreen('splash')}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          mode={mode}
          initialIdx={startIdx}
          highContrast={highContrast}
          fogOffset={FOG_OFFSETS[fogPreset] ?? 0}
          fogShape={fogShape}
          soundEnabled={sfxEnabled}
          musicVol={musicVol}
          hapticsEnabled={hapticsEnabled}
          selectedSkin={selectedSkin}
          customConfig={customConfig}
          memoryMode={memoryMode}
          savedState={initialSavedState}
          onComplete={handleComplete}
          onHome={() => {
            clearSavedGame();
            setInitialSavedState(null);
            setScreen(mode === 'endless' ? 'endless-select' : 'splash');
          }}
        />
      )}

      {screen === 'score' && (
        <ScoreScreen
          results={results}
          mode={mode}
          achievements={achievements}
          newAchievements={newAchievements}
          onWatchReplay={handleWatchReplay}
          onPlayAgain={() => { setResults([]); setNewAchievements([]); setScreen('splash'); }}
        />
      )}

      {screen === 'replay' && replayData && (
        <ReplayScreen
          replayData={replayData}
          onClose={() => { setReplayData(null); setScreen('score'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
