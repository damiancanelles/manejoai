import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import Badge from '../components/Badge';
import FilterPills from '../components/FilterPills';
import TextField from '../components/TextField';
import { groupByDay, groupByWeek, type StatsTimeEntry } from '../lib/timeStats';
import { statusTone } from '../lib/statusTone';
import { colors, spacing, tones } from '../theme';
import type { MoreStackParamList } from '../navigation/types';

interface CrewMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
}
interface TimeEntryRow extends StatsTimeEntry {
  id: string;
}
interface IncomingReportRow {
  id: string;
  rawText: string | null;
  photoUrls: string[];
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  receivedAt: string;
}
interface DateTimeDraft {
  date: string;
  time: string;
}

function emptyDraft(): DateTimeDraft {
  return { date: '', time: '' };
}
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function draftFromIso(iso: string): DateTimeDraft {
  return { date: toDateInput(iso), time: toTimeInput(iso) };
}
/** null when the date/time is empty (a blank clock-out means "still working") or unparseable. */
function draftToDate(draft: DateTimeDraft): Date | null {
  if (!draft.date.trim() || !draft.time.trim()) return null;
  const d = new Date(`${draft.date.trim()}T${draft.time.trim()}:00`);
  return isNaN(d.getTime()) ? null : d;
}

export default function TeamMemberDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MoreStackParamList, 'TeamMemberDetail'>>();
  const { crewId, crewName } = route.params;
  const queryClient = useQueryClient();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addClockIn, setAddClockIn] = useState<DateTimeDraft>(emptyDraft());
  const [addClockOut, setAddClockOut] = useState<DateTimeDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState<DateTimeDraft>(emptyDraft());
  const [editClockOut, setEditClockOut] = useState<DateTimeDraft>(emptyDraft());

  useLayoutEffect(() => {
    if (crewName) navigation.setOptions({ title: crewName });
  }, [crewName, navigation]);

  const { data: member } = useQuery({
    queryKey: ['users', crewId],
    queryFn: () => api.get<CrewMember>(`/users/${crewId}`),
  });
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['time-entries', crewId],
    queryFn: () => api.get<TimeEntryRow[]>(`/time-entries?userId=${crewId}`),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['incoming-reports', 'crew', crewId],
    queryFn: () => api.get<IncomingReportRow[]>(`/incoming-reports?submittedByUserId=${crewId}`),
  });

  function invalidateEntries() {
    queryClient.invalidateQueries({ queryKey: ['time-entries', crewId] });
  }

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

  const clockInNow = useMutation({
    mutationFn: () => api.post(`/time-entries/${crewId}/clock-in`),
    onSuccess: invalidateEntries,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const clockOutNow = useMutation({
    mutationFn: () => api.post(`/time-entries/${crewId}/clock-out`),
    onSuccess: invalidateEntries,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const createEntry = useMutation({
    mutationFn: () => {
      const clockIn = draftToDate(addClockIn);
      if (!clockIn) throw new Error(t('team.errClockOutBeforeIn'));
      const clockOut = draftToDate(addClockOut);
      if (clockOut && clockOut <= clockIn) throw new Error(t('team.errClockOutBeforeIn'));
      return api.post('/time-entries', { userId: crewId, clockIn: clockIn.toISOString(), clockOut: clockOut?.toISOString() });
    },
    onSuccess: () => {
      setShowAddEntry(false);
      setAddClockIn(emptyDraft());
      setAddClockOut(emptyDraft());
      invalidateEntries();
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const updateEntry = useMutation({
    mutationFn: (entryId: string) => {
      const clockIn = draftToDate(editClockIn);
      if (!clockIn) throw new Error(t('team.errClockOutBeforeIn'));
      const clockOut = draftToDate(editClockOut);
      if (clockOut && clockOut <= clockIn) throw new Error(t('team.errClockOutBeforeIn'));
      return api.patch(`/time-entries/${entryId}`, { clockIn: clockIn.toISOString(), clockOut: clockOut?.toISOString() });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidateEntries();
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) => api.delete(`/time-entries/${entryId}`),
    onSuccess: invalidateEntries,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  function confirmDeleteEntry(entryId: string) {
    Alert.alert(t('common.delete'), t('team.deleteEntryConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteEntry.mutate(entryId) },
    ]);
  }

  function startEdit(entry: TimeEntryRow) {
    setEditClockIn(draftFromIso(entry.clockIn));
    setEditClockOut(entry.clockOut ? draftFromIso(entry.clockOut) : emptyDraft());
    setEditingId(entry.id);
  }

  const openEntry = entries.find((e) => !e.clockOut) ?? null;
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

      <View style={styles.entriesHeader}>
        <Text style={styles.sectionTitle}>{t('team.timeEntries')}</Text>
        <View style={styles.entriesActions}>
          {member?.active &&
            (openEntry ? (
              <Pressable onPress={() => clockOutNow.mutate()} disabled={clockOutNow.isPending} style={styles.clockOutBtn}>
                <Text style={styles.clockBtnText}>{t('clock.clockOut')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => clockInNow.mutate()} disabled={clockInNow.isPending} style={styles.clockInBtn}>
                <Text style={styles.clockBtnText}>{t('clock.clockIn')}</Text>
              </Pressable>
            ))}
          <Pressable onPress={() => setShowAddEntry((v) => !v)} style={styles.addEntryBtn}>
            <Text style={styles.addEntryBtnText}>{showAddEntry ? t('common.cancel') : t('team.addEntry')}</Text>
          </Pressable>
        </View>
      </View>

      {showAddEntry && (
        <View style={styles.entryForm}>
          <Text style={styles.smallLabel}>{t('team.entryClockIn')}</Text>
          <View style={styles.row2}>
            <TextField label="" value={addClockIn.date} onChangeText={(v) => setAddClockIn((d) => ({ ...d, date: v }))} placeholder={t('team.datePlaceholder')} />
            <TextField label="" value={addClockIn.time} onChangeText={(v) => setAddClockIn((d) => ({ ...d, time: v }))} placeholder={t('team.timePlaceholder')} />
          </View>
          <Text style={styles.smallLabel}>{t('team.entryClockOut')}</Text>
          <View style={styles.row2}>
            <TextField label="" value={addClockOut.date} onChangeText={(v) => setAddClockOut((d) => ({ ...d, date: v }))} placeholder={t('team.datePlaceholder')} />
            <TextField label="" value={addClockOut.time} onChangeText={(v) => setAddClockOut((d) => ({ ...d, time: v }))} placeholder={t('team.timePlaceholder')} />
          </View>
          <Pressable onPress={() => createEntry.mutate()} disabled={createEntry.isPending} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{createEntry.isPending ? t('common.saving') : t('common.add')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        {entries.map((entry, i) =>
          editingId === entry.id ? (
            <View key={entry.id} style={[styles.editRow, i === entries.length - 1 && styles.lastRow]}>
              <Text style={styles.smallLabel}>{t('team.entryClockIn')}</Text>
              <View style={styles.row2}>
                <TextField label="" value={editClockIn.date} onChangeText={(v) => setEditClockIn((d) => ({ ...d, date: v }))} placeholder={t('team.datePlaceholder')} />
                <TextField label="" value={editClockIn.time} onChangeText={(v) => setEditClockIn((d) => ({ ...d, time: v }))} placeholder={t('team.timePlaceholder')} />
              </View>
              <Text style={styles.smallLabel}>{t('team.entryClockOut')}</Text>
              <View style={styles.row2}>
                <TextField label="" value={editClockOut.date} onChangeText={(v) => setEditClockOut((d) => ({ ...d, date: v }))} placeholder={t('team.datePlaceholder')} />
                <TextField label="" value={editClockOut.time} onChangeText={(v) => setEditClockOut((d) => ({ ...d, time: v }))} placeholder={t('team.timePlaceholder')} />
              </View>
              <View style={styles.formActions}>
                <Pressable onPress={() => updateEntry.mutate(entry.id)} disabled={updateEntry.isPending} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>{updateEntry.isPending ? t('common.saving') : t('common.save')}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View key={entry.id} style={[styles.row, i === entries.length - 1 && styles.lastRow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{new Date(entry.clockIn).toLocaleString(locale)}</Text>
                <Text style={styles.rowSubLabel}>{entry.clockOut ? new Date(entry.clockOut).toLocaleString(locale) : t('clock.inProgress')}</Text>
              </View>
              <Pressable onPress={() => startEdit(entry)} hitSlop={8}>
                <Text style={styles.editText}>{t('common.edit')}</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteEntry(entry.id)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                <Text style={styles.deleteText}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          ),
        )}
        {entries.length === 0 && <Text style={styles.empty}>{t('team.noEntries')}</Text>}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.text },
  rowSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  rowHours: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: colors.textMuted, padding: spacing.sm },
  entriesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  entriesActions: { flexDirection: 'row', gap: spacing.xs },
  clockInBtn: { backgroundColor: tones.success.fg, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  clockOutBtn: { backgroundColor: colors.danger, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  clockBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  addEntryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  addEntryBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  entryForm: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: spacing.xs },
  editRow: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background, gap: spacing.xs },
  smallLabel: { fontSize: 11, color: colors.textMuted },
  row2: { flexDirection: 'row', gap: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: 8, alignSelf: 'flex-start' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cancelText: { fontSize: 13, color: colors.textMuted },
  editText: { fontSize: 12, color: colors.textMuted },
  deleteText: { fontSize: 12, color: colors.danger },
  reportCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 4 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportDate: { fontSize: 11, color: colors.textMuted },
  reportText: { fontSize: 13, color: colors.text },
  reportPhotos: { fontSize: 11, color: colors.textMuted },
  deactivateBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  deactivateBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
