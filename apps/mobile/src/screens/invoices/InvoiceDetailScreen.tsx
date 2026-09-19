import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import Badge from '../../components/Badge';
import DetailField, { DetailCard } from '../../components/DetailField';
import LineItems from '../../components/LineItems';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { InvoicesStackParamList } from '../../navigation/types';

interface Reminder {
  id: string;
  sentAt: string;
  toEmail: string;
}
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  title: string;
  account: { id: string; name: string };
  property?: { name: string } | null;
  job?: { title: string } | null;
  items: InvoiceItem[];
  reminders: Reminder[];
}

export default function InvoiceDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<InvoicesStackParamList, 'InvoiceDetail'>>();
  const { invoiceId, invoiceNumber } = route.params;

  useLayoutEffect(() => {
    if (invoiceNumber) navigation.setOptions({ title: invoiceNumber });
  }, [invoiceNumber, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${invoiceId}`),
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
        <Text style={styles.title}>{data.invoiceNumber}</Text>
        <Badge label={t(`status.${data.status}`)} tone={statusTone(data.status)} />
      </View>
      <Text style={styles.subtitle}>{data.account.name}{data.property ? ` · ${data.property.name}` : ''}</Text>
      <Text style={styles.invoiceTitle}>{data.title}</Text>

      <DetailCard>
        <DetailField label={t('invoiceDetail.issued')} value={new Date(data.issueDate).toLocaleDateString(locale)} />
        <DetailField label={t('invoiceDetail.due')} value={new Date(data.dueDate).toLocaleDateString(locale)} />
        {data.job && <DetailField label={t('invoiceDetail.job')} value={data.job.title} />}
      </DetailCard>

      <Text style={styles.sectionTitle}>{t('invoiceDetail.items')}</Text>
      <LineItems items={data.items} totalCents={data.amountCents} totalLabel={t('lineItems.total')} />

      <Text style={styles.sectionTitle}>{t('invoiceDetail.reminderHistory')}</Text>
      {data.reminders.length === 0 ? (
        <Text style={styles.empty}>{t('invoiceDetail.noReminders')}</Text>
      ) : (
        <DetailCard>
          {data.reminders.map((r) => (
            <DetailField
              key={r.id}
              label={r.toEmail}
              value={new Date(r.sentAt).toLocaleDateString(locale)}
            />
          ))}
        </DetailCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.danger },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  invoiceTitle: { fontSize: 14, color: colors.text, marginTop: -4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted },
});
