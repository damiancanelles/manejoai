import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { money } from '../lib/money';
import { colors, spacing } from '../theme';
import type { MonthBucket } from '../lib/invoiceStats';

const BAR_HEIGHT = 110;

/**
 * A simpler cousin of apps/web/src/components/MonthlyIncomeChart.tsx (which
 * draws its own SVG with a hover tooltip - there's no cursor to hover with
 * on a phone). Same data, plain Views: bar height by proportion, the exact
 * amount printed above each bar instead of on hover.
 */
export default function MonthlyBarChart({ data }: { data: MonthBucket[] }) {
  const max = Math.max(...data.map((d) => d.cents), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {data.map((d) => {
        const height = Math.max((d.cents / max) * BAR_HEIGHT, d.cents > 0 ? 4 : 2);
        return (
          <View key={d.key} style={styles.col}>
            {d.cents > 0 && <Text style={styles.value}>{money(d.cents).replace('.00', '')}</Text>}
            <View style={styles.track}>
              <View style={[styles.bar, { height }]} />
            </View>
            <Text style={styles.label}>{d.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, alignItems: 'flex-end', paddingBottom: spacing.xs },
  col: { alignItems: 'center', width: 44, gap: 4 },
  value: { fontSize: 9.5, color: colors.textMuted },
  track: { height: BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 20, borderRadius: 4, backgroundColor: colors.accent },
  label: { fontSize: 11, color: colors.textMuted },
});
