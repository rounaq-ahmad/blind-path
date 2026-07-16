import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions, Platform,
} from 'react-native';

const TOP_PAD = Platform.OS === 'ios' ? 52 : 36;
import Firefly from '../components/Firefly';
import { LEVELS } from '../game/levels';

const { width: SW } = Dimensions.get('window');

const PAL = {
  bg:   '#0d0b1a',
  glow: '#f3e6fb',
  lit:  '#e3c8ee',
  rim:  '#69538c',
  dim:  '#221a30',
  air:  '#cda9e6',
};

const CX = 80;
const CY = 80;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStr() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const day   = Math.floor((now - start) / 86400000);
  const week  = Math.floor((day + start.getDay()) / 7);
  return `W${week.toString().padStart(2, '0')}`;
}

function ProfileIcon({ color, size }) {
  const headD = size * 0.42;
  const bodyW = size * 0.72;
  const bodyH = size * 0.34;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 }}>
      <View style={{
        width: headD, height: headD, borderRadius: headD / 2,
        borderWidth: 1.5, borderColor: color, opacity: 0.7,
      }} />
      <View style={{
        width: bodyW, height: bodyH, marginTop: size * 0.06,
        borderTopLeftRadius: bodyW / 2, borderTopRightRadius: bodyW / 2,
        borderWidth: 1.5, borderBottomWidth: 0, borderColor: color, opacity: 0.7,
      }} />
    </View>
  );
}

