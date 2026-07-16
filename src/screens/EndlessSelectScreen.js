import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Dimensions,
} from 'react-native';
import { LEVELS } from '../game/levels';
import { getEndlessLevel } from '../game/endless';
import { getBests } from '../storage/scores';

const { width: SW } = Dimensions.get('window');
const PAL = { bg: '#0d0b1a', glow: '#f3e6fb', lit: '#e3c8ee', rim: '#69538c', dim: '#221a30', wall: '#322747' };
const J = LEVELS.length; // 6 journey levels precede the endless-specific ones

function levelInfo(idx) {
  if (idx < J) {
    const l = LEVELS[idx];
    return { mood: l.mood, cols: l.cols, rows: l.rows };
  }
  const l = getEndlessLevel(idx - J);
  return { mood: l.mood, cols: l.cols, rows: l.rows };
}

export default function EndlessSelectScreen({ onSelect, onBack }) {
  const [nextIdx, setNextIdx]   = useState(null); // null = loading
  const [bests,   setBests]     = useState({});

  useEffect(() => {
    getBests().then(b => {
      setBests(b);
      // Find the highest endless level index completed (key format: "e-N")
      let max = -1;
      for (const key of Object.keys(b)) {
        if (key.startsWith('e-')) {
          const n = parseInt(key.slice(2), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      }
      setNextIdx(max + 1); // first unbeaten level (0 for a brand new player)
    });
  }, []);

  if (nextIdx === null) return <View style={styles.root} />;

  // Show all accessible levels + 3 locked previews (min 6 rows so the list looks full)
  const total = Math.max(nextIdx + 4, 6);
  const rows  = Array.from({ length: total }, (_, i) => i);

  const continueInfo = levelInfo(nextIdx);

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text style={styles.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Endless</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* ── Continue shortcut (only for returning players) ── */}
      {nextIdx > 0 && (
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => onSelect(nextIdx)}
          activeOpacity={0.7}
        >
          <Text style={styles.continuePrimary}>Continue  ·  Level {nextIdx + 1}</Text>
          <Text style={styles.continueSub}>
            {continueInfo.mood}  ·  {continueInfo.cols} × {continueInfo.rows}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Level list ── */}
      <FlatList
        data={rows}
        keyExtractor={String}
        contentContainerStyle={styles.listPad}
        renderItem={({ item: idx }) => {
          const locked = idx > nextIdx;
          const info   = levelInfo(idx);
          const best   = bests[`e-${idx}`];
          const isNext = idx === nextIdx;

          return (
            <TouchableOpacity
              style={[styles.row, locked && styles.rowLocked]}
              onPress={() => !locked && onSelect(idx)}
              activeOpacity={locked ? 1 : 0.7}
              disabled={locked}
            >
              {/* Level number */}
              <Text style={[styles.num, locked && styles.numFaded]}>{idx + 1}</Text>

              {/* Mood + size */}
              <View style={styles.middle}>
                <View style={styles.moodRow}>
                  <Text style={[styles.mood, locked && styles.moodFaded]}>{info.mood}</Text>
                  {isNext && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeTxt}>NEXT</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dims, locked && styles.moodFaded]}>
                  {info.cols} × {info.rows}
                </Text>
              </View>

              {/* Right: score or lock indicator */}
              <View style={styles.right}>
                {locked ? (
                  <Text style={styles.lockTxt}>locked</Text>
                ) : best ? (
                  <>
                    <Text style={styles.bestScore}>{best.score}</Text>
                    <Text style={styles.bestLbl}>pts</Text>
                  </>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAL.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16,
  },
  backTxt: { color: PAL.rim, fontSize: 14, letterSpacing: 1, width: 48 },
  title:   { color: PAL.lit, fontSize: 20, fontWeight: '200', letterSpacing: 4 },

  continueBtn: {
    marginHorizontal: 24, marginBottom: 12,
    paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: PAL.dim, borderWidth: 1, borderColor: PAL.rim, borderRadius: 4,
    alignItems: 'center',
  },
  continuePrimary: { color: PAL.lit, fontSize: 15, letterSpacing: 3 },
  continueSub:     { color: PAL.rim, fontSize: 11, letterSpacing: 1, marginTop: 5 },

  listPad: { paddingHorizontal: 24, paddingBottom: 40 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PAL.wall,
  },
  rowLocked: { opacity: 0.3 },

  num:      { color: PAL.rim, fontSize: 17, fontWeight: '200', letterSpacing: 2, width: 34, textAlign: 'right' },
  numFaded: { color: PAL.wall },

  middle:   { flex: 1, marginLeft: 16 },
  moodRow:  { flexDirection: 'row', alignItems: 'center' },
  mood:     { color: PAL.lit, fontSize: 16, letterSpacing: 0.5 },
  moodFaded:{ color: PAL.wall },
  dims:     { color: PAL.rim, fontSize: 11, letterSpacing: 0.5, marginTop: 3 },

  nextBadge: {
    marginLeft: 10, borderWidth: 1, borderColor: PAL.glow + '55',
    borderRadius: 2, paddingHorizontal: 6, paddingVertical: 1,
  },
  nextBadgeTxt: { color: PAL.glow, fontSize: 9, letterSpacing: 2 },

  right:     { alignItems: 'flex-end', minWidth: 44 },
  lockTxt:   { color: PAL.rim + '55', fontSize: 10, letterSpacing: 1 },
  bestScore: { color: PAL.glow, fontSize: 18, fontWeight: '200', letterSpacing: 2 },
  bestLbl:   { color: PAL.rim, fontSize: 10, letterSpacing: 1, marginTop: 1 },
});
