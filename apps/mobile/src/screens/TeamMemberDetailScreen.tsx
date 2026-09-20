import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import Badge from '../components/Badge';
import FilterPills from '../components/FilterPills';
import { groupByDay, groupByWeek, type StatsTimeEntry } from '../lib/timeStats';
import { statusTone } from '../lib/statusTone';
import { colors, spacing } from '../theme';
import type { MoreStackParamList } from '../navigation/types';

interface CrewMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
}
interface IncomingReportRow {
  id: string;
  rawText: string | null;
  photoUrls: string[];
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  receivedAt: string;
}

export default function TeamMemberDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MoreStackParamList, 'TeamMemberDetail'>>();
  const { crewId, crewName } = route.params;
  const queryClient = useQueryClient();
  const [view, setView] = useState<'week' | 'day'>('week');

  useLayoutEffect(() => {
    if (crewName) navigation.setOptions({ title: crewName });
  }, [crewName, navigation]);

  const { data: member } = useQuery({
    queryKey: ['users', crewId],
    queryFn: () => api.get<CrewMember>(`/users/${crewId}`),
  });
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['time-entries', crewId],
    queryFn: () => api.get<StatsTimeEntry[]>(`/time-entries?userId=${crewId}`),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['incoming-reports', 'crew', crewId],
    queryFn: () => api.get<IncomingReportRow[]>(`/incoming-reports?submittedByUserId=${crewId}`),
  });

  const deactivate = useMutation({
    mutationFn: () => api.delete(`/users/${crewId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'crew'] });
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  function confirmDeactivate() {
    Alert.alert(t('team.deactivate'), t('team.deactivateConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('team.deactivate'), style: 'destructive', onPress: () => deactivate.mutate() },
    ]);
  }

  const buckets = view === 'day' ? groupByDay(entries, locale) : groupByWeek(entries, locale);
  const totalHours = entries.reduce((sum, e) => {
    if (!e.clockOut) return sum;
    return sum + (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3_600_000;
  }, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {member && !member.active && (
        <View style={styles.deactivatedBanner}>
          <Text style={styles.deactivatedBannerText}>{t('team.deactivated')}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('team.hours')}</Text>
      <FilterPills
        value={view}
        onChange={setView}
        options={[
          { value: 'week', label: t('team.byWeek') },
          { value: 'day', label: t('team.byDay') },
        ]}
      />
      <Text style={styles.totalHours}>{t('team.totalHours', { hours: totalHours.toFixed(1) })}</Text>

      <View style={styles.card}>
        {buckets.map((b, i) => (
          <View key={b.key} style={[styles.row, i === buckets.length - 1 && styles.lastRow]}>
            <Text style={styles.rowLabel}>{b.label}</Text>
            <Text style={styles.rowHours}>{b.hours.toFixed(1)}</Text>
          </View>
        ))}
        {!isLoading && buckets.length === 0 && <Text style={styles.empty}>{t('team.noHours')}</Text>}
      </View>

      <Text style={styles.sectionTitle}>{t('team.reports')}</Text>
      {reports.length === 0 ? (
        <Text style={styles.empty}>{t('team.noReports')}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {reports.map((r) => (
            <View key={r.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportDate}>{new Date(r.receivedAt).toLocaleString(locale)}</Text>
                <Badge label={t(`status.${r.status}`)} tone={statusTone(r.status)} />
              </View>
              {r.rawText && <Text style={styles.reportText}>{r.rawText}</Text>}
              {r.photoUrls.length > 0 && <Text style={styles.reportPhotos}>{t('team.photoCount', { count: r.photoUrls.length })}</Text>}
            </View>
          ))}
        </View>
      )}

      {member?.active && (
        <Pressable onPress={confirmDeactivate} style={styles.deactivateBtn}>
          <Text style={styles.deactivateBtnText}>{t('team.deactivate')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  deactivatedBanner: { backgroundColor: colors.border, borderRadius: 8, padding: spacing.sm, alignSelf: 'flex-start' },
  deactivatedBannerText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  totalHours: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.text },
  rowHours: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: colors.textMuted, padding: spacing.sm },
  reportCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 4 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportDate: { fontSize: 11, color: colors.textMuted },
  reportText: { fontSize: 13, color: colors.text },
  reportPhotos: { fontSize: 11, color: colors.textMuted },
  deactivateBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  deactivateBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