export default function SplashScreen({ onStart, streak = 0, onSettings, onProfile, savedGame = null, onContinue }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const hoverX     = useRef(new Animated.Value(CX)).current;
  const hoverY     = useRef(new Animated.Value(CY)).current;
  const facingAnim = useRef(new Animated.Value(0)).current;
  const wingAnim   = useRef(new Animated.Value(0)).current;
  const glowBreath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const sin  = Easing.inOut(Easing.sin);

    Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }).start();

    const loopY = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(hoverY, { toValue: CY - 10, duration: 1900, easing: sin, useNativeDriver: true }),
        Animated.timing(hoverY, { toValue: CY + 6,  duration: 1900, easing: sin, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopY(); });
    };

    const loopX = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(hoverX, { toValue: CX - 7, duration: 2700, easing: sin, useNativeDriver: true }),
        Animated.timing(hoverX, { toValue: CX + 7, duration: 2700, easing: sin, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopX(); });
    };

    const loopFacing = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(facingAnim, { toValue: 12,  duration: 2600, easing: sin, useNativeDriver: true }),
        Animated.timing(facingAnim, { toValue: -12, duration: 2600, easing: sin, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopFacing(); });
    };

    const loopWing = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(wingAnim, { toValue: 1, duration: 190, easing: sin, useNativeDriver: true }),
        Animated.timing(wingAnim, { toValue: 0, duration: 190, easing: sin, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopWing(); });
    };

    const loopGlow = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(glowBreath, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowBreath, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopGlow(); });
    };

    loopY(); loopX(); loopFacing(); loopWing(); loopGlow();

    return () => {
      active = false;
      hoverY.stopAnimation(); hoverX.stopAnimation();
      facingAnim.stopAnimation(); wingAnim.stopAnimation(); glowBreath.stopAnimation();
    };
  }, [opacity, hoverX, hoverY, facingAnim, wingAnim, glowBreath]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.settingsBtn} onPress={onSettings} activeOpacity={0.5}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.settingsTxt}>⚙</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileBtn} onPress={onProfile} activeOpacity={0.5}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <ProfileIcon color={PAL.rim} size={22} />
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity }]}>
        <View style={styles.fireflyContainer}>
          <Firefly
            animX={hoverX} animY={hoverY}
            facingAnim={facingAnim}
            wingAnim={wingAnim} glowBreath={glowBreath}
            pal={PAL} scale={1.6}
          />
        </View>

        <Text style={styles.subtitle}>A quiet maze of light</Text>
        <Text style={styles.title}>Blind Path</Text>
        <Text style={styles.tagline}>Guide your firefly through the dark</Text>

        {/* Continue saved game */}
        {savedGame && onContinue && (
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.7}>
            <View style={styles.secondaryRow}>
              <Text style={styles.continueTxt}>Continue</Text>
              <Text style={styles.secondaryBadge}>↩</Text>
            </View>
            <Text style={styles.secondarySub}>
              {savedGame.mood} · {savedGame.steps} steps · {savedGame.mode}
            </Text>
          </TouchableOpacity>
        )}

        {/* Journey */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onStart('journey')} activeOpacity={0.7}>
          <Text style={styles.primaryTxt}>Begin Journey</Text>
          <Text style={styles.primarySub}>{LEVELS.length} levels · growing darkness</Text>
        </TouchableOpacity>

        {/* Daily */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onStart('daily')} activeOpacity={0.7}>
          <View style={styles.secondaryRow}>
            <Text style={styles.secondaryTxt}>Daily Maze</Text>
            <View style={styles.badgeGroup}>
              {streak > 0 && <Text style={styles.streakBadge}>🔥 {streak}</Text>}
              <Text style={styles.secondaryBadge}>{todayStr()}</Text>
            </View>
          </View>
          <Text style={styles.secondarySub}>same maze for everyone today · share your score</Text>
        </TouchableOpacity>

        {/* Weekly */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onStart('weekly')} activeOpacity={0.7}>
          <View style={styles.secondaryRow}>
            <Text style={styles.secondaryTxt}>Weekly Challenge</Text>
            <Text style={styles.secondaryBadge}>{weekStr()}</Text>
          </View>
          <Text style={styles.secondarySub}>bigger maze · resets every monday</Text>
        </TouchableOpacity>

        {/* Endless */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onStart('endless')} activeOpacity={0.7}>
          <View style={styles.secondaryRow}>
            <Text style={styles.secondaryTxt}>Endless</Text>
            <Text style={styles.secondaryBadge}>∞</Text>
          </View>
          <Text style={styles.secondarySub}>infinite depth · how far can you go</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAL.bg, alignItems: 'center', justifyContent: 'center' },
  content:   { alignItems: 'center', paddingHorizontal: 32, width: SW },

  settingsBtn: { position: 'absolute', top: TOP_PAD, right: 22, padding: 8 },
  settingsTxt: { color: PAL.rim, fontSize: 19, opacity: 0.7 },
  profileBtn:  { position: 'absolute', top: TOP_PAD, left: 22, padding: 8 },

  fireflyContainer: { width: 160, height: 160, marginBottom: 24 },

  subtitle: { color: PAL.rim, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  title:    { color: PAL.lit, fontSize: 40, fontWeight: '200', letterSpacing: 6, marginBottom: 10 },
  tagline:  { color: PAL.rim, fontSize: 13, letterSpacing: 1, marginBottom: 36, textAlign: 'center' },

  continueBtn: {
    width: SW - 64,
    paddingVertical: 12, paddingHorizontal: 20,
    borderWidth: 1, borderColor: PAL.glow + '66', borderRadius: 4,
    marginBottom: 12,
  },
  continueTxt: { color: PAL.glow, fontSize: 14, letterSpacing: 2 },

  primaryBtn: {
    width: SW - 64,
    paddingVertical: 16, paddingHorizontal: 24,
    borderWidth: 1, borderColor: PAL.rim, borderRadius: 4,
    alignItems: 'center', marginBottom: 12,
    backgroundColor: PAL.dim,
  },
  primaryTxt: { color: PAL.lit, fontSize: 16, letterSpacing: 4 },
  primarySub: { color: PAL.rim, fontSize: 11, letterSpacing: 1, marginTop: 4 },

  secondaryBtn: {
    width: SW - 64,
    paddingVertical: 13, paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '88', borderRadius: 4,
    marginBottom: 10,
  },
  secondaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secondaryTxt:   { color: PAL.lit, fontSize: 14, letterSpacing: 2 },
  secondaryBadge: { color: PAL.rim, fontSize: 11, letterSpacing: 1 },
  secondarySub:   { color: PAL.rim + 'aa', fontSize: 10, letterSpacing: 0.5, marginTop: 4 },

  badgeGroup:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: { color: PAL.glow, fontSize: 11, letterSpacing: 0.5 },

});
