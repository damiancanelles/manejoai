import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth, type Business } from '../auth/AuthContext';
import { useT } from '../i18n';
import { colors, spacing } from '../theme';

// The WO-0 "does the whole pipeline actually work" screen: a real
// authenticated GET against the live API, rendered on a real device. Real
// stat tiles / income chart / top customers (matching the web Dashboard)
// land in WO-1 - this just proves login -> token -> API -> render end to end.
export default function DashboardScreen() {
  const { user, business, logout } = useAuth();
  const t = useT();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['businesses', 'me'],
    queryFn: () => api.get<Business>('/businesses/me'),
    initialData: business ?? undefined,
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={undefined}
      >
        <Text style={styles.greeting}>{t('dashboard.title')}</Text>
        <Text style={styles.subGreeting}>{user?.name}</Text>

        <View style={styles.card}>
          {isLoading && !data ? (
            <ActivityIndicator color={colors.accent} />
          ) : isError ? (
            <Text style={styles.errorText}>{(error as Error).message}</Text>
          ) : data ? (
            <>
              <Text style={styles.businessName}>{data.name}</Text>
              <View style={styles.chipRow}>
                <Chip label={data.subscriptionTier === 'pro' ? 'Pro' : 'Basic'} />
                <Chip label={data.subscriptionStatus} tone={data.subscriptionStatus === 'active' ? 'success' : 'warning'} />
              </View>
              <Text style={styles.meta}>{data.emailSlug}@manejoai.cloud</Text>
            </>
          ) : null}

          <Pressable onPress={() => refetch()} style={styles.refreshButton} disabled={isRefetching}>
            <Text style={styles.refreshText}>{isRefetching ? t('common.loading') : 'Refresh'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => logout()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('common.logOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'success' | 'warning' }) {
  const bg = tone === 'success' ? '#dcfce7' : tone === 'warning' ? '#fef3c7' : '#e0e7ff';
  const fg = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.accentDark;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  greeting: { fontSize: 26, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  businessName: { fontSize: 18, fontWeight: '600', color: colors.text },
  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: 13, color: colors.textMuted },
  refreshButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
  refreshText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 14 },
  logoutButton: { alignSelf: 'flex-start' },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
