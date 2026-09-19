import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import Badge from '../components/Badge';
import FilterPills from '../components/FilterPills';
import SearchInput from '../components/SearchInput';
import SelectField from '../components/SelectField';
import TextField from '../components/TextField';
import { openAssistantLink } from '../lib/assistantLinks';
import { statusTone } from '../lib/statusTone';
import { colors, spacing } from '../theme';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
}
interface IncomingReport {
  id: string;
  senderName: string | null;
  rawText: string | null;
  photoUrls: string[];
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  suggestedPropertyText: string | null;
  matchedPropertyId: string | null;
  matchedProperty: { id: string; name: string; account: { id: string; name: string } } | null;
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  jobId: string | null;
  receivedAt: string;
}

type StatusFilter = 'PENDING' | 'CONVERTED' | 'DISMISSED' | 'ALL';
const STATUSES: StatusFilter[] = ['PENDING', 'CONVERTED', 'DISMISSED', 'ALL'];

export default function JobReportsScreen() {
  const { t } = useI18n();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incoming-reports', status, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<IncomingReport[]>(`/incoming-reports?${params.toString()}`);
    },
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'picker'],
    queryFn: () => api.get<Account[]>('/accounts'),
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.subtitle}>{t('jobReports.subtitle')}</Text>
      <SearchInput value={search} onChangeText={setSearch} placeholder={t('jobReports.search')} />
      <FilterPills
        value={status}
        onChange={setStatus}
        options={STATUSES.map((s) => ({ value: s, label: s === 'ALL' ? t('status.ALL') : t(`status.${s}`) }))}
      />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />}
        {!isLoading && reports.length === 0 && (
          <Text style={styles.empty}>{status === 'PENDING' ? t('jobReports.allCaughtUp') : t('jobReports.noneMatch')}</Text>
        )}
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} accounts={accounts} />
        ))}
      </ScrollView>
    </View>
  );
}

function ReportCard({ report, accounts }: { report: IncomingReport; accounts: Account[] }) {
  const { t, locale } = useI18n();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(report.matchedProperty?.account.id ?? '');
  const [propertyId, setPropertyId] = useState(report.matchedPropertyId ?? '');
  const [title, setTitle] = useState(report.suggestedTitle ?? '');
  const [description, setDescription] = useState(report.suggestedDescription ?? '');

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isPending = report.status === 'PENDING';

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['incoming-reports'] });
  }

  const convert = useMutation({
    mutationFn: () => {
      if (!accountId || !title.trim()) throw new Error(t('jobReports.errRequired'));
      return api.post(`/incoming-reports/${report.id}/convert`, {
        accountId,
        propertyId: propertyId || undefined,
        title: title.trim(),
        description: description || undefined,
      });
    },
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const dismiss = useMutation({
    mutationFn: () => api.post(`/incoming-reports/${report.id}/dismiss`),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const saving = convert.isPending || dismiss.isPending;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.sender}>{report.senderName ?? t('jobReports.unknownSender')} · Telegram</Text>
        <View style={styles.cardHeaderRight}>
          {!isPending && <Badge label={t(`status.${report.status}`)} tone={statusTone(report.status)} />}
          <Text style={styles.receivedAt}>{new Date(report.receivedAt).toLocaleString(locale)}</Text>
        </View>
      </View>

      {report.rawText && <Text style={styles.rawText}>{report.rawText}</Text>}

      {report.photoUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {report.photoUrls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} />
          ))}
        </ScrollView>
      )}

      {report.suggestedPropertyText && (
        <Text style={styles.hint}>
          {t('jobReports.propertyMentioned', { text: report.suggestedPropertyText })}
          {!report.matchedPropertyId && t('jobReports.noMatch')}
        </Text>
      )}

      {!isPending ? (
        <View style={styles.resolvedRow}>
          <Text style={styles.resolvedText}>
            {report.status === 'CONVERTED' && report.jobId
              ? `${t('jobReports.convertedTo', { title: title || t('jobReports.untitled') })}${selectedAccount ? ` (${selectedAccount.name})` : ''}`
              : t('jobReports.dismissedLabel')}
          </Text>
          {report.status === 'CONVERTED' && report.jobId && (
            <Pressable onPress={() => openAssistantLink(navigation, `/jobs/${report.jobId}`)}>
              <Text style={styles.link}>{t('jobReports.viewJob')}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <SelectField
            label={t('jobReports.customer')}
            value={accountId}
            onChange={(v) => {
              setAccountId(v);
              setPropertyId('');
            }}
            placeholder={t('jobReports.selectCustomer')}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          <SelectField
            label={t('jobReports.property')}
            value={propertyId}
            onChange={setPropertyId}
            placeholder={t('common.none')}
            options={(selectedAccount?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
          <TextField label={t('jobReports.titleField')} value={title} onChangeText={setTitle} />
          <TextField label={t('jobReports.description')} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

          <View style={styles.actionsRow}>
            <Pressable onPress={() => convert.mutate()} disabled={saving} style={[styles.createBtn, saving && styles.btnDisabled]}>
              <Text style={styles.createBtnText}>{t('jobReports.createJob')}</Text>
            </Pressable>
            <Pressable onPress={() => dismiss.mutate()} disabled={saving} style={[styles.dismissBtn, saving && styles.btnDisabled]}>
              <Text style={styles.dismissBtnText}>{t('jobReports.dismiss')}</Text>
            </Pressable>
            {accountId && (
              <Pressable onPress={() => openAssistantLink(navigation, `/accounts/${accountId}`)} style={styles.viewCustomerBtn}>
                <Text style={styles.link}>{t('jobReports.viewCustomer')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  subtitle: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { flex: 1 },
  listContent: { padding: spacing.md, gap: spacing.md, paddingTop: spacing.sm },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  sender: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  receivedAt: { fontSize: 11, color: colors.textMuted },
  rawText: { fontSize: 13, color: colors.text, backgroundColor: colors.background, borderRadius: 8, padding: spacing.sm },
  photoRow: { flexGrow: 0 },
  photo: { width: 96, height: 96, borderRadius: 8, marginRight: spacing.sm, backgroundColor: colors.border },
  hint: { fontSize: 11, color: colors.textMuted },
  resolvedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resolvedText: { fontSize: 13, color: colors.textMuted, flex: 1 },
  link: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  createBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: spacing.md },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dismissBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: spacing.md },
  dismissBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  viewCustomerBtn: { marginLeft: 'auto' },
  btnDisabled: { opacity: 0.5 },
});
