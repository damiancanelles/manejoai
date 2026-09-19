import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { money } from '../lib/money';
import { colors, spacing } from '../theme';

export interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

export function emptyItemRow(): ItemRow {
  return { description: '', quantity: '1', unitPrice: '' };
}

export function itemsTotalCents(items: ItemRow[]): number {
  return items.reduce((sum, row) => sum + Math.round((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) * 100), 0);
}

/**
 * Stands in for the New Quote/New Invoice web forms' item table - a table
 * doesn't fit a phone width, so each item is its own card (description,
 * qty, unit price stacked) with a running line total and a remove button.
 */
export default function LineItemEditor({ items, onChange }: { items: ItemRow[]; onChange: (items: ItemRow[]) => void }) {
  const t = useT();

  function updateRow(index: number, field: keyof ItemRow, value: string) {
    onChange(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }
  function removeRow(index: number) {
    if (items.length > 1) onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('lineItems.items')}</Text>
        <Pressable onPress={() => onChange([...items, emptyItemRow()])}>
          <Text style={styles.addText}>{t('lineItems.addItem')}</Text>
        </Pressable>
      </View>

      {items.map((row, i) => {
        const lineCents = Math.round((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) * 100);
        return (
          <View key={i} style={styles.card}>
            <TextInput
              value={row.description}
              onChangeText={(v) => updateRow(i, 'description', v)}
              placeholder={t('lineItems.itemPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.row}>
              <View style={styles.qtyField}>
                <Text style={styles.smallLabel}>{t('lineItems.colQty')}</Text>
                <TextInput
                  value={row.quantity}
                  onChangeText={(v) => updateRow(i, 'quantity', v)}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.smallLabel}>{t('lineItems.colUnitPrice')}</Text>
                <TextInput
                  value={row.unitPrice}
                  onChangeText={(v) => updateRow(i, 'unitPrice', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.footer}>
              <Text style={styles.lineTotal}>{money(lineCents)}</Text>
              <Pressable onPress={() => removeRow(i)} disabled={items.length === 1}>
                <Text style={[styles.removeText, items.length === 1 && styles.removeDisabled]}>{t('lineItems.removeItem')}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('lineItems.total')}</Text>
        <Text style={styles.totalValue}>{money(itemsTotalCents(items))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 13, color: colors.textMuted },
  addText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: spacing.sm },
  qtyField: { width: 70, gap: 2 },
  priceField: { flex: 1, gap: 2 },
  smallLabel: { fontSize: 11, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  lineTotal: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  removeText: { fontSize: 12, color: colors.danger },
  removeDisabled: { opacity: 0.3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
