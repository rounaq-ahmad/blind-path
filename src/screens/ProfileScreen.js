import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { getStats } from '../storage/stats';
import { ACH_DEFS } from '../game/achievements';

const { width: SW } = Dimensions.get('window');
const TOP_PAD = Platform.OS === 'ios' ? 52 : 36;

const PAL = {
  bg:  '#0d0b1a', glow: '#f3e6fb', lit: '#e3c8ee',
  rim: '#69538c', dim:  '#221a30', air: '#cda9e6',
};

function fmtTime(sec) {
  if (!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function favMood(moodCounts) {
  if (!moodCounts) return '—';
  const entries = Object.entries(moodCounts);
  if (!entries.length) return '—';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

const ACH_ORDER = Object.keys(ACH_DEFS);
const GROUPS = [...new Set(Object.values(ACH_DEFS).map(d => d.group))];

export default function ProfileScreen({ achievements = [], onBack }) {
  const [stats, setStats] = useState(null);

  useEffect(() => { getStats().then(setStats); }, []);

  const unlocked = new Set(achievements);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: TOP_PAD }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.6}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatBox value={stats?.totalMazes ?? '—'} label="mazes" />
            <StatBox value={stats?.totalSteps != null ? stats.totalSteps.toLocaleString() : '—'} label="steps" />
            <StatBox value={stats ? fmtTime(stats.totalTime) : '—'} label="time" />
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsRow}>
            <StatBox value={stats?.longestStreak ?? '—'} label="best streak" />
            <StatBox value={stats ? favMood(stats.moodCounts) : '—'} label="fav mood" small />
            <StatBox value={`${achievements.length}/${ACH_ORDER.length}`} label="achieved" />
          </View>
        </View>

        {/* Achievements */}
        <Text style={styles.sectionLabel}>Achievements</Text>

        {GROUPS.map(group => {
          const ids = ACH_ORDER.filter(id => ACH_DEFS[id].group === group);
          return (
            <View key={group} style={styles.group}>
              <Text style={styles.groupLabel}>{group}</Text>
              <View style={styles.achGrid}>
                {ids.map(id => {
                  const def    = ACH_DEFS[id];
                  const earned = unlocked.has(id);
                  return (
                    <View key={id} style={[styles.achCard, earned && styles.achCardEarned]}>
                      <Text style={[styles.achIcon, earned && { color: PAL.glow }]}>
                        {earned ? '✦' : '○'}
                      </Text>
                      <Text style={[styles.achLabel, earned && { color: PAL.lit }]} numberOfLines={1}>
                        {def.label}
                      </Text>
                      <Text style={[styles.achDesc, earned && { color: PAL.rim }]} numberOfLines={2}>
                        {def.desc}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ value, label, small = false }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, small && { fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const CARD_W = (SW - 48 - 8) / 2;

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: PAL.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backTxt: { color: PAL.rim, fontSize: 20 },
  title:   { color: PAL.lit, fontSize: 20, fontWeight: '200', letterSpacing: 4 },

  scroll: { paddingHorizontal: 24 },

  statsCard: {
    backgroundColor: PAL.dim, borderRadius: 6,
    paddingVertical: 20, paddingHorizontal: 16,
    marginBottom: 28,
  },
  statsRow:    { flexDirection: 'row' },
  statsDivider: { height: StyleSheet.hairlineWidth, backgroundColor: PAL.rim + '44', marginVertical: 16 },
  statBox:     { flex: 1, alignItems: 'center' },
  statValue:   { color: PAL.glow, fontSize: 22, fontWeight: '200', letterSpacing: 1, marginBottom: 4 },
  statLabel:   { color: PAL.rim, fontSize: 10, letterSpacing: 1 },

  sectionLabel: {
    color: PAL.rim, fontSize: 10, letterSpacing: 3,
    textTransform: 'uppercase', marginBottom: 16,
  },

  group:      { marginBottom: 20 },
  groupLabel: { color: PAL.rim + 'aa', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard: {
    width: CARD_W, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '33',
    borderRadius: 4, backgroundColor: PAL.dim + '88',
  },
  achCardEarned: { borderColor: PAL.glow + '44', backgroundColor: PAL.dim },
  achIcon:  { color: PAL.rim + '66', fontSize: 11, marginBottom: 5 },
  achLabel: { color: PAL.rim, fontSize: 12, letterSpacing: 0.5, marginBottom: 3 },
  achDesc:  { color: PAL.rim + '77', fontSize: 10, letterSpacing: 0.3, lineHeight: 14 },
});
