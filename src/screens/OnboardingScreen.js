import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';

const { width: SW } = Dimensions.get('window');
const PAL = {
  bg:  '#0d0b1a',
  glow:'#f3e6fb',
  lit: '#e3c8ee',
  rim: '#69538c',
  dim: '#221a30',
};

const CARDS = [
  {
    glyph: '✦',
    title: 'Your Firefly',
    body:  'You are a tiny firefly, alone in the dark.\nSwipe in any direction to move through the maze.',
  },
  {
    glyph: '◌',
    title: 'Fog of War',
    body:  'Your glow reveals only a small circle around you. The longer you take, the tighter the darkness becomes.',
  },
  {
    glyph: '◎',
    title: 'The Exit Arch',
    body:  'Find the glowing exit arch to clear the level. A chime plays when you\'re close — listen for it.',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (e) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / SW);
    setPage(p);
  };

  const handleNext = () => {
    if (page < CARDS.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * SW, animated: true });
    } else {
      onDone();
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {CARDS.map((card, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.glyph}>{card.glyph}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicator */}
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.7}>
          <Text style={styles.nextTxt}>{page < CARDS.length - 1 ? 'Next' : 'Begin'}</Text>
        </TouchableOpacity>

        {page < CARDS.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={onDone} activeOpacity={0.7}>
            <Text style={styles.skipTxt}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: PAL.bg, alignItems: 'center' },
  scroll:        { flex: 1, width: SW },
  scrollContent: { alignItems: 'flex-start' },

  card: {
    width: SW, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 44, paddingBottom: 40,
  },
  glyph:     { color: PAL.glow, fontSize: 72, marginBottom: 36, opacity: 0.65 },
  cardTitle: {
    color: PAL.lit, fontSize: 24, fontWeight: '200',
    letterSpacing: 4, marginBottom: 20, textAlign: 'center',
  },
  cardBody: {
    color: PAL.rim, fontSize: 15, letterSpacing: 0.4,
    lineHeight: 25, textAlign: 'center',
  },

  dots:    { flexDirection: 'row', marginBottom: 28 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: PAL.dim, marginHorizontal: 5 },
  dotActive: { backgroundColor: PAL.glow, width: 18, borderRadius: 3 },

  actions: { width: SW - 64, alignItems: 'center', marginBottom: 52 },
  nextBtn: {
    width: '100%', paddingVertical: 16, marginBottom: 14,
    borderWidth: 1, borderColor: PAL.rim, borderRadius: 4,
    alignItems: 'center', backgroundColor: PAL.dim,
  },
  nextTxt: { color: PAL.lit, fontSize: 16, letterSpacing: 4 },
  skipBtn: { paddingVertical: 10 },
  skipTxt: { color: PAL.rim, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.45 },
});
