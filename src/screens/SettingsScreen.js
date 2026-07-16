import React from 'react';
import {
  View, Text, TouchableOpacity, Switch, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { FIREFLY_SKINS, SKIN_UNLOCK } from '../game/skins';

const TOP_PAD = Platform.OS === 'ios' ? 52 : 36;
const { width: SW } = Dimensions.get('window');

const PAL = {
  bg:   '#0d0b1a',
  glow: '#f3e6fb',
  lit:  '#e3c8ee',
  rim:  '#69538c',
  dim:  '#221a30',
  air:  '#cda9e6',
};

const FOG_DESCS   = { cozy: 'wider view', normal: 'default', blind: 'nearly blind' };
const MUSIC_DESCS = { off: 'silent', low: 'quiet', mid: 'ambient', full: 'full volume' };
const SHAPE_DESCS = { round: 'circular reveal', cone: 'directional cone' };

export default function SettingsScreen({
  onBack,
  musicLevel, onMusicLevel,
  hapticsEnabled, onToggleHaptics,
  highContrast, onToggleHC,
  fogPreset, onFogPreset,
  fogShape = 'round', onFogShape,
  memoryMode = false, onMemoryMode,
  memoryModeUnlocked = false,
  selectedSkin, onSkin,
  unlockedSkins = ['default'],
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Audio */}
      <Section label="Audio">
        <Text style={styles.presetLabel}>Music Volume</Text>
        <View style={styles.presetRow}>
          {['off', 'low', 'mid', 'full'].map(level => (
            <TouchableOpacity
              key={level}
              style={[styles.presetBtn, musicLevel === level && styles.presetBtnActive]}
              onPress={() => onMusicLevel(level)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetBtnTxt, musicLevel === level && styles.presetBtnTxtActive]}>
                {level === 'off' ? 'Off' : level === 'low' ? 'Low' : level === 'mid' ? 'Mid' : 'Full'}
              </Text>
              {musicLevel === level && (
                <Text style={styles.presetDesc}>{MUSIC_DESCS[level]}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <ToggleRow label="Haptics" value={hapticsEnabled} onToggle={onToggleHaptics} />
      </Section>

      {/* Display */}
      <Section label="Display">
        <ToggleRow label="High Contrast" value={highContrast} onToggle={onToggleHC} />
      </Section>

      {/* Fog Density */}
      <Section label="Fog Density">
        <View style={styles.presetRow}>
          {['cozy', 'normal', 'blind'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.presetBtn, fogPreset === p && styles.presetBtnActive]}
              onPress={() => onFogPreset(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetBtnTxt, fogPreset === p && styles.presetBtnTxtActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
              {fogPreset === p && (
                <Text style={styles.presetDesc}>{FOG_DESCS[p]}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Fog Shape */}
      <Section label="Fog Shape">
        <View style={styles.presetRow}>
          {['round', 'cone'].map(shape => (
            <TouchableOpacity
              key={shape}
              style={[styles.presetBtn, fogShape === shape && styles.presetBtnActive]}
              onPress={() => onFogShape && onFogShape(shape)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetBtnTxt, fogShape === shape && styles.presetBtnTxtActive]}>
                {shape.charAt(0).toUpperCase() + shape.slice(1)}
              </Text>
              {fogShape === shape && (
                <Text style={styles.presetDesc}>{SHAPE_DESCS[shape]}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Memory Mode */}
      <Section label="Memory Mode">
        {memoryModeUnlocked ? (
          <>
            <ToggleRow label="Memory Mode" value={memoryMode} onToggle={onMemoryMode} />
            <Text style={styles.lockedHint}>maze goes dark after 3s of stillness</Text>
          </>
        ) : (
          <Text style={styles.lockedHint}>Complete the Journey to unlock</Text>
        )}
      </Section>

      {/* Firefly skins */}
      {unlockedSkins.length > 1 && (
        <Section label="Firefly">
          <View style={styles.skinRow}>
            {unlockedSkins.map(id => {
              const skin = FIREFLY_SKINS[id];
              if (!skin) return null;
              const active = selectedSkin === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.skinBtn, active && styles.skinBtnActive]}
                  onPress={() => onSkin(id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.skinDot, { backgroundColor: skin.glow }]} />
                  <Text style={[styles.skinName, active && { color: PAL.lit }]}>{skin.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {Object.entries(SKIN_UNLOCK).map(([id, hint]) =>
            !unlockedSkins.includes(id) ? (
              <Text key={id} style={styles.skinLock}>
                {FIREFLY_SKINS[id]?.name} · {hint}
              </Text>
            ) : null
          )}
        </Section>
      )}
    </View>
  );
}

function Section({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: PAL.dim, true: PAL.rim }}
        thumbColor={value ? PAL.glow : PAL.rim}
        ios_backgroundColor={PAL.dim}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: PAL.bg,
    paddingHorizontal: 24, paddingTop: TOP_PAD + 8,
  },

  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  backBtn: { marginRight: 18 },
  backTxt: { color: PAL.rim, fontSize: 20 },
  title:   { color: PAL.lit, fontSize: 20, fontWeight: '200', letterSpacing: 4 },

  section:      { marginBottom: 26 },
  sectionLabel: {
    color: PAL.rim, fontSize: 10, letterSpacing: 3,
    textTransform: 'uppercase', marginBottom: 12,
  },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel: { color: PAL.lit, fontSize: 15, letterSpacing: 1 },

  presetLabel: { color: PAL.air, fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  presetRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '66',
    borderRadius: 4,
  },
  presetBtnActive:    { borderColor: PAL.glow, backgroundColor: PAL.dim },
  presetBtnTxt:       { color: PAL.rim, fontSize: 12, letterSpacing: 1 },
  presetBtnTxtActive: { color: PAL.glow },
  presetDesc:         { color: PAL.rim, fontSize: 9, letterSpacing: 0.5, marginTop: 4, opacity: 0.7 },

  lockedHint: { color: PAL.rim + '66', fontSize: 11, letterSpacing: 0.5, marginTop: 2 },

  skinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  skinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '55', borderRadius: 4,
  },
  skinBtnActive: { borderColor: PAL.glow, backgroundColor: PAL.dim },
  skinDot:  { width: 12, height: 12, borderRadius: 6 },
  skinName: { color: PAL.rim, fontSize: 13, letterSpacing: 1 },
  skinLock: { color: PAL.rim + '55', fontSize: 10, letterSpacing: 0.5, marginTop: 4 },
});
