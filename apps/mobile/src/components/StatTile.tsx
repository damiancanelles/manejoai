import { StyleSheet, Text, View } from 'react-native';
import { tones } from '../theme';
import type { Tone } from '../lib/statusTone';

/** Mirrors apps/web/src/components/StatTile.tsx - one glanceable number with a colored ground. */
export default function StatTile({ label, value, sub, tone = 'accent' }: { label: string; value: string; sub?: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.tile, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
      <Text style={[styles.value, { color: t.fg }]}>{value}</Text>
      {sub ? <Text style={[styles.sub, { color: t.fg }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14, gap: 2 },
  label: { fontSize: 12.5, fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 12 },
});
