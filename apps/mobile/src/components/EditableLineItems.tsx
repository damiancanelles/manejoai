import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { money } from '../lib/money';
import { colors, spacing } from '../theme';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface Draft {
  description: string;
  quantity: string;
  unitPrice: string;
}

function draftFrom(item?: Item): Draft {
  return {
    description: item?.description ?? '',
    quantity: item ? String(item.quantity) : '1',
    unitPrice: item ? (item.unitPriceCents / 100).toFixed(2) : '',
  };
}

function parseDraft(draft: Draft) {
  return {
    description: draft.description.trim(),
    quantity: Number(draft.quantity),
    unitPriceCents: Math.round((Number(draft.unitPrice) || 0) * 100),
  };
}

/**
 * Editable counterpart to LineItems - used on Quote/Invoice detail while the
 * document is still open for changes (locked === approved/paid/canceled).
 * Add/edit happen as an inline card swapped in for the row, mirroring the
 * web app's inline <form> rows since a table doesn't fit a phone.
 */
export default function EditableLineItems({
  items,
  totalCents,
  totalLabel,
  locked,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: Item[];
  totalCents: number;
  totalLabel: string;
  locked: boolean;
  onAdd: (row: { description: string; quantity: number; unitPriceCents: number }) => Promise<void>;
  onUpdate: (itemId: string, row: { description: string; quantity: number; unitPriceCents: number }) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(draftFrom());
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(draftFrom());
  const [busy, setBusy] = useState(false);

  function validate(draft: Draft): string | null {
    const parsed = parseDraft(draft);
    if (!parsed.description) return t('lineItems.errDescription');
    if (!parsed.quantity || parsed.quantity < 1) return t('lineItems.errQuantity');
    return null;
  }

  async function submitAdd() {
    const err = validate(addDraft);
    if (err) return Alert.alert(t('assistant.error'), err);
    setBusy(true);
    try {
      await onAdd(parseDraft(addDraft));
      setAddDraft(draftFrom());
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert(t('assistant.error'), e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(itemId: string) {
    const err = validate(editDraft);
    if (err) return Alert.alert(t('assistant.error'), err);
    setBusy(true);
    try {
      await onUpdate(itemId, parseDraft(editDraft));
      setEditingId(null);
    } catch (e: any) {
      Alert.alert(t('assistant.error'), e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(itemId: string) {
    setBusy(true);
    try {
      await onRemove(itemId);
    } catch (e: any) {
      Alert.alert(t('assistant.error'), e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {!locked && (
        <Pressable onPress={() => setShowAdd((v) => !v)} style={styles.addToggle}>
          <Text style={styles.addToggleText}>{showAdd ? t('common.cancel') : t('quoteDetail.addItem')}</Text>
        </Pressable>
      )}

      <View style={styles.card}>
        {items.map((item, i) =>
          editingId === item.id ? (
            <View key={item.id} style={[styles.editRow, i === items.length - 1 && styles.lastRow]}>
              <ItemForm draft={editDraft} onChange={setEditDraft} />
              <View style={styles.formActions}>
                <Pressable onPress={() => submitEdit(item.id)} disabled={busy} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} disabled={busy}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View key={item.id} style={[styles.row, i === items.length - 1 && !showAdd && styles.lastRow]}>
              <View style={styles.desc}>
                <Text style={styles.descText}>{item.description}</Text>
                <Text style={styles.qtyText}>
                  {item.quantity} × {money(item.unitPriceCents)}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{money(item.quantity * item.unitPriceCents)}</Text>
              {!locked && (
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => {
                      setEditDraft(draftFrom(item));
                      setEditingId(item.id);
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.editText}>{t('common.edit')}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemove(item.id)} disabled={busy || items.length === 1}>
                    <Text style={[styles.removeText, items.length === 1 && styles.removeDisabled]}>{t('common.remove')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ),
        )}

        {showAdd && (
          <View style={styles.editRow}>
            <ItemForm draft={addDraft} onChange={setAddDraft} placeholder={t('lineItems.descriptionPlaceholder')} />
            <View style={styles.formActions}>
              <Pressable onPress={submitAdd} disabled={busy} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{t('common.add')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>{money(totalCents)}</Text>
        </View>
      </View>
    </View>
  );
}

function ItemForm({ draft, onChange, placeholder }: { draft: Draft; onChange: (d: Draft) => void; placeholder?: string }) {
  const t = useT();
  return (
    <View style={{ gap: spacing.xs }}>
      <TextInput
        value={draft.description}
        onChangeText={(v) => onChange({ ...draft, description: v })}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <View style={styles.row2}>
        <View style={styles.qtyField}>
          <Text style={styles.smallLabel}>{t('lineItems.colQty')}</Text>
          <TextInput value={draft.quantity} onChangeText={(v) => onChange({ ...draft, quantity: v })} keyboardType="numeric" style={styles.input} />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.smallLabel}>{t('lineItems.colUnitPrice')}</Text>
          <TextInput
            value={draft.unitPrice}
            onChangeText={(v) => onChange({ ...draft, unitPrice: v })}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addToggle: { alignSelf: 'flex-end' },
  addToggleText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
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
  rowActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  editText: { fontSize: 12, color: colors.textMuted },
  removeText: { fontSize: 12, color: colors.danger },
  removeDisabled: { opacity: 0.3 },
  editRow: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background, gap: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  row2: { flexDirection: 'row', gap: spacing.sm },
  qtyField: { width: 70, gap: 2 },
  priceField: { flex: 1, gap: 2 },
  smallLabel: { fontSize: 11, color: colors.textMuted },
  formActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cancelText: { fontSize: 13, color: colors.textMuted },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.background },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
