import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Share,
  StyleSheet, Dimensions, Modal,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { getBests, loadReplay } from '../storage/scores';
import { incrementStat } from '../storage/stats';
import { ACH_DEFS } from '../game/achievements';

const { width: SW } = Dimensions.get('window');
const PAL = {
  bg:  '#0d0b1a', glow: '#f3e6fb', lit: '#e3c8ee',
  rim: '#69538c', dim:  '#322747', air: '#cda9e6',
};

function fmtTime(sec) {
  if (!sec && sec !== 0) return '--:--';
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Score Card (capturable view) ─────────────────────────────────────────────
function ScoreCardView({ result, replay, cardRef }) {
  const pal  = result.pal || PAL;
  const bg   = pal.bg   || PAL.bg;
  const lit  = pal.lit  || PAL.lit;
  const glow = pal.glow || PAL.glow;
  const rim  = pal.rim  || PAL.rim;
  const air  = pal.air  || PAL.air;

  const CARD_W = 320, CARD_H = 460;

  // Mini path preview from replay data
  const pathCells = (() => {
    if (!replay) return null;
    const { grid, moves, cols, rows } = replay;
    const T = Math.min(Math.floor(140 / rows), Math.floor(240 / cols));
    if (T < 3) return null;
    const mW = cols * T, mH = rows * T;
    const left = (240 - mW) / 2;
    return { grid, moves, cols, rows, T, mW, mH, left };
  })();

  const pctText = result.pct != null ? `Top ${100 - result.pct}%` : null;

  return (
    <View ref={cardRef} collapsable={false} style={[cardStyles.card, { width: CARD_W, height: CARD_H, backgroundColor: bg }]}>
      {/* Brand */}
      <Text style={[cardStyles.brand, { color: rim }]}>BLIND PATH</Text>

      {/* Mood */}
      <Text style={[cardStyles.mood, { color: lit }]}>{result.mood}</Text>
      {result.dateKey && (
        <Text style={[cardStyles.dateKey, { color: rim }]}>{result.dateKey}</Text>
      )}

      {/* Path preview */}
      {pathCells ? (
        <View style={[cardStyles.mazeWrap, { width: pathCells.mW, height: pathCells.mH }]}>
          {pathCells.grid.map((row, ry) =>
            row.map((cell, cx) => (
              <View key={`${ry}_${cx}`} style={{
                position: 'absolute',
                left: cx * pathCells.T, top: ry * pathCells.T,
                width: pathCells.T - 1, height: pathCells.T - 1,
                borderRadius: 1,
                backgroundColor: cell === 1 ? (lit + '28') : (rim + '66'),
              }} />
            ))
          )}
          {pathCells.moves.map((m, i) => (
            <View key={`p${i}`} style={{
              position: 'absolute',
              left: m.x * pathCells.T + pathCells.T * 0.25,
              top:  m.y * pathCells.T + pathCells.T * 0.25,
              width: pathCells.T * 0.5, height: pathCells.T * 0.5,
              borderRadius: pathCells.T * 0.25,
              backgroundColor: air,
              opacity: 0.6,
            }} />
          ))}
        </View>
      ) : (
        <View style={cardStyles.dotPattern}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View key={i} style={[cardStyles.dot, { backgroundColor: rim + '55' }]} />
          ))}
        </View>
      )}

      {/* Stats */}
      <View style={[cardStyles.statsRow, { borderTopColor: rim + '44', borderBottomColor: rim + '44' }]}>
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: glow }]}>{result.steps}</Text>
          <Text style={[cardStyles.statLbl, { color: rim }]}>steps</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: rim + '44' }]} />
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: glow }]}>{result.par}</Text>
          <Text style={[cardStyles.statLbl, { color: rim }]}>par</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: rim + '44' }]} />
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: glow }]}>{result.score}</Text>
          <Text style={[cardStyles.statLbl, { color: rim }]}>score</Text>
        </View>
      </View>

      {pctText && <Text style={[cardStyles.pct, { color: air }]}>{pctText}</Text>}

      <Text style={[cardStyles.cta, { color: rim }]}>can you beat this?</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card:      { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 36, paddingHorizontal: 28 },
  brand:     { fontSize: 10, letterSpacing: 5, textTransform: 'uppercase' },
  mood:      { fontSize: 30, fontWeight: '200', letterSpacing: 4, marginTop: 8 },
  dateKey:   { fontSize: 11, letterSpacing: 2, marginTop: 4 },
  mazeWrap:  { marginVertical: 16 },
  dotPattern:{ flexDirection: 'row', flexWrap: 'wrap', width: 200, gap: 10, marginVertical: 20, justifyContent: 'center' },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  statsRow:  {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%', paddingVertical: 18,
  },
  stat:     { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 28, fontWeight: '100', letterSpacing: 2 },
  statLbl:  { fontSize: 10, letterSpacing: 2, marginTop: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 40 },
  pct:      { fontSize: 12, letterSpacing: 2 },
  cta:      { fontSize: 11, letterSpacing: 2 },
});

