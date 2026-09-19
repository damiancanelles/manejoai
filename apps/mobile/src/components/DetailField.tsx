import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

/** A label/value row inside a bordered card - "Issued", "Due", "Job", etc. */
export default function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function DetailCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },
});
