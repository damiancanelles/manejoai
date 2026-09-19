import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

interface FilterPillsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Horizontal status/type filter, same pill pattern as the web app's filter buttons. */
export default function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Without an explicit height/flexGrow, a horizontal ScrollView with no
  // sibling that claims the remaining flex space stretches to fill its
  // parent's cross axis on Android, and its row's default alignItems
  // ('stretch') then stretches every pill to that full height - hence
  // flexGrow: 0 here plus alignItems: 'center' on the row below.
  scroll: { flexGrow: 0, marginBottom: spacing.sm },
  row: { gap: spacing.xs, paddingHorizontal: spacing.md, alignItems: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  pillActive: { backgroundColor: colors.accent },
  pillInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  labelActive: { color: '#fff' },
});