// ─── ScoreScreen ───────────────────────────────────────────────────────────────
export default function ScoreScreen({
  results, mode, onPlayAgain, onWatchReplay,
  achievements = [], newAchievements = [],
}) {
  const [bests,       setBests]       = useState({});
  const [cardVisible, setCardVisible] = useState(false);
  const [replay,      setReplay]      = useState(null);
  const cardRef = useRef(null);

  useEffect(() => { getBests().then(setBests); }, []);

  const lastResult = results[results.length - 1];

  useEffect(() => {
    if (!lastResult?.levelKey) return;
    loadReplay(lastResult.levelKey).then(data => { if (data) setReplay(data); });
  }, [lastResult]);

  const total      = results.reduce((s, r) => s + r.score, 0);
  const avg        = results.length > 0 ? Math.round(total / results.length) : 0;
  const totalSteps = results.reduce((s, r) => s + r.steps, 0);
  const totalTime  = results.reduce((s, r) => s + (r.time || 0), 0);

  const handleShare = async () => {
    if (results.length === 0) return;
    let lines = [];
    if (mode === 'daily' || mode === 'weekly') {
      const r = results[0];
      const label = mode === 'weekly' ? `Weekly ${r.dateKey}` : `Daily ${r.dateKey}`;
      lines = [`Blind Path  ·  ${label}`, `${r.mood}  ·  ${r.steps} steps  ·  ${100 - r.pct}th percentile`, `${r.score} pts  ·  ${fmtTime(r.time)}`, '#BlindPath'];
    } else if (mode === 'endless') {
      lines = [`Blind Path  ·  Endless  (${results.length} levels)`,
        ...results.map(r => `${r.mood}  ·  ${r.steps} steps`),
        `Total  ·  ${totalSteps} steps  ·  ${fmtTime(totalTime)}`, '#BlindPath'];
    } else {
      lines = [`Blind Path  ·  Journey Complete`,
        ...results.map(r => `${r.mood}  ·  ${r.steps} steps  ·  ${100 - r.pct}th percentile`),
        `Total  ·  ${totalSteps} steps  ·  ${fmtTime(totalTime)}`, '#BlindPath'];
    }
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  };

  const handleShareCard = useCallback(async () => {
    setCardVisible(true);
    // Let the modal render before capturing
    await new Promise(r => setTimeout(r, 80));
    try {
      const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.92 });
      await Share.share({ url: uri, message: `Blind Path · ${lastResult?.mood} · ${lastResult?.steps} steps · can you beat this?` });
      await incrementStat('cardShared');
    } catch {
      // Fallback to text
      if (lastResult) {
        await Share.share({ message: `Blind Path · ${lastResult.mood} · ${lastResult.steps} steps · Score: ${lastResult.score}` });
      }
    } finally {
      setCardVisible(false);
    }
  }, [lastResult]);

  const handleChallenge = async () => {
    const r = lastResult;
    if (!r?.seed) return;
    const url = `blindpath://challenge?seed=${r.seed}&cols=${r.cols || 25}&rows=${r.rows || 17}&par=${r.par}&mood=${encodeURIComponent(r.mood)}`;
    const msg = `Can you beat my ${r.score}pts on "${r.mood}" in Blind Path?\n${url}`;
    try { await Share.share({ message: msg }); } catch {}
  };

  const modeLabel = mode === 'daily'     ? 'Daily Complete'
                  : mode === 'weekly'    ? 'Weekly Complete'
                  : mode === 'challenge' ? 'Challenge Complete'
                  : mode === 'endless'   ? 'Endless Run'
                  : 'All arches found';

  return (
    <View style={styles.root}>
      {/* Off-screen card for capture */}
      <Modal visible={cardVisible} transparent animationType="none">
        <View style={styles.cardCapture}>
          {lastResult && (
            <ScoreCardView result={lastResult} replay={replay} cardRef={cardRef} />
          )}
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.kicker}>{modeLabel}</Text>
        <Text style={styles.title}>Blind Path</Text>
        <Text style={styles.avg}>{avg}</Text>
        <Text style={styles.avgLbl}>average score</Text>
        <Text style={styles.totalTime}>{fmtTime(totalTime)} total</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {results.map((r, i) => {
          const prev    = bests[r.levelKey];
          const isNewPB = prev && r.score >= prev.score;
          return (
            <View key={i} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowMoodRow}>
                  <Text style={styles.rowMood}>{r.mood}</Text>
                  {isNewPB && <Text style={styles.pbBadge}>PB</Text>}
                </View>
                <Text style={styles.rowMeta}>
                  {r.steps} steps · par {r.par} · {fmtTime(r.time)}
                  {r.hints > 0 ? ` · ${r.hints} hint${r.hints > 1 ? 's' : ''} used` : ''}
                </Text>
                {prev && !isNewPB && (
                  <Text style={styles.rowPrev}>Best: {prev.steps} steps · {prev.score} pts</Text>
                )}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowScore}>{r.score}</Text>
                <Text style={styles.rowPct}>Top {100 - r.pct}%</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLbl}>Total steps</Text>
          <Text style={styles.totalVal}>{totalSteps}</Text>
        </View>

        {achievements.length > 0 && (
          <View style={styles.achSection}>
            <Text style={styles.achHeader}>Achievements</Text>
            {Object.entries(ACH_DEFS)
              .filter(([id]) => achievements.includes(id))
              .map(([id, def]) => {
                const isNew = newAchievements.includes(id);
                return (
                  <View key={id} style={styles.achRow}>
                    <Text style={styles.achIcon}>{isNew ? '★' : '✦'}</Text>
                    <View style={styles.achText}>
                      <Text style={[styles.achLabel, isNew && styles.achLabelNew]}>{def.label}</Text>
                      <Text style={styles.achDesc}>{def.desc}</Text>
                    </View>
                    {isNew && <Text style={styles.achNewBadge}>NEW</Text>}
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {/* Share card image */}
        {lastResult && (
          <TouchableOpacity style={styles.cardBtn} onPress={handleShareCard} activeOpacity={0.7}>
            <Text style={styles.cardTxt}>Share Score Card</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareTxt}>
            {mode === 'daily' || mode === 'weekly' ? 'Share Result' : 'Copy · Share'}
          </Text>
        </TouchableOpacity>

        {lastResult?.seed != null && (
          <TouchableOpacity style={styles.challengeBtn} onPress={handleChallenge} activeOpacity={0.7}>
            <Text style={styles.challengeTxt}>Challenge a Friend</Text>
          </TouchableOpacity>
        )}

        {lastResult?.levelKey && onWatchReplay && (
          <TouchableOpacity style={styles.replayBtn}
            onPress={() => onWatchReplay(lastResult.levelKey)}
            activeOpacity={0.7}>
            <Text style={styles.replayTxt}>Watch Replay</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btn} onPress={onPlayAgain} activeOpacity={0.7}>
          <Text style={styles.btnTxt}>Play Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: PAL.bg, alignItems: 'center' },

  cardCapture: { position: 'absolute', top: -1000, left: 0 },

  header:    { alignItems: 'center', paddingTop: 72, paddingBottom: 28 },
  kicker:    { color: PAL.rim, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  title:     { color: PAL.lit, fontSize: 34, fontWeight: '200', letterSpacing: 5, marginBottom: 24 },
  avg:       { color: PAL.glow, fontSize: 68, fontWeight: '100', letterSpacing: 4 },
  avgLbl:    { color: PAL.rim, fontSize: 12, letterSpacing: 2, marginTop: 4 },
  totalTime: { color: PAL.rim + 'aa', fontSize: 11, letterSpacing: 1, marginTop: 6 },

  list:        { width: SW, flex: 1 },
  listContent: { paddingHorizontal: 28, paddingBottom: 8 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PAL.dim,
    paddingVertical: 14,
  },
  rowLeft:    {},
  rowMoodRow: { flexDirection: 'row', alignItems: 'center' },
  rowMood:    { color: PAL.lit, fontSize: 16, letterSpacing: 1, marginBottom: 3 },
  pbBadge:    { color: PAL.glow, fontSize: 9, letterSpacing: 1, marginLeft: 8, borderWidth: 1, borderColor: PAL.glow + '88', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3 },
  rowMeta:    { color: PAL.rim, fontSize: 11, letterSpacing: 0.4 },
  rowPrev:    { color: PAL.rim + '88', fontSize: 10, letterSpacing: 0.4, marginTop: 2 },
  rowRight:   { alignItems: 'flex-end' },
  rowScore:   { color: PAL.glow, fontSize: 22, fontWeight: '200', letterSpacing: 2 },
  rowPct:     { color: PAL.rim, fontSize: 11, letterSpacing: 1, marginTop: 2 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, marginTop: 4 },
  totalLbl: { color: PAL.rim, fontSize: 13, letterSpacing: 1 },
  totalVal: { color: PAL.lit, fontSize: 20, letterSpacing: 2 },

  achSection:  { marginTop: 12, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PAL.dim },
  achHeader:   { color: PAL.rim, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  achRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  achIcon:     { color: PAL.glow, fontSize: 14, marginRight: 12 },
  achText:     { flex: 1 },
  achLabel:    { color: PAL.lit, fontSize: 13, letterSpacing: 0.5 },
  achLabelNew: { color: PAL.glow },
  achDesc:     { color: PAL.rim, fontSize: 10, letterSpacing: 0.3, marginTop: 2 },
  achNewBadge: { color: PAL.glow, fontSize: 9, letterSpacing: 1, borderWidth: 1, borderColor: PAL.glow + '66', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },

  actions: { paddingBottom: 44, paddingHorizontal: 32, alignItems: 'center', width: SW },
  cardBtn: {
    width: '100%', paddingVertical: 15,
    backgroundColor: PAL.dim, borderRadius: 3,
    alignItems: 'center', marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.glow + '44',
  },
  cardTxt: { color: PAL.glow, fontSize: 14, letterSpacing: 3 },
  shareBtn: {
    width: '100%', paddingVertical: 13,
    backgroundColor: PAL.dim, borderRadius: 3,
    alignItems: 'center', marginBottom: 10,
  },
  shareTxt: { color: PAL.lit, fontSize: 13, letterSpacing: 3 },
  challengeBtn: {
    width: '100%', paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '88', borderRadius: 3,
    alignItems: 'center', marginBottom: 10,
  },
  challengeTxt: { color: PAL.air, fontSize: 13, letterSpacing: 2 },
  replayBtn: {
    width: '100%', paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PAL.rim + '55', borderRadius: 3,
    alignItems: 'center', marginBottom: 10,
  },
  replayTxt: { color: PAL.rim, fontSize: 13, letterSpacing: 2 },
  btn:    { paddingHorizontal: 48, paddingVertical: 14, borderWidth: 1, borderColor: PAL.rim, borderRadius: 3 },
  btnTxt: { color: PAL.lit, fontSize: 15, letterSpacing: 4 },
});
