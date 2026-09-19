import { StyleSheet, Text, View } from 'react-native';
import { money } from '../lib/money';
import { colors, spacing } from '../theme';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

/** Read-only line-item table shared by Quote and Invoice detail - editing lands in WO-2. */
export default function LineItems({ items, totalCents, totalLabel }: { items: Item[]; totalCents: number; totalLabel: string }) {
  return (
    <View style={styles.card}>
      {items.map((item, i) => (
        <View key={item.id} style={[styles.row, i === items.length - 1 && styles.lastRow]}>
          <View style={styles.desc}>
            <Text style={styles.descText}>{item.description}</Text>
            <Text style={styles.qtyText}>
              {item.quantity} × {money(item.unitPriceCents)}
            </Text>
          </View>
          <Text style={styles.lineTotal}>{money(item.quantity * item.unitPriceCents)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
        <Text style={styles.totalValue}>{money(totalCents)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  lastRow: { borderBottomWidth: 0 },
  desc: { flex: 1, gap: 2 },
  descText: { fontSize: 14, color: colors.text },
  qtyText: { fontSize: 12, color: colors.textMuted },
  lineTotal: { fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
