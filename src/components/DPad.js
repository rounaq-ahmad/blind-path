import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function DPad({ onMove, color }) {
  const btn = (dir, label) => (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => onMove(dir)}
      activeOpacity={0.6}
    >
      <Text style={[styles.arrow, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>{btn('up', '▲')}</View>
      <View style={styles.row}>
        {btn('left', '◀')}
        <View style={styles.center} />
        {btn('right', '▶')}
      </View>
      <View style={styles.row}>{btn('down', '▼')}</View>
    </View>
  );
}

const BTN = 48;
const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    width: BTN, height: BTN,
    alignItems: 'center', justifyContent: 'center',
  },
  arrow: { fontSize: 22 },
  center: { width: BTN, height: BTN },
});
