import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const TOP_PAD = Platform.OS === 'ios' ? 52 : 36;
const CTRL_H  = 130;

export default function ReplayScreen({ replayData, onClose }) {
  const { moves, grid, rows, cols, start, exit, pal, mood } = replayData;

  const T     = Math.min(Math.floor((SH - TOP_PAD - 90 - CTRL_H) / rows), Math.floor(SW / cols));
  const dotR  = Math.max(4, T * 0.28);

  const [step, setStep]       = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef           = useRef(null);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const animX    = useRef(new Animated.Value(start.x * T + T / 2 - dotR)).current;
  const animY    = useRef(new Animated.Value(start.y * T + T / 2 - dotR)).current;

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loop(); });
    };
    loop();
    return () => { active = false; glowAnim.stopAnimation(); };
  }, [glowAnim]);

  useEffect(() => {
    const pos = step === 0 ? start : (moves[step - 1] || start);
    Animated.parallel([
      Animated.timing(animX, { toValue: pos.x * T + T / 2 - dotR, duration: 110, useNativeDriver: true }),
      Animated.timing(animY, { toValue: pos.y * T + T / 2 - dotR, duration: 110, useNativeDriver: true }),
    ]).start();
  }, [step, T, dotR, start, moves, animX, animY]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= moves.length) { setPlaying(false); return s; }
          return s + 1;
        });
      }, 150);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, moves.length]);

  const progress = moves.length > 0 ? step / moves.length : 0;
  const isDone   = step >= moves.length;

  const bg   = pal.bg   || '#0d0b1a';
  const wall = pal.wall || '#322747';
  const lit  = pal.lit  || '#e3c8ee';
  const glow = pal.glow || '#f3e6fb';
  const air  = pal.air  || '#cda9e6';
  const rim  = pal.rim  || '#69538c';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* Header — always on top, in normal flow */}
      <View style={[styles.header, { paddingTop: TOP_PAD }]}>
        <View>
          <Text style={[styles.moodTxt, { color: lit }]}>{mood}</Text>
          <Text style={[styles.stepTxt, { color: rim }]}>step {step} of {moves.length}</Text>
        </View>
        <TouchableOpacity onPress={onClose}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          activeOpacity={0.6}>
          <Text style={[styles.closeTxt, { color: rim }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Maze — flex: 1 area, centred */}
      <View style={styles.mazeArea}>
        <View style={{ width: cols * T, height: rows * T }}>
          {grid.map((row, ry) =>
            row.map((cell, cx) => {
              const r = Math.max(2, T * 0.14);
              return cell === 1 ? (
                <View key={`f${ry}_${cx}`} style={{
                  position: 'absolute',
                  left: cx * T + 1, top: ry * T + 1,
                  width: T - 2, height: T - 2, borderRadius: r,
                  backgroundColor: lit, opacity: 0.18,
                }} />
              ) : (
                <View key={`w${ry}_${cx}`} style={{
                  position: 'absolute',
                  left: cx * T + 1, top: ry * T + 1,
                  width: T - 2, height: T - 2, borderRadius: r,
                  backgroundColor: wall, opacity: 0.82,
                }} />
              );
            })
          )}

          {/* Path trace */}
          {moves.slice(0, step).map((m, i) => (
            <View key={`p${i}`} style={{
              position: 'absolute',
              width: Math.max(2, T * 0.2), height: Math.max(2, T * 0.2),
              borderRadius: T * 0.1,
              left: m.x * T + T / 2 - T * 0.1,
              top:  m.y * T + T / 2 - T * 0.1,
              backgroundColor: air, opacity: 0.28,
            }} />
          ))}

          {/* Exit glow */}
          <View style={{
            position: 'absolute',
            left: exit.x * T + T / 2 - T * 0.32,
            top:  exit.y * T + T / 2 - T * 0.32,
            width: T * 0.64, height: T * 0.64, borderRadius: T * 0.32,
            backgroundColor: glow, opacity: 0.8,
          }} />

          {/* Player dot */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute',
            left: 0, top: 0,
            width: dotR * 2, height: dotR * 2, borderRadius: dotR,
            backgroundColor: glow,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.0] }),
            transform: [{ translateX: animX }, { translateY: animY }],
          }} />
        </View>
      </View>

      {/* Controls — always below maze, in normal flow */}
      <View style={[styles.controls, { borderTopColor: rim + '22' }]}>
        <View style={[styles.progressBar, { backgroundColor: wall }]}>
          <View style={[styles.progressFill, {
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: air,
          }]} />
        </View>
        <TouchableOpacity
          style={[styles.playBtn, { borderColor: glow + '88' }]}
          onPress={() => {
            if (isDone) { setStep(0); setPlaying(true); }
            else setPlaying(p => !p);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.playTxt, { color: glow }]}>
            {isDone ? 'Watch Again' : (playing ? 'Pause' : 'Play')}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 24, paddingBottom: 12,
    zIndex: 10,
  },
  moodTxt:  { fontSize: 17, fontWeight: '300', letterSpacing: 2 },
  stepTxt:  { fontSize: 11, letterSpacing: 1, marginTop: 3, opacity: 0.7 },
  closeTxt: { fontSize: 22, opacity: 0.6 },

  mazeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  controls: {
    paddingHorizontal: 36,
    paddingBottom: 48,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  progressBar:  { height: 2, width: '100%', borderRadius: 1, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  playBtn: {
    paddingHorizontal: 52, paddingVertical: 14,
    borderWidth: 1, borderRadius: 3, alignItems: 'center',
  },
  playTxt: { fontSize: 14, letterSpacing: 3 },
});
