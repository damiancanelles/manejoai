import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

/**
 * Stands in for every module that hasn't been built yet (WO-1/WO-2 per the
 * mobile build plan) - keeps the full navigation shell in place from WO-0
 * on, so adding a real screen later is a drop-in replacement, not a nav
 * change.
 */
export default function PlaceholderScreen({ title, note }: { title: string; note?: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{note ?? 'Coming soon.'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  note: { fontSize: 14, color: colors.textMuted },
});
