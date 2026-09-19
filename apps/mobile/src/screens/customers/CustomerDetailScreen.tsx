import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { money } from '../../lib/money';
import ListRow from '../../components/ListRow';
import Badge from '../../components/Badge';
import Section from '../../components/Section';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { CustomersStackParamList, JobsStackParamList, QuotesStackParamList, InvoicesStackParamList } from '../../navigation/types';

interface Property {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}
interface Contact {
  id: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  receivesInvoices: boolean;
  receivesReminders: boolean;
  property?: { id: string; name: string } | null;
}
interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  dueDate: string;
}
interface Quote {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
}
interface Payment {
  id: string;
  paidAt: string;
  amountCents: number;
  notes?: string | null;
  invoices: { id: string; invoiceNumber: string }[];
}
interface AccountDetail {
  id: string;
  name: string;
  type: string;
  properties: Property[];
  contacts: Contact[];
  jobs: Job[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
}

type Nav = NativeStackNavigationProp<CustomersStackParamList, 'CustomerDetail'> &
  NativeStackNavigationProp<JobsStackParamList> &
  NativeStackNavigationProp<QuotesStackParamList> &
  NativeStackNavigationProp<InvoicesStackParamList>;

export default function CustomerDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<CustomersStackParamList, 'CustomerDetail'>>();
  const { accountId, accountName } = route.params;

  useLayoutEffect(() => {
    if (accountName) navigation.setOptions({ title: accountName });
  }, [accountName, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['accounts', accountId],
    queryFn: () => api.get<AccountDetail>(`/accounts/${accountId}`),
  });

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{(error as Error)?.message ?? 'Not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.type}>
          {data.type === 'MULTIFAMILY' ? t('accountType.MULTIFAMILY_LONG') : t('accountType.INDIVIDUAL_LONG')}
        </Text>
      </View>

      <Section title={t('accountDetail.properties')} count={data.properties.length} emptyLabel={t('accountDetail.noProperties')}>
        {data.properties.map((p) => (
          <ListRow key={p.id} title={p.name} subtitle={`${p.addressLine1}, ${p.city}, ${p.state} ${p.zip}`} />
        ))}
      </Section>

      <Section title={t('accountDetail.contacts')} count={data.contacts.length} emptyLabel={t('accountDetail.noContacts')}>
        {data.contacts.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={[t(`contactRole.${c.role}`), c.property?.name ?? t('common.wholeAccount'), c.email].filter(Boolean).join(' · ')}
          />
        ))}
      </Section>

      <Section title={t('accountDetail.jobs')} count={data.jobs.length} emptyLabel={t('accountDetail.noJobs')}>
        {data.jobs.map((j) => (
          <ListRow
            key={j.id}
            title={j.title}
            subtitle={new Date(j.createdAt).toLocaleDateString(locale)}
            right={<Badge label={t(`status.${j.status}`)} tone={statusTone(j.status)} />}
            onPress={() => navigation.navigate('JobDetail', { jobId: j.id, title: j.title })}
          />
        ))}
      </Section>

      <Section title={t('accountDetail.quotes')} count={data.quotes.length} emptyLabel={t('accountDetail.noQuotes')}>
        {data.quotes.map((q) => (
          <ListRow
            key={q.id}
            title={q.quoteNumber}
            subtitle={money(q.amountCents)}
            right={<Badge label={t(`status.${q.status}`)} tone={statusTone(q.status)} />}
            onPress={() => navigation.navigate('QuoteDetail', { quoteId: q.id, quoteNumber: q.quoteNumber })}
          />
        ))}
      </Section>

      <Section title={t('accountDetail.invoices')} count={data.invoices.length} emptyLabel={t('accountDetail.noInvoices')}>
        {data.invoices.map((inv) => (
          <ListRow
            key={inv.id}
            title={inv.invoiceNumber}
            subtitle={money(inv.amountCents)}
            right={<Badge label={t(`status.${inv.status}`)} tone={statusTone(inv.status)} />}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber })}
          />
        ))}
      </Section>

      <Section title={t('accountDetail.payments')} count={data.payments.length} emptyLabel={t('accountDetail.noPayments')}>
        {data.payments.map((p) => (
          <ListRow
            key={p.id}
            title={money(p.amountCents)}
            subtitle={`${new Date(p.paidAt).toLocaleDateString(locale)} · ${p.invoices.map((i) => i.invoiceNumber).join(', ')}`}
          />
        ))}
      </Section>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.danger },
  header: { padding: spacing.md, gap: 2 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  type: { fontSize: 13, color: colors.textMuted },
  bottomSpacer: { height: spacing.lg },
});
