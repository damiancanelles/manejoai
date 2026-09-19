import { StyleSheet, Text, View } from 'react-native';
import { money } from '../lib/money';
import { colors, spacing } from '../theme';
import type { RankedRow } from '../lib/invoiceStats';

/** Mirrors apps/web/src/components/RankedTable.tsx - a ranked list with an inline magnitude bar. */
export default function RankedList({ rows, emptyLabel }: { rows: RankedRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }
  const max = Math.max(...rows.map((r) => r.cents), 1);

  return (
    <View style={styles.card}>
      {rows.map((r, i) => (
        <View key={r.name} style={[styles.row, i === rows.length - 1 && styles.lastRow]}>
          <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max((r.cents / max) * 100, r.cents > 0 ? 3 : 0)}%` }]} />
          </View>
          <Text style={styles.amount}>{money(r.cents)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  name: { fontSize: 13, color: colors.text, flexBasis: '32%' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.background },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  amount: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: colors.textMuted },
});
