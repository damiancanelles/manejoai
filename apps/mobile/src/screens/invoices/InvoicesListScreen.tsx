import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { money } from '../../lib/money';
import ListRow from '../../components/ListRow';
import SearchInput from '../../components/SearchInput';
import FilterPills from '../../components/FilterPills';
import Badge from '../../components/Badge';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { InvoicesStackParamList } from '../../navigation/types';

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  title: string;
  amountCents: number;
  status: string;
  dueDate: string;
  account: { name: string };
  property?: { name: string } | null;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'OVERDUE' | 'PAID' | 'CANCELED';
const STATUSES: StatusFilter[] = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];

export default function InvoicesListScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<InvoicesStackParamList>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: invoices = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['invoices', debouncedSearch, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<InvoiceListItem[]>(`/invoices?${params.toString()}`);
    },
  });

  return (
    <View style={styles.screen}>
      <SearchInput value={search} onChangeText={setSearch} placeholder={t('invoices.search')} />
      <FilterPills value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      <FlatList
        style={styles.list}
        data={invoices}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ListRow
            title={item.invoiceNumber}
            subtitle={[item.account.name, item.title].filter(Boolean).join(' · ')}
            right={
              <>
                <Text style={styles.amount}>{money(item.amountCents)}</Text>
                <Badge label={t(`status.${item.status}`)} tone={statusTone(item.status)} />
              </>
            }
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id, invoiceNumber: item.invoiceNumber })}
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{t('invoices.empty')}</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  amount: { fontSize: 14, fontWeight: '600', color: colors.text },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textMuted },
});
