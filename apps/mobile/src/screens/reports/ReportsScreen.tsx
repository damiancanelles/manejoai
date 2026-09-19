import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { money } from '../../lib/money';
import { shareCsv } from '../../lib/csv';
import ListRow from '../../components/ListRow';
import FilterPills from '../../components/FilterPills';
import Badge from '../../components/Badge';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';

interface JobRow {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  account: { name: string };
  property?: { name: string } | null;
}
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  account: { name: string };
}

type Tab = 'jobs' | 'invoices';
type JobStatus = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type InvoiceStatus = 'ALL' | 'DRAFT' | 'SENT' | 'OVERDUE' | 'PAID' | 'CANCELED';

/**
 * Read-only for WO-1 (no date-range pickers or the web app's PDF/"send to
 * customers" actions yet - those are a write action + a new native
 * dependency respectively, both better suited to WO-2). CSV export uses
 * the OS share sheet instead of a file download - see lib/csv.ts.
 */
export default function ReportsScreen() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('jobs');

  return (
    <View style={styles.screen}>
      <View style={styles.tabRow}>
        <TabButton label={t('reports.tabJobs')} active={tab === 'jobs'} onPress={() => setTab('jobs')} />
        <TabButton label={t('reports.tabInvoices')} active={tab === 'invoices'} onPress={() => setTab('invoices')} />
      </View>
      {tab === 'jobs' ? <JobsReport /> : <InvoicesReport />}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const JOB_STATUSES: JobStatus[] = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];

function JobsReport() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<JobStatus>('ALL');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['reports', 'jobs', status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      return api.get<JobRow[]>(`/jobs?${params.toString()}`);
    },
  });

  async function exportCsv() {
    try {
      await shareCsv(
        `jobs-report.csv`,
        [t('reports.csvTitle'), t('reports.csvDescription'), t('reports.csvStatus'), t('reports.csvCustomer'), t('reports.csvProperty'), t('reports.csvLoggedDate')],
        jobs.map((j) => [j.title, j.description ?? '', t(`status.${j.status}`), j.account.name, j.property?.name ?? '', new Date(j.createdAt).toLocaleDateString(locale)]),
      );
    } catch {
      Alert.alert(t('assistant.error'));
    }
  }

  return (
    <>
      <FilterPills value={status} onChange={setStatus} options={JOB_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>{isLoading ? t('common.loading') : t('reports.jobCount', { count: jobs.length })}</Text>
        <Pressable onPress={exportCsv} disabled={jobs.length === 0}>
          <Text style={[styles.exportText, jobs.length === 0 && styles.exportDisabled]}>{t('reports.exportCsv')}</Text>
        </Pressable>
      </View>
      <FlatList
        style={styles.list}
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={[item.account.name, item.property?.name].filter(Boolean).join(' · ')}
            right={<Badge label={t(`status.${item.status}`)} tone={statusTone(item.status)} />}
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{t('reports.noJobs')}</Text> : null}
      />
    </>
  );
}

const INVOICE_STATUSES: InvoiceStatus[] = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];

function InvoicesReport() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<InvoiceStatus>('PAID');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['reports', 'invoices', status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      return api.get<InvoiceRow[]>(`/invoices?${params.toString()}`);
    },
  });

  const totalCents = invoices.reduce((sum, i) => sum + i.amountCents, 0);

  async function exportCsv() {
    try {
      await shareCsv(
        `invoices-report.csv`,
        ['Invoice', t('reports.csvStatus'), t('reports.csvCustomer'), 'Amount', 'Due date'],
        invoices.map((i) => [i.invoiceNumber, t(`status.${i.status}`), i.account.name, money(i.amountCents), new Date(i.dueDate).toLocaleDateString(locale)]),
      );
    } catch {
      Alert.alert(t('assistant.error'));
    }
  }

  return (
    <>
      <FilterPills value={status} onChange={setStatus} options={INVOICE_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>{isLoading ? t('common.loading') : t('reports.invoiceSummary', { count: invoices.length, amount: money(totalCents) })}</Text>
        <Pressable onPress={exportCsv} disabled={invoices.length === 0}>
          <Text style={[styles.exportText, invoices.length === 0 && styles.exportDisabled]}>{t('reports.exportCsv')}</Text>
        </Pressable>
      </View>
      <FlatList
        style={styles.list}
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.invoiceNumber}
            subtitle={item.account.name}
            right={
              <>
                <Text style={styles.amount}>{money(item.amountCents)}</Text>
                <Badge label={t(`status.${item.status}`)} tone={statusTone(item.status)} />
              </>
            }
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{t('reports.noInvoices')}</Text> : null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md, paddingBottom: spacing.sm },
  tabButton: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summary: { fontSize: 13, color: colors.textMuted },
  exportText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  exportDisabled: { color: colors.textMuted },
  list: { flex: 1 },
  amount: { fontSize: 14, fontWeight: '600', color: colors.text },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textMuted },
});
