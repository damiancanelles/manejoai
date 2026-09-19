import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

/** A titled group on a detail screen (Properties, Contacts, Jobs, ...), with a plain-text empty state. */
export default function Section({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        {title} {count > 0 ? `(${count})` : ''}
      </Text>
      {count > 0 ? (
        <View style={styles.card}>{children}</View>
      ) : (
        <Text style={styles.empty}>{emptyLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md, gap: spacing.xs },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  empty: { fontSize: 13, color: colors.textMuted },
});
