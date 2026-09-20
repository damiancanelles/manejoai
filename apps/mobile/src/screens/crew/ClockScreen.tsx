import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { colors, spacing, tones } from '../../theme';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
}
interface MeResponse {
  open: TimeEntry | null;
  recent: TimeEntry[];
}

function hoursOf(e: TimeEntry): string | null {
  if (!e.clockOut) return null;
  return ((new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3_600_000).toFixed(1);
}

export default function ClockScreen() {
  const { t, locale } = useI18n();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['time-entries', 'me'],
    queryFn: () => api.get<MeResponse>('/time-entries/me'),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['time-entries', 'me'] });
  }

  const clockIn = useMutation({
    mutationFn: () => api.post('/time-entries/clock-in'),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const clockOut = useMutation({
    mutationFn: () => api.post('/time-entries/clock-out'),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const open = data?.open;
  const busy = clockIn.isPending || clockOut.isPending;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('clock.hi', { name: user?.name ?? '' })}</Text>
        <Pressable onPress={() => logout()}>
          <Text style={styles.logout}>{t('common.logOut')}</Text>
        </Pressable>
      </View>

      <View style={styles.statusCard}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : open ? (
          <>
            <Text style={styles.statusLabel}>
              {t('clock.clockedInSince', {
                time: new Date(open.clockIn).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
              })}
            </Text>
            <Pressable onPress={() => clockOut.mutate()} disabled={busy} style={[styles.bigBtn, styles.outBtn, busy && styles.btnDisabled]}>
              <Text style={styles.bigBtnText}>{clockOut.isPending ? t('common.saving') : t('clock.clockOut')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.statusLabel}>{t('clock.notClockedIn')}</Text>
            <Pressable onPress={() => clockIn.mutate()} disabled={busy} style={[styles.bigBtn, styles.inBtn, busy && styles.btnDisabled]}>
              <Text style={styles.bigBtnText}>{clockIn.isPending ? t('common.saving') : t('clock.clockIn')}</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('clock.recent')}</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {(data?.recent ?? []).map((e) => (
          <View key={e.id} style={styles.row}>
            <Text style={styles.rowDate}>{new Date(e.clockIn).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.rowTime}>
              {new Date(e.clockIn).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {e.clockOut ? new Date(e.clockOut).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : t('clock.inProgress')}
            </Text>
            <Text style={styles.rowHours}>{hoursOf(e) ? `${hoursOf(e)}h` : ''}</Text>
          </View>
        ))}
        {!isLoading && (data?.recent ?? []).length === 0 && <Text style={styles.empty}>{t('clock.noEntries')}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text },
  logout: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
  statusCard: { margin: spacing.md, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  statusLabel: { fontSize: 15, color: colors.text, textAlign: 'center' },
  bigBtn: { borderRadius: 999, paddingVertical: 18, paddingHorizontal: spacing.xl, alignItems: 'center', minWidth: 200 },
  inBtn: { backgroundColor: tones.success.fg },
  outBtn: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.6 },
  bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  list: { flex: 1 },
  listContent: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  rowDate: { fontSize: 12, color: colors.textMuted, width: 56 },
  rowTime: { fontSize: 13, color: colors.text, flex: 1 },
  rowHours: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
