import React, {
  useRef, useState, useReducer, useCallback, useEffect,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, AppState,
  Dimensions, PanResponder, Animated, Easing, Platform,
} from 'react-native';
import { createLevel, movePlayer, triggerPulse, revealAround, calcScore, calcPercentile } from '../game/gameState';
import { LEVELS, getDailyConfig } from '../game/levels';
import { getWeeklyConfig } from '../game/weekly';
import { getEndlessLevel } from '../game/endless';
import { saveBest, getGhost, saveGhost, saveGame, clearSavedGame, saveReplay } from '../storage/scores';
import { FIREFLY_SKINS } from '../game/skins';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AudioEngine from '../audio/AudioEngine';
import Firefly from '../components/Firefly';

const { width: SW, height: SH } = Dimensions.get('window');
const MOVE_MS  = 200;
const CAM_MS   = 220;
const WALL_STEP = 10;

const TOP_PAD = Platform.OS === 'ios' ? 52 : 36;
const HUD_H   = TOP_PAD + 46;
const VW      = SW;
const VH      = SH - HUD_H;

const PARTICLE_DATA = Array.from({ length: 12 }, (_, i) => ({
  angle:    (i / 12) * 2 * Math.PI,
  distMult: [1.4, 1.9, 2.4][i % 3],
}));

const TRAIL_OPS = [0.50, 0.32, 0.18, 0.10, 0.05];

function tileForLevel(t) { return Math.floor(VH / t.rows); }

const DIR_ANGLE = { up: 0, right: 90, down: 180, left: -90 };

function placePortals(s) {
  const floors = [];
  for (let ry = 0; ry < s.t.rows; ry++) {
    for (let cx = 0; cx < s.t.cols; cx++) {
      if (s.grid[ry][cx] !== 1) continue;
      if (cx === s.player.x && ry === s.player.y) continue;
      if (cx === s.exit.x   && ry === s.exit.y)   continue;
      floors.push({ x: cx, y: ry });
    }
  }
  if (floors.length < 4) return null;
  const minDist = Math.max(s.t.cols, s.t.rows) * 0.4;
  const a = floors[Math.floor(floors.length * 0.15)];
  for (let i = floors.length - 1; i >= 0; i--) {
    const f = floors[i];
    const dx = f.x - a.x, dy = f.y - a.y;
    if (Math.sqrt(dx * dx + dy * dy) >= minDist) return [a, f];
  }
  return null;
}

function placeWisps(s, portals) {
  const portalSet = new Set(portals ? portals.map(p => `${p.x},${p.y}`) : []);
  const floors = [];
  for (let ry = 0; ry < s.t.rows; ry++) {
    for (let cx = 0; cx < s.t.cols; cx++) {
      if (s.grid[ry][cx] !== 1) continue;
      if (cx === s.player.x && ry === s.player.y) continue;
      if (cx === s.exit.x   && ry === s.exit.y)   continue;
      if (portalSet.has(`${cx},${ry}`)) continue;
      floors.push({ x: cx, y: ry });
    }
  }
  if (floors.length < 5) return new Set();
  const count = Math.min(5, Math.max(3, Math.floor(floors.length / 20)));
  const step  = Math.floor(floors.length / count);
  const result = new Set();
  for (let i = 0; i < count; i++) {
    const f = floors[(i * step + Math.floor(step / 2)) % floors.length];
    result.add(`${f.x},${f.y}`);
  }
  return result;
}

function placeMovingWalls(s) {
  if (!s.t.portals) return [];
  const candidates = [];
  for (let ry = 2; ry < s.t.rows - 2; ry++) {
    for (let cx = 2; cx < s.t.cols - 2; cx++) {
      if (s.grid[ry][cx] !== 0) continue;
      const dStart = Math.abs(cx - s.player.x) + Math.abs(ry - s.player.y);
      const dExit  = Math.abs(cx - s.exit.x)   + Math.abs(ry - s.exit.y);
      if (dStart < 6 || dExit < 6) continue;
      const up    = s.grid[ry - 1]?.[cx] === 1;
      const down  = s.grid[ry + 1]?.[cx] === 1;
      const left  = s.grid[ry]?.[cx - 1] === 1;
      const right = s.grid[ry]?.[cx + 1] === 1;
      if ((left && right && !up && !down) || (up && down && !left && !right))
        candidates.push({ x: cx, y: ry });
    }
  }
  if (!candidates.length) return [];
  const count = Math.min(3, candidates.length);
  return Array.from({ length: count }, (_, i) =>
    candidates[Math.floor((i + 0.5) * candidates.length / count)]
  );
}

