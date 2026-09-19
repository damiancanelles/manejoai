import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useT } from '../i18n';
import { colors, spacing } from '../theme';

/** Mirrors apps/web/src/components/YearSwitcher.tsx - same pill style as the status/type filters. */
export default function YearSwitcher({
  years,
  selected,
  onChange,
}: {
  years: number[]; // newest first
  selected: number | null; // null = all time
  onChange: (year: number | null) => void;
}) {
  const t = useT();
  if (years.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {years.map((y) => (
        <Pressable key={y} onPress={() => onChange(y)} style={[styles.pill, selected === y ? styles.pillActive : styles.pillInactive]}>
          <Text style={[styles.label, selected === y && styles.labelActive]}>{y}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => onChange(null)} style={[styles.pill, selected === null ? styles.pillActive : styles.pillInactive]}>
        <Text style={[styles.label, selected === null && styles.labelActive]}>{t('yearSwitcher.allTime')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  pill: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  pillActive: { backgroundColor: colors.accent },
  pillInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  labelActive: { color: '#fff' },
});
