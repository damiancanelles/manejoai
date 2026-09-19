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
import { colors, spacing, tones } from '../../theme';
import type { QuotesStackParamList } from '../../navigation/types';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface QuoteDetail {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  notes?: string;
  approvedAt?: string | null;
  account: { id: string; name: string };
  property?: { name: string } | null;
  job?: { title: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  items: QuoteItem[];
}

export default function QuoteDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<QuotesStackParamList, 'QuoteDetail'>>();
  const { quoteId, quoteNumber } = route.params;

  useLayoutEffect(() => {
    if (quoteNumber) navigation.setOptions({ title: quoteNumber });
  }, [quoteNumber, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quotes', quoteId],
    queryFn: () => api.get<QuoteDetail>(`/quotes/${quoteId}`),
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
        <Text style={styles.title}>{data.quoteNumber}</Text>
        <Badge label={t(`status.${data.status}`)} tone={statusTone(data.status)} />
      </View>
      <Text style={styles.subtitle}>{data.account.name}{data.property ? ` · ${data.property.name}` : ''}</Text>

      <DetailCard>
        <DetailField label={t('quoteDetail.issued')} value={new Date(data.issueDate).toLocaleDateString(locale)} />
        {data.job && <DetailField label={t('quoteDetail.job')} value={data.job.title} />}
      </DetailCard>

      {data.invoice && (
        <View style={styles.approvedBanner}>
          <Text style={styles.approvedText}>
            {t('quoteDetail.approved')}
            {data.approvedAt ? ` ${t('quoteDetail.approvedOn', { date: new Date(data.approvedAt).toLocaleDateString(locale) })}` : ''}
            {' '}
            {t('quoteDetail.convertedTo')} {t('quoteDetail.invoiceLabel', { number: data.invoice.invoiceNumber })}
          </Text>
        </View>
      )}

      {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}

      <Text style={styles.sectionTitle}>{t('quoteDetail.items')}</Text>
      <LineItems items={data.items} totalCents={data.amountCents} totalLabel={t('lineItems.total')} />
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
  notes: { fontSize: 14, color: colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  approvedBanner: { backgroundColor: tones.success.bg, borderRadius: 8, padding: spacing.sm },
  approvedText: { fontSize: 13, color: tones.success.fg },
});
