import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import StatTile from '../components/StatTile';
import YearSwitcher from '../components/YearSwitcher';
import MonthlyBarChart from '../components/MonthlyBarChart';
import RankedList from '../components/RankedList';
import { money } from '../lib/money';
import { sumByStatus, monthlyIncome, incomeByCustomer, yearsWithInvoices, type StatsInvoice } from '../lib/invoiceStats';
import { colors, spacing } from '../theme';

// Mirrors apps/web/src/pages/Dashboard.tsx: same stat tiles, same monthly
// chart, same "income by customer" ranked list - just laid out for a
// phone instead of a sidebar layout. WO-0's plan/status card (business
// name, tier, subscription status) moved out - that's what Settings/
// Billing are for, matching how the web app splits it too.
export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();
  const [year, setYear] = useState<number | null>(null);
  const [yearTouched, setYearTouched] = useState(false);

  const { data: invoices, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['invoices', 'all'],
    queryFn: () => api.get<StatsInvoice[]>('/invoices'),
  });

  const years = invoices ? yearsWithInvoices(invoices) : [];
  if (!yearTouched && years.length > 0 && year === null) {
    // Default to the most recent year with data, once - mirrors the web
    // Dashboard's useEffect, done inline since there's no data yet on
    // first render to key off of.
    setYear(years[0]);
    setYearTouched(true);
  }

  const yearLabel = year != null ? String(year) : t('dashboard.allTime');
  const scoped = invoices ?? [];
  const overdueCount = scoped.filter((i) => i.status === 'OVERDUE' && (year == null || new Date(i.issueDate).getFullYear() === year)).length;
  const sentCount = scoped.filter((i) => i.status === 'SENT' && (year == null || new Date(i.issueDate).getFullYear() === year)).length;
  const overdueTotal = sumByStatus(scoped, 'OVERDUE', year);
  const paidTotal = sumByStatus(scoped, 'PAID', year);
  const monthly = monthlyIncome(scoped, year, locale);
  const byCustomer = incomeByCustomer(scoped, year);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={undefined}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{t('dashboard.title')}</Text>
          <Text style={styles.subGreeting}>{user?.name}</Text>
        </View>
        <Pressable onPress={() => logout()}>
          <Text style={styles.logoutText}>{t('common.logOut')}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
      ) : (
        <>
          <YearSwitcher years={years} selected={year} onChange={setYear} />

          <View style={styles.tileRow}>
            <StatTile label={t('dashboard.overdue', { year: yearLabel })} value={String(overdueCount)} sub={t('dashboard.overdueSub', { amount: money(overdueTotal) })} tone="danger" />
            <StatTile label={t('dashboard.sentNotDue', { year: yearLabel })} value={String(sentCount)} tone="warning" />
            <StatTile label={t('dashboard.paid', { year: yearLabel })} value={money(paidTotal)} tone="success" />
          </View>

          <Text style={styles.sectionTitle}>{t('dashboard.byMonth')}</Text>
          <View style={styles.chartCard}>
            <MonthlyBarChart data={monthly} />
          </View>

          <Text style={styles.sectionTitle}>{t('dashboard.byCustomer')}</Text>
          <RankedList rows={byCustomer} emptyLabel={t('dashboard.noInvoices')} />

          <Pressable onPress={() => refetch()} style={styles.refreshButton} disabled={isRefetching}>
            <Text style={styles.refreshText}>{isRefetching ? t('common.loading') : 'Refresh'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: 13, color: colors.textMuted },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  chartCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  refreshButton: { alignSelf: 'center', marginTop: spacing.sm },
  refreshText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
});
