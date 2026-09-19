import { StyleSheet, Text, View } from 'react-native';
import { tones } from '../theme';
import type { Tone } from '../lib/statusTone';

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11.5, fontWeight: '600' },
});
