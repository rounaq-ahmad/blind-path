import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';

export default function Firefly({ animX, animY, facingAnim, wingAnim, glowBreath, pal, scale = 1, collisionAnim = null }) {
  const tailFlash = useRef(new Animated.Value(0.5)).current;
  const tailScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let running = true;
    const flash = () => {
      if (!running) return;
      Animated.sequence([
        Animated.delay(900 + Math.random() * 2400),
        Animated.parallel([
          Animated.timing(tailFlash, { toValue: 1,    duration: 90,  useNativeDriver: true }),
          Animated.timing(tailScale, { toValue: 1.35, duration: 90,  useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tailFlash, { toValue: 0.2,  duration: 220, useNativeDriver: true }),
          Animated.timing(tailScale, { toValue: 0.85, duration: 220, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tailFlash, { toValue: 0.9,  duration: 70,  useNativeDriver: true }),
          Animated.timing(tailScale, { toValue: 1.2,  duration: 70,  useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tailFlash, { toValue: 0.5,  duration: 420, useNativeDriver: true }),
          Animated.timing(tailScale, { toValue: 1,    duration: 420, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => { if (finished && running) flash(); });
    };
    flash();
    return () => { running = false; };
  }, [tailFlash, tailScale]);

  const wingScale = wingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
  const glowOpOut = glowBreath.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.22] });
  const glowOpMid = glowBreath.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.40] });
  const rotation  = facingAnim.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
    extrapolate: 'extend',
  });

  const wingFore = pal.air + 'bb';
  const wingHind = pal.air + '66';

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, top: 0, width: 0, height: 0,
        transform: [{ translateX: animX }, { translateY: animY }, { rotate: rotation }, { scale }],
      }}
    >
      <Animated.View style={{ position: 'absolute', width: 68, height: 68, borderRadius: 34, left: -34, top: -34, backgroundColor: pal.glow, opacity: glowOpOut }} />
      <Animated.View style={{ position: 'absolute', width: 38, height: 38, borderRadius: 19, left: -19, top: -19, backgroundColor: pal.glow, opacity: glowOpMid }} />
      <Animated.View style={{ position: 'absolute', width: 21, height: 13, borderRadius: 13, left: -23, top: -15, backgroundColor: wingFore, transform: [{ scaleX: wingScale }] }} />
      <Animated.View style={{ position: 'absolute', width: 21, height: 13, borderRadius: 13, left: 2,   top: -15, backgroundColor: wingFore, transform: [{ scaleX: wingScale }] }} />
      <Animated.View style={{ position: 'absolute', width: 15, height: 9,  borderRadius: 9,  left: -16, top: -3,  backgroundColor: wingHind, transform: [{ scaleX: wingScale }] }} />
      <Animated.View style={{ position: 'absolute', width: 15, height: 9,  borderRadius: 9,  left: 1,   top: -3,  backgroundColor: wingHind, transform: [{ scaleX: wingScale }] }} />
      <View style={{ position: 'absolute', width: 6,  height: 6,  borderRadius: 3, left: -3,   top: -15, backgroundColor: pal.lit }} />
      <View style={{ position: 'absolute', width: 8,  height: 11, borderRadius: 4, left: -4,   top: -10, backgroundColor: pal.lit + 'dd' }} />
      <Animated.View style={{ position: 'absolute', width: 7, height: 11, borderRadius: 4, left: -3.5, top: 0, backgroundColor: pal.glow, opacity: tailFlash, transform: [{ scale: tailScale }] }} />
      <View style={{ position: 'absolute', width: 4,  height: 4,  borderRadius: 2, left: -2,   top: -14, backgroundColor: '#ffffff', opacity: 0.9 }} />
      <View style={{ position: 'absolute', width: 3,  height: 7,  borderRadius: 2, left: -1.5, top: -8,  backgroundColor: '#ffffff', opacity: 0.18 }} />
      {collisionAnim && (
        <Animated.View style={{
          position: 'absolute', width: 56, height: 56, borderRadius: 28,
          left: -28, top: -28, backgroundColor: '#ffffff', opacity: collisionAnim,
        }} />
      )}
    </Animated.View>
  );
}