function getLevelKey(idx, mode, t) {
  if (mode === 'daily')   return `daily-${t.dateKey || 'unknown'}`;
  if (mode === 'weekly')  return `weekly-${t.dateKey || 'unknown'}`;
  if (mode === 'endless') return `e-${idx}`;
  return `j-${idx + 1}`;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getLevelConfig(idx, mode, customConfig) {
  if (customConfig) return customConfig;
  if (mode === 'daily')  return getDailyConfig();
  if (mode === 'weekly') return getWeeklyConfig();
  if (idx >= LEVELS.length) return getEndlessLevel(idx - LEVELS.length);
  return LEVELS[idx];
}

function initGame(idx, mode, customConfig, savedState) {
  const t = getLevelConfig(idx, mode, customConfig);
  const s = createLevel(idx, t);
  s.tile  = tileForLevel(s.t);
  if (customConfig?.prebuiltGrid) {
    s.grid     = customConfig.prebuiltGrid.map(row => [...row]);
    s.player   = { ...customConfig.prebuiltStart };
    s.exit     = { ...customConfig.prebuiltExit };
    s.revealed = Array.from({ length: t.rows }, () => Array(t.cols).fill(false));
    revealAround(s, t.reveal);
  } else if (savedState && savedState.seed === t.seed &&
      savedState.idx === idx && savedState.mode === mode) {
    s.player   = { x: savedState.playerX, y: savedState.playerY };
    s.steps    = savedState.steps || 0;
    s.revealed = savedState.revealed || s.revealed;
  } else {
    revealAround(s, s.t.reveal);
  }
  return s;
}

function makeRevealedSteps(s) {
  return Array.from({ length: s.t.rows }, (_, ry) =>
    Array.from({ length: s.t.cols }, (_, cx) => s.revealed[ry][cx] ? -100 : -1)
  );
}

function playerCenter(s) {
  const T = s.tile;
  return { x: s.player.x * T + T / 2, y: s.player.y * T + T / 2 };
}

function targetTranslate(s) {
  const T = s.tile;
  return {
    x: -(s.player.x * T + T / 2 - VW / 2),
    y: -(s.player.y * T + T / 2 - VH / 2),
  };
}

function nextAngle(current, target) {
  const delta = (target - (current % 360) + 540) % 360 - 180;
  return current + delta;
}

// ─── GameScreen ──────────────────────────────────────────────────────────────
export default function GameScreen({
  onComplete, onHome,
  mode = 'journey', initialIdx = 0,
  highContrast = false, fogOffset = 0,
  soundEnabled = true, hapticsEnabled = true,
  musicVol = 1, selectedSkin = 'default',
  customConfig = null, savedState = null,
  memoryMode = false, fogShape = 'round',
}) {
  const gameRef           = useRef(initGame(initialIdx, mode, customConfig, savedState));
  const levelIdxRef       = useRef(initialIdx);
  const resultsRef        = useRef([]);
  const handleMoveRef     = useRef(null);
  const handleHintRef     = useRef(null);
  const facingRef         = useRef(0);
  const audioRef          = useRef(null);
  const audioStartedRef   = useRef(false);
  const pathCellsRef      = useRef(new Set());
  const exitChimeRef      = useRef(false);
  const hintsUsedRef      = useRef(0);
  const tapTimesRef       = useRef([]);
  const hintActiveRef     = useRef(false);
  const hintTimeoutRef    = useRef(null);
  const justTeleportedRef = useRef(false);

  // Sound / haptics refs (avoid stale closure in callbacks)
  const soundRef    = useRef(soundEnabled);
  const hapticsRef  = useRef(hapticsEnabled);
  useEffect(() => { soundRef.current   = soundEnabled;   }, [soundEnabled]);
  useEffect(() => { hapticsRef.current = hapticsEnabled; }, [hapticsEnabled]);

  // Memory mode refs
  const memoryModeRef  = useRef(memoryMode);
  const memoryDarkRef  = useRef(false);
  const lastMoveTimeRef = useRef(Date.now());
  useEffect(() => { memoryModeRef.current = memoryMode; }, [memoryMode]);

  // Phase ref for AppState callback
  const phaseRef = useRef('playing');

  // Portals, wisps, ghost, trail
  const portalsRef  = useRef(
    gameRef.current.t.portals ? placePortals(gameRef.current) : null
  );
  const wispsRef        = useRef(placeWisps(gameRef.current, portalsRef.current));
  const wispCountRef    = useRef(0);
  const wispBoostRef    = useRef(false);
  const wispTimeoutRef  = useRef(null);
  const ghostPathRef    = useRef([]);
  const pathTrailRef    = useRef([]);   // ghost PB recording
  const trailRef        = useRef([]);   // firefly visual trail (last 5 positions)
  const replayRef       = useRef([]);   // replay move recording
  const startPosRef     = useRef({ x: gameRef.current.player.x, y: gameRef.current.player.y });

  // Tile fade-in tracking
  const revealedStepRef = useRef(makeRevealedSteps(gameRef.current));

  // Moving walls
  const movingWallsRef   = useRef(placeMovingWalls(gameRef.current));
  const prevWallEpochRef = useRef(
    savedState?.steps ? Math.floor(savedState.steps / WALL_STEP) : 0
  );

  // ── State ─────────────────────────────────────────────────────────────────
  const [elapsed,         setElapsed]         = useState(savedState?.elapsed ?? 0);
  const [homeVisible,     setHomeVisible]     = useState(false);
  const [wispBoostActive, setWispBoostActive] = useState(false);
  const [collectedWisps,  setCollectedWisps]  = useState(0);
  const [memoryDark,      setMemoryDarkState] = useState(false);
  const timerRunning      = useRef(false);
  const timerInterval     = useRef(null);
  const levelStartElapsed = useRef(savedState?.elapsed ?? 0);

  const startTimer = useCallback(() => {
    if (timerRunning.current) return;
    timerRunning.current = true;
    timerInterval.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, []);

  // Phase state tracks game flow
  const [, forceUpdate]        = useReducer(n => n + 1, 0);
  const [phase,     setPhase]  = useState('playing');
  const [hintActive, setHintActive] = useState(false);

  // Keep phaseRef in sync for AppState callback
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => clearInterval(timerInterval.current), []);
  useEffect(() => () => {
    clearTimeout(hintTimeoutRef.current);
    clearTimeout(wispTimeoutRef.current);
  }, []);

  // ── Memory mode interval ─────────────────────────────────────────────────
  useEffect(() => {
    if (!memoryMode) {
      if (memoryDarkRef.current) {
        memoryDarkRef.current = false;
        setMemoryDarkState(false);
      }
      return;
    }
    const interval = setInterval(() => {
      const shouldDark = Date.now() - lastMoveTimeRef.current > 3000;
      if (shouldDark !== memoryDarkRef.current) {
        memoryDarkRef.current = shouldDark;
        setMemoryDarkState(shouldDark);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [memoryMode]);

  // ── AppState autosave ────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', appState => {
      if ((appState === 'background' || appState === 'inactive') &&
          phaseRef.current === 'playing' && audioStartedRef.current) {
        const s = gameRef.current;
        saveGame({
          mode, idx: levelIdxRef.current,
          playerX: s.player.x, playerY: s.player.y,
          steps:   s.steps, elapsed: elapsedRef.current,
          revealed: s.revealed,
          seed: s.t.seed, mood: s.t.mood,
        });
      }
    });
    return () => sub.remove();
  }, [mode]);

  // ── Load ghost for initial level ─────────────────────────────────────────
  useEffect(() => {
    const key = getLevelKey(levelIdxRef.current, mode, gameRef.current.t);
    getGhost(key).then(path => { ghostPathRef.current = path || []; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loop animations ───────────────────────────────────────────────────────
  const portalAnim  = useRef(new Animated.Value(0)).current;
  const wispAnim    = useRef(new Animated.Value(0)).current;
  const compassAnim = useRef(new Animated.Value(0)).current;
  const burstAnim   = useRef(new Animated.Value(0)).current;
  const wallFlipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(portalAnim, { toValue: 1, duration: 900,  useNativeDriver: true }),
      Animated.timing(portalAnim, { toValue: 0, duration: 900,  useNativeDriver: true }),
    ])).start();
  }, [portalAnim]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(wispAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(wispAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ])).start();
  }, [wispAnim]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(compassAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(compassAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, [compassAnim]);

  // ── Animated values ───────────────────────────────────────────────────────
  const { x: initCX, y: initCY } = targetTranslate(gameRef.current);
  const camX        = useRef(new Animated.Value(initCX)).current;
  const camY        = useRef(new Animated.Value(initCY)).current;
  const { x: iPX, y: iPY } = playerCenter(gameRef.current);
  const playerAnimX = useRef(new Animated.Value(iPX)).current;
  const playerAnimY = useRef(new Animated.Value(iPY)).current;
  const facingAnim  = useRef(new Animated.Value(0)).current;
  const wingAnim    = useRef(new Animated.Value(0)).current;
  const glowBreath  = useRef(new Animated.Value(0)).current;
  const overlayOp   = useRef(new Animated.Value(0)).current;
  const transitionOp = useRef(new Animated.Value(0)).current;
  const collisionAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wingEase = Easing.inOut(Easing.sin);
    Animated.loop(Animated.sequence([
      Animated.timing(wingAnim,   { toValue: 1, duration: 190,  easing: wingEase, useNativeDriver: true }),
      Animated.timing(wingAnim,   { toValue: 0, duration: 190,  easing: wingEase, useNativeDriver: true }),
    ])).start();
  }, [wingAnim]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowBreath, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(glowBreath, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ])).start();
  }, [glowBreath]);

  const showOverlay = useCallback(() => {
    overlayOp.setValue(0);
    Animated.timing(overlayOp, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [overlayOp]);

  const elapsedRef = useRef(savedState?.elapsed ?? 0);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // ── handleMove ────────────────────────────────────────────────────────────
  const handleMove = useCallback((dir) => {
    const s = gameRef.current;
    if (s.complete) return;

    // Capture position before move (for firefly trail)
    const prevX = s.player.x, prevY = s.player.y;

    const { moved } = movePlayer(s, dir);
    if (!moved) {
      if (hapticsRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (soundRef.current)   audioRef.current?.playCollision();
      collisionAnim.stopAnimation();
      Animated.sequence([
        Animated.timing(collisionAnim, { toValue: 1, duration: 55,  useNativeDriver: true }),
        Animated.timing(collisionAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Immediately restore light in memory mode
    if (memoryDarkRef.current) {
      memoryDarkRef.current = false;
      setMemoryDarkState(false);
    }
    lastMoveTimeRef.current = Date.now();

    // Firefly visual trail
    trailRef.current.unshift({ x: prevX, y: prevY });
    if (trailRef.current.length > 5) trailRef.current.pop();

    pathCellsRef.current.add(`${s.player.x},${s.player.y}`);

    // Portal teleportation
    if (portalsRef.current && !justTeleportedRef.current) {
      const [pa, pb] = portalsRef.current;
      const onA = s.player.x === pa.x && s.player.y === pa.y;
      const onB = s.player.x === pb.x && s.player.y === pb.y;
      if (onA || onB) {
        const dest = onA ? pb : pa;
        s.player.x = dest.x;
        s.player.y = dest.y;
        revealAround(s, s.t.reveal);
        pathCellsRef.current.add(`${s.player.x},${s.player.y}`);
        justTeleportedRef.current = true;
        if (hapticsRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } else {
      justTeleportedRef.current = false;
    }

    // Record replay move
    replayRef.current.push({ x: s.player.x, y: s.player.y });

    // Record ghost trail (for PB save)
    pathTrailRef.current.push({ x: s.player.x, y: s.player.y });

    // Tile fade-in: mark newly revealed tiles
    const rs = revealedStepRef.current;
    if (rs) {
      for (let ry2 = 0; ry2 < s.t.rows; ry2++) {
        for (let cx2 = 0; cx2 < s.t.cols; cx2++) {
          if (s.revealed[ry2][cx2] && rs[ry2][cx2] === -1) {
            rs[ry2][cx2] = s.steps;
          }
        }
      }
    }

    // Moving walls — toggle every WALL_STEP moves
    const newEpoch = Math.floor(s.steps / WALL_STEP);
    if (newEpoch > prevWallEpochRef.current && movingWallsRef.current.length > 0) {
      prevWallEpochRef.current = newEpoch;
      movingWallsRef.current.forEach(w => {
        s.grid[w.y][w.x] = s.grid[w.y][w.x] === 0 ? 1 : 0;
      });
      revealAround(s, s.t.reveal);
      wallFlipAnim.setValue(1);
      Animated.timing(wallFlipAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }

    // Wisp collection
    const wispKey = `${s.player.x},${s.player.y}`;
    if (wispsRef.current.has(wispKey)) {
      wispsRef.current.delete(wispKey);
      wispCountRef.current += 1;
      setCollectedWisps(wispCountRef.current);
      if (soundRef.current)   audioRef.current?.playWisp();
      if (hapticsRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      wispBoostRef.current = true;
      setWispBoostActive(true);
      clearTimeout(wispTimeoutRef.current);
      wispTimeoutRef.current = setTimeout(() => {
        wispBoostRef.current = false;
        setWispBoostActive(false);
      }, 1500);
    }

    // Exit discovery chime
    if (!exitChimeRef.current) {
      const dx = s.exit.x - s.player.x, dy = s.exit.y - s.player.y;
      const rev = Math.max(s.t.reveal * 0.55, s.t.reveal - Math.max(0, elapsedRef.current - 120) * 0.003);
      if (Math.sqrt(dx * dx + dy * dy) <= rev + 0.5) {
        exitChimeRef.current = true;
        if (soundRef.current) audioRef.current?.playChime();
      }
    }

    startTimer();
    if (!audioStartedRef.current) {
      audioStartedRef.current = true;
      audioRef.current?.resume();
    }

    const { x: px, y: py } = playerCenter(s);
    const { x: cx, y: cy } = targetTranslate(s);
    const angle = nextAngle(facingRef.current, DIR_ANGLE[dir]);
    facingRef.current = angle;

    const glide = Easing.out(Easing.quad);
    Animated.parallel([
      Animated.timing(playerAnimX, { toValue: px,    duration: MOVE_MS, easing: glide, useNativeDriver: true }),
      Animated.timing(playerAnimY, { toValue: py,    duration: MOVE_MS, easing: glide, useNativeDriver: true }),
      Animated.timing(camX,        { toValue: cx,    duration: CAM_MS,  easing: glide, useNativeDriver: true }),
      Animated.timing(camY,        { toValue: cy,    duration: CAM_MS,  easing: glide, useNativeDriver: true }),
      Animated.timing(facingAnim,  { toValue: angle, duration: MOVE_MS, easing: glide, useNativeDriver: true }),
    ]).start();

    forceUpdate();

    if (s.complete) {
      clearInterval(timerInterval.current);
      timerRunning.current = false;

      const levelTime = elapsedRef.current - levelStartElapsed.current;
      const score   = calcScore(s.steps, s.t.par);
      const pct     = calcPercentile(score);
      const levelKey = getLevelKey(levelIdxRef.current, mode, s.t);

      saveBest(levelKey, { steps: s.steps, score, time: levelTime })
        .then(isNew => {
          if (isNew && pathTrailRef.current.length > 0)
            saveGhost(levelKey, pathTrailRef.current.slice());
        });

      saveReplay(levelKey, {
        moves: replayRef.current.slice(),
        grid:  s.grid.map(row => [...row]),
        rows:  s.t.rows, cols: s.t.cols,
        start: startPosRef.current,
        exit:  { x: s.exit.x, y: s.exit.y },
        pal:   s.t.pal, mood: s.t.mood,
      });

      clearSavedGame();

      burstAnim.setValue(0);
      Animated.timing(burstAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start();

      resultsRef.current = [
        ...resultsRef.current,
        {
          level:   levelIdxRef.current + 1,
          mood:    s.t.mood,
          steps:   s.steps,
          par:     s.t.par,
          score, pct,
          time:    levelTime,
          dateKey: s.t.dateKey,
          levelKey,
          hints:   hintsUsedRef.current,
          seed:    s.t.seed,
          cols:    s.t.cols,
          rows:    s.t.rows,
        },
      ];

      const isLast = mode === 'daily' || mode === 'challenge' || mode === 'weekly'
        || (mode === 'journey' && levelIdxRef.current >= LEVELS.length - 1);
      setPhase(isLast ? 'gameDone' : 'levelDone');
      if (hapticsRef.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (soundRef.current)   audioRef.current?.playComplete();
      showOverlay();
    }
  }, [mode, startTimer, playerAnimX, playerAnimY, camX, camY, facingAnim,
      showOverlay, burstAnim, wallFlipAnim]);

  handleMoveRef.current = handleMove;

  const handlePulse = useCallback(() => {
    if (triggerPulse(gameRef.current)) {
      forceUpdate();
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    }
  }, [rippleAnim]);

  const handleHint = useCallback(() => {
    const s = gameRef.current;
    if (s.complete || phase !== 'playing') return;
    const now = Date.now();
    const times = tapTimesRef.current;
    times.push(now);
    if (times.length > 3) times.shift();
    if (times.length === 3 && now - times[0] < 600) {
      tapTimesRef.current = [];
      if (hintActiveRef.current) return;
      s.steps += 10;
      hintsUsedRef.current += 1;
      hintActiveRef.current = true;
      setHintActive(true);
      forceUpdate();
      if (hapticsRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => {
        hintActiveRef.current = false;
        setHintActive(false);
      }, 2000);
    }
  }, [phase]);
  handleHintRef.current = handleHint;

  const handleNextLevel = useCallback(() => {
    Animated.timing(transitionOp, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => {
      levelStartElapsed.current = elapsedRef.current;
      levelIdxRef.current += 1;
      const s = initGame(levelIdxRef.current, mode);
      gameRef.current = s;
      const { x: px, y: py } = playerCenter(s);
      const { x: cx, y: cy } = targetTranslate(s);
      camX.setValue(cx); camY.setValue(cy);
      playerAnimX.setValue(px); playerAnimY.setValue(py);
      facingRef.current = 0;
      facingAnim.setValue(0);
      overlayOp.setValue(0);
      exitChimeRef.current    = false;
      pathCellsRef.current.clear();
      hintsUsedRef.current    = 0;
      tapTimesRef.current     = [];
      hintActiveRef.current   = false;
      clearTimeout(hintTimeoutRef.current);
      setHintActive(false);
      justTeleportedRef.current = false;
      portalsRef.current = s.t.portals ? placePortals(s) : null;
      wispsRef.current   = placeWisps(s, portalsRef.current);
      wispCountRef.current = 0;
      wispBoostRef.current = false;
      clearTimeout(wispTimeoutRef.current);
      setCollectedWisps(0);
      setWispBoostActive(false);
      pathTrailRef.current  = [];
      trailRef.current      = [];
      replayRef.current     = [];
      startPosRef.current   = { x: s.player.x, y: s.player.y };
      revealedStepRef.current = makeRevealedSteps(s);
      movingWallsRef.current  = placeMovingWalls(s);
      prevWallEpochRef.current = 0;
      memoryDarkRef.current = false;
      setMemoryDarkState(false);
      lastMoveTimeRef.current = Date.now();
      const newKey = getLevelKey(levelIdxRef.current, mode, s.t);
      getGhost(newKey).then(path => { ghostPathRef.current = path || []; });
      setPhase('playing');
      startTimer();
      forceUpdate();
      Animated.timing(transitionOp, { toValue: 0, duration: 420, useNativeDriver: true }).start();
    });
  }, [mode, startTimer, camX, camY, playerAnimX, playerAnimY, facingAnim, overlayOp, transitionOp]);

  const handleGameEnd = useCallback(() => onComplete(resultsRef.current), [onComplete]);
  const handleHome    = useCallback(() => setHomeVisible(true), []);

  const handleRestartLevel = useCallback(() => {
    setHomeVisible(false);
    const s = initGame(levelIdxRef.current, mode, customConfig);
    gameRef.current = s;
    const { x: px, y: py } = playerCenter(s);
    const { x: cx, y: cy } = targetTranslate(s);
    camX.setValue(cx); camY.setValue(cy);
    playerAnimX.setValue(px); playerAnimY.setValue(py);
    facingRef.current = 0;
    facingAnim.setValue(0);
    overlayOp.setValue(0);
    setPhase('playing');
    const t = levelStartElapsed.current;
    setElapsed(t);
    elapsedRef.current = t;
    timerRunning.current = false;
    pathCellsRef.current.clear();
    exitChimeRef.current  = false;
    hintsUsedRef.current  = 0;
    tapTimesRef.current   = [];
    hintActiveRef.current = false;
    clearTimeout(hintTimeoutRef.current);
    setHintActive(false);
    justTeleportedRef.current = false;
    portalsRef.current = s.t.portals ? placePortals(s) : null;
    wispsRef.current   = placeWisps(s, portalsRef.current);
    wispCountRef.current = 0;
    wispBoostRef.current = false;
    clearTimeout(wispTimeoutRef.current);
    setCollectedWisps(0);
    setWispBoostActive(false);
    pathTrailRef.current  = [];
    trailRef.current      = [];
    replayRef.current     = [];
    startPosRef.current   = { x: s.player.x, y: s.player.y };
    revealedStepRef.current = makeRevealedSteps(s);
    movingWallsRef.current  = placeMovingWalls(s);
    prevWallEpochRef.current = 0;
    memoryDarkRef.current = false;
    setMemoryDarkState(false);
    lastMoveTimeRef.current = Date.now();
    const key = getLevelKey(levelIdxRef.current, mode, s.t);
    getGhost(key).then(path => { ghostPathRef.current = path || []; });
    forceUpdate();
  }, [mode, camX, camY, playerAnimX, playerAnimY, facingAnim, overlayOp, customConfig]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderRelease: (_, g) => {
      const adx = Math.abs(g.dx), ady = Math.abs(g.dy);
      if (adx < 8 && ady < 8) {
        handleHintRef.current?.();
        return;
      }
      if (adx > ady) handleMoveRef.current(g.dx > 0 ? 'right' : 'left');
      else           handleMoveRef.current(g.dy > 0 ? 'down'  : 'up');
    },
  })).current;

  // ── Render variables ──────────────────────────────────────────────────────
  const s   = gameRef.current;
  const pal = highContrast
    ? { ...s.t.pal, lit: '#ffffff', glow: '#ffffff', rim: '#cccccc' }
    : s.t.pal;

  const skinDef    = selectedSkin !== 'default' ? FIREFLY_SKINS[selectedSkin] : null;
  const fireflyPal = (skinDef && !highContrast)
    ? { ...pal, lit: skinDef.lit, glow: skinDef.glow, air: skinDef.air }
    : pal;

  const T  = s.tile;
  const px = s.player.x;
  const py = s.player.y;

  const baseReveal      = s.t.reveal + fogOffset;
  const timeDecay       = Math.max(0, elapsed - 120) * 0.003;
  const wispBonus       = wispBoostActive ? 0.8 : 0;
  const decayed         = Math.max(baseReveal * 0.55, baseReveal - timeDecay);
  const effectiveReveal = (memoryDark && memoryMode)
    ? 0.35
    : (hintActive ? baseReveal * 1.8 : decayed) + wispBonus;

  // Cone fog precompute
  const coneEnabled = fogShape === 'cone';
  const gameNorm    = coneEnabled ? ((facingRef.current % 360) + 360) % 360 : 0;
  const facingRadC  = coneEnabled ? (gameNorm - 90) * (Math.PI / 180) : 0;

  const getConeReveal = (dx, dy) => {
    if (!coneEnabled || (dx === 0 && dy === 0)) return effectiveReveal;
    const cellRad   = Math.atan2(dy, dx);
    const angleDiff = Math.abs(Math.atan2(
      Math.sin(cellRad - facingRadC),
      Math.cos(cellRad - facingRadC)
    ));
    return effectiveReveal * (0.4 + ((Math.cos(angleDiff) + 1) / 2) * 0.6);
  };

  const rs = revealedStepRef.current;
  const getFade = (ry, cx2) => {
    const revStep = rs?.[ry]?.[cx2] ?? -100;
    return revStep < 0 ? 1.0 : Math.min(1, (s.steps - revStep) / 4 + 0.25);
  };

  // Moving wall set for O(1) render lookup
  const movingWallSet = new Set(movingWallsRef.current.map(w => `${w.x},${w.y}`));

  const levelLabel = mode === 'daily'     ? 'Daily'
                   : mode === 'weekly'    ? 'Weekly'
                   : mode === 'challenge' ? 'Challenge'
                   : mode === 'endless'   ? `∞ ${levelIdxRef.current + 1}`
                   : `${levelIdxRef.current + 1} / ${LEVELS.length}`;

  // Edge compass
  const exitScreenDX = (s.exit.x - px) * T;
  const exitScreenDY = (s.exit.y - py) * T;
  const CMARGIN      = 22;
  const halfW        = VW / 2 - CMARGIN;
  const halfH        = VH / 2 - CMARGIN;
  const exitOffScreen = Math.abs(exitScreenDX) > halfW || Math.abs(exitScreenDY) > halfH;
  const showCompass   = exitOffScreen && phase === 'playing' && !exitChimeRef.current;
  let compassX = 0, compassY = 0;
  if (showCompass) {
    const scX = exitScreenDX !== 0 ? halfW / Math.abs(exitScreenDX) : Infinity;
    const scY = exitScreenDY !== 0 ? halfH / Math.abs(exitScreenDY) : Infinity;
    const sc  = Math.min(scX, scY);
    compassX  = VW / 2 + exitScreenDX * sc;
    compassY  = VH / 2 + exitScreenDY * sc;
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <AudioEngine ref={audioRef} muted={!soundEnabled} musicVol={musicVol} />

      {/* HUD */}
      <View style={[styles.hud, { height: HUD_H, paddingTop: TOP_PAD, backgroundColor: pal.bg }]}>
        <View style={styles.hudLeft}>
          <TouchableOpacity onPress={handleHome} style={styles.homeBtn} activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.homeTxt, { color: pal.rim }]}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.hudMood, { color: pal.lit }]}>{s.t.mood}</Text>
            <Text style={[styles.hudSub,  { color: pal.rim }]}>{s.t.sub}</Text>
          </View>
        </View>
        <View style={styles.hudRight}>
          <Text style={[styles.hudStat, { color: pal.air }]}>{levelLabel}</Text>
          <Text style={[styles.hudStat, { color: pal.lit }]}>{s.steps} steps</Text>
          <Text style={[styles.hudTime,  { color: pal.rim }]}>{fmtTime(elapsed)}</Text>
          {hintActive        && <Text style={[styles.hudHint, { color: pal.glow }]}>◎ Hint</Text>}
          {collectedWisps > 0 && <Text style={[styles.hudHint, { color: pal.air }]}>◈ {collectedWisps}</Text>}
          {memoryDark && memoryMode && <Text style={[styles.hudHint, { color: pal.rim, opacity: 0.6 }]}>● dark</Text>}
        </View>
      </View>

      {/* Maze viewport */}
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.mazeContainer,
            { width: s.t.cols * T, height: s.t.rows * T },
            { transform: [{ translateX: camX }, { translateY: camY }] },
          ]}
        >
          {/* Real tiles */}
          {s.grid.map((row, ry) =>
            row.map((cell, cx2) => {
              if (!s.revealed[ry][cx2]) return null;
              const dx = cx2 - px, dy = ry - py;
              const rev = getConeReveal(dx, dy);
              const L   = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / rev);
              const r   = Math.max(3, T * 0.18);
              const fade = getFade(ry, cx2);
              const isPath = highContrast && pathCellsRef.current.has(`${cx2},${ry}`);
              const isMW   = movingWallSet.has(`${cx2},${ry}`);
              if (cell === 1) {
                return (
                  <View key={`r${ry}_${cx2}`} style={[styles.tile, {
                    left: cx2 * T + 2, top: ry * T + 2,
                    width: T - 4, height: T - 4, borderRadius: r,
                    backgroundColor: isMW ? pal.air : (isPath ? pal.air : pal.lit),
                    opacity: (highContrast
                      ? (isPath ? 0.45 + L * 0.45 : 0.14 + L * 0.56)
                      : 0.07 + L * 0.62) * fade,
                  }]} />
                );
              }
              return (
                <View key={`r${ry}_${cx2}`} style={[styles.tile, {
                  left: cx2 * T + 1, top: ry * T + 1,
                  width: T - 2, height: T - 2, borderRadius: r,
                  backgroundColor: pal.wall,
                  opacity: (highContrast ? 0.72 + L * 0.28 : 0.48 + L * 0.38) * fade,
                }]} />
              );
            })
          )}

          {/* Virtual wall tiles beyond boundary */}
          {(() => {
            const R   = Math.ceil(s.t.reveal) + 1;
            const out = [];
            for (let ry = py - R; ry <= py + R; ry++) {
              for (let cx2 = px - R; cx2 <= px + R; cx2++) {
                if (ry >= 0 && ry < s.t.rows && cx2 >= 0 && cx2 < s.t.cols) continue;
                const dx = cx2 - px, dy = ry - py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > effectiveReveal + 0.5) continue;
                const rev = getConeReveal(dx, dy);
                const L = Math.max(0, 1 - dist / rev);
                if (L <= 0) continue;
                const r = Math.max(3, T * 0.18);
                out.push(
                  <View key={`v${ry}_${cx2}`} style={[styles.tile, {
                    left: cx2 * T + 1, top: ry * T + 1,
                    width: T - 2, height: T - 2, borderRadius: r,
                    backgroundColor: pal.wall, opacity: 0.48 + L * 0.38,
                  }]} />
                );
              }
            }
            return out;
          })()}

          {/* Ghost run dots */}
          {ghostPathRef.current.length > 0 && ghostPathRef.current.map((cell, i) => {
            if (!s.revealed[cell.y]?.[cell.x]) return null;
            if (s.grid[cell.y]?.[cell.x] !== 1) return null;
            const dx = cell.x - px, dy = cell.y - py;
            const op = Math.max(0, 0.28 - Math.sqrt(dx * dx + dy * dy) * 0.035);
            if (op <= 0.01) return null;
            const dotR = T * 0.12;
            return (
              <View key={`ghost-${i}`} style={{
                position: 'absolute',
                width: dotR * 2, height: dotR * 2, borderRadius: dotR,
                left: cell.x * T + T / 2 - dotR,
                top:  cell.y * T + T / 2 - dotR,
                backgroundColor: pal.glow, opacity: op,
              }} />
            );
          })}

          {/* Moving wall indicators */}
          {movingWallsRef.current.map((w, i) => {
            if (!s.revealed[w.y]?.[w.x]) return null;
            const isOpen = s.grid[w.y][w.x] === 1;
            const r = Math.max(3, T * 0.18);
            return (
              <Animated.View key={`mw-${i}`} pointerEvents="none" style={{
                position: 'absolute',
                left: w.x * T + 2, top: w.y * T + 2,
                width: T - 4, height: T - 4, borderRadius: r,
                borderWidth: 1.5, borderColor: pal.air,
                opacity: wallFlipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isOpen ? 0.2 : 0.45, 0.9],
                }),
              }} />
            );
          })}

          {/* Exit arch */}
          <View style={[styles.exitOuter, {
            left: s.exit.x * T + T / 2 - T * 0.6,
            top:  s.exit.y * T + T / 2 - T * 0.6,
            width: T * 1.2, height: T * 1.2, borderRadius: T * 0.6,
            backgroundColor: pal.glow + '22', shadowColor: pal.glow,
          }]} />
          <View style={[styles.exitInner, {
            left: s.exit.x * T + T / 2 - T * 0.28,
            top:  s.exit.y * T + T / 2 - T * 0.28,
            width: T * 0.56, height: T * 0.56, borderRadius: T * 0.28,
            backgroundColor: pal.glow, shadowColor: pal.glow,
          }]} />

          {/* Level complete particle burst */}
          {phase !== 'playing' && PARTICLE_DATA.map((pd, i) => {
            const dist = T * pd.distMult;
            const tx = Math.cos(pd.angle) * dist;
            const ty = Math.sin(pd.angle) * dist;
            return (
              <Animated.View key={`burst-${i}`} pointerEvents="none" style={{
                position: 'absolute',
                width: 5, height: 5, borderRadius: 2.5,
                left: s.exit.x * T + T / 2 - 2.5,
                top:  s.exit.y * T + T / 2 - 2.5,
                backgroundColor: pal.glow,
                opacity: burstAnim.interpolate({
                  inputRange: [0, 0.2, 0.7, 1],
                  outputRange: [0, 0.9, 0.65, 0],
                }),
                transform: [
                  { translateX: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
                  { translateY: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
                  { scale: burstAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.1, 0.6] }) },
                ],
              }} />
            );
          })}

          {/* Pulse ripple */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute',
            width: T * 3, height: T * 3, borderRadius: T * 1.5,
            left: s.exit.x * T + T / 2 - T * 1.5,
            top:  s.exit.y * T + T / 2 - T * 1.5,
            borderWidth: 1.5, borderColor: pal.glow,
            opacity:   rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] }),
            transform: [{ scale: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3.2] }) }],
          }} />

          {/* Portal rings */}
          {portalsRef.current && portalsRef.current.map((p, i) =>
            s.revealed[p.y]?.[p.x] ? (
              <Animated.View key={`portal-${i}`} pointerEvents="none" style={{
                position: 'absolute',
                width: T * 0.8, height: T * 0.8, borderRadius: T * 0.4,
                left: p.x * T + T / 2 - T * 0.4,
                top:  p.y * T + T / 2 - T * 0.4,
                borderWidth: 2, borderColor: pal.air,
                opacity:   portalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] }),
                transform: [{ scale: portalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
              }} />
            ) : null
          )}

          {/* Wisps */}
          {[...wispsRef.current].map(key => {
            const [wx, wy] = key.split(',').map(Number);
            if (!s.revealed[wy]?.[wx]) return null;
            const dotR = T * 0.18;
            return (
              <Animated.View key={`wisp-${key}`} pointerEvents="none" style={{
                position: 'absolute',
                width: dotR * 2, height: dotR * 2, borderRadius: dotR,
                left: wx * T + T / 2 - dotR,
                top:  wy * T + T / 2 - dotR,
                backgroundColor: pal.glow,
                opacity:   wispAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
                transform: [{ scale: wispAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.25] }) }],
              }} />
            );
          })}

          {/* Firefly trail */}
          {trailRef.current.map((pos, i) => {
            const dotR = T * (0.14 - i * 0.02);
            return (
              <View key={`trail-${i}`} style={{
                position: 'absolute',
                width: dotR * 2, height: dotR * 2, borderRadius: dotR,
                left: pos.x * T + T / 2 - dotR,
                top:  pos.y * T + T / 2 - dotR,
                backgroundColor: fireflyPal.glow,
                opacity: TRAIL_OPS[i] ?? 0.03,
              }} />
            );
          })}

          <Firefly
            animX={playerAnimX} animY={playerAnimY}
            facingAnim={facingAnim}
            wingAnim={wingAnim} glowBreath={glowBreath}
            pal={fireflyPal} collisionAnim={collisionAnim}
          />
        </Animated.View>

        {/* Edge compass */}
        {showCompass && (
          <Animated.View pointerEvents="none" style={{
            position: 'absolute',
            width: 10, height: 10, borderRadius: 5,
            left: compassX - 5, top: compassY - 5,
            backgroundColor: pal.glow,
            opacity: compassAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] }),
          }} />
        )}

        {/* Edge vignette */}
        <LinearGradient colors={[pal.bg, pal.bg + '00']}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }} />
        <LinearGradient colors={[pal.bg + '00', pal.bg]}
          pointerEvents="none"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }} />
        <LinearGradient colors={[pal.bg, pal.bg + '00']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 110 }} />
        <LinearGradient colors={[pal.bg + '00', pal.bg]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 110 }} />
      </View>

      {/* Home / pause overlay */}
      {homeVisible && (
        <View style={[styles.overlay, { zIndex: 100 }]}>
          <View style={[styles.overlayCard, { borderColor: pal.rim + '66' }]}>
            <Text style={[styles.overlayKicker, { color: pal.rim }]}>Pause</Text>
            <Text style={[styles.overlayMood,   { color: pal.glow }]}>{s.t.mood}</Text>
            <Text style={[styles.homeSub,        { color: pal.rim }]}>
              {s.steps} steps  ·  {fmtTime(elapsed)}
            </Text>
            <TouchableOpacity
              style={[styles.overlayBtn, { borderColor: pal.glow, marginTop: 24 }]}
              onPress={() => setHomeVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.overlayBtnTxt, { color: pal.glow }]}>Keep Playing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overlayBtn, { borderColor: pal.rim + '88', marginTop: 12 }]}
              onPress={handleRestartLevel}
              activeOpacity={0.7}
            >
              <Text style={[styles.overlayBtnTxt, { color: pal.rim }]}>Restart Level</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.leaveBtn} onPress={onHome} activeOpacity={0.7}>
              <Text style={[styles.leaveTxt, { color: pal.rim }]}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* R key restart */}
      <TextInput
        style={styles.keyInput}
        autoFocus={false}
        showSoftInputOnFocus={false}
        onKeyPress={({ nativeEvent: { key } }) => {
          if ((key === 'r' || key === 'R') && phase === 'playing') handleRestartLevel();
        }}
      />

      {/* Level / game complete overlay */}
      {phase !== 'playing' && (
        <Animated.View style={[styles.overlay, { opacity: overlayOp }]}>
          <View style={[styles.overlayCard, { borderColor: pal.rim + '66' }]}>
            {phase === 'levelDone' && (() => {
              const r = resultsRef.current[resultsRef.current.length - 1];
              return (
                <>
                  <Text style={[styles.overlayKicker, { color: pal.rim }]}>Level Complete</Text>
                  <Text style={[styles.overlayMood,   { color: pal.glow }]}>{r.mood}</Text>
                  <Text style={[styles.overlayStat,   { color: pal.lit  }]}>{r.steps} steps · {r.score} pts</Text>
                  <Text style={[styles.overlayStat,   { color: pal.rim  }]}>{fmtTime(r.time)} · Top {100 - r.pct}%</Text>
                  <TouchableOpacity style={[styles.overlayBtn, { borderColor: pal.glow }]}
                    onPress={handleNextLevel} activeOpacity={0.7}>
                    <Text style={[styles.overlayBtnTxt, { color: pal.glow }]}>Next Level</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
            {phase === 'gameDone' && (
              <>
                <Text style={[styles.overlayKicker, { color: pal.rim }]}>
                  {mode === 'daily'     ? 'Daily Complete'
                   : mode === 'weekly'   ? 'Weekly Complete'
                   : mode === 'challenge' ? 'Challenge Complete'
                   : 'Every arch found'}
                </Text>
                <Text style={[styles.overlayMood, { color: pal.glow }]}>
                  {mode === 'endless' ? `Depth ${levelIdxRef.current + 1}` : 'Complete'}
                </Text>
                <TouchableOpacity style={[styles.overlayBtn, { borderColor: pal.glow }]}
                  onPress={handleGameEnd} activeOpacity={0.7}>
                  <Text style={[styles.overlayBtnTxt, { color: pal.glow }]}>View Score</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      )}

      {/* Level transition fade */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: transitionOp }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 10,
  },
  hudLeft:  { flexDirection: 'row', alignItems: 'flex-end' },
  homeBtn:  { marginRight: 14, marginBottom: 3 },
  homeTxt:  { fontSize: 18 },
  hudMood:  { fontSize: 17, fontWeight: '300', letterSpacing: 2 },
  hudSub:   { fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
  hudRight: { alignItems: 'flex-end' },
  hudStat:  { fontSize: 12, letterSpacing: 1, lineHeight: 18 },
  hudTime:  { fontSize: 11, letterSpacing: 1, lineHeight: 16, opacity: 0.6 },
  hudHint:  { fontSize: 10, letterSpacing: 1, lineHeight: 14, opacity: 0.85 },

  viewport:      { flex: 1, overflow: 'hidden' },
  mazeContainer: { position: 'absolute' },
  tile:          { position: 'absolute' },

  exitOuter: { position: 'absolute', shadowRadius: 14, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  exitInner: { position: 'absolute', shadowRadius: 10, shadowOpacity: 1,   shadowOffset: { width: 0, height: 0 }, elevation: 20 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', zIndex: 50,
  },
  overlayCard: {
    width: SW * 0.78, paddingVertical: 40, paddingHorizontal: 32,
    borderWidth: 1, borderRadius: 6, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayKicker: { fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  overlayMood:   { fontSize: 30, fontWeight: '200', letterSpacing: 4, marginBottom: 20 },
  overlayStat:   { fontSize: 14, letterSpacing: 1, marginBottom: 5 },
  overlayBtn:    { marginTop: 28, paddingHorizontal: 36, paddingVertical: 12, borderWidth: 1, borderRadius: 3 },
  overlayBtnTxt: { fontSize: 15, letterSpacing: 3 },
  homeSub:  { fontSize: 13, letterSpacing: 0.5, textAlign: 'center', opacity: 0.7, marginTop: 6 },
  leaveBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 },
  leaveTxt: { fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.5 },
  keyInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },
});
