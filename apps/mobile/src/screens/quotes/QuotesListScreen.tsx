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
import type { QuotesStackParamList } from '../../navigation/types';

interface QuoteListItem {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  account: { name: string };
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED';
const STATUSES: StatusFilter[] = ['ALL', 'PENDING', 'APPROVED'];

export default function QuotesListScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<QuotesStackParamList>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: quotes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quotes', debouncedSearch, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<QuoteListItem[]>(`/quotes?${params.toString()}`);
    },
  });

  return (
    <View style={styles.screen}>
      <SearchInput value={search} onChangeText={setSearch} placeholder={t('quotes.search')} />
      <FilterPills value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      <FlatList
        style={styles.list}
        data={quotes}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ListRow
            title={item.quoteNumber}
            subtitle={item.account.name}
            right={
              <>
                <Text style={styles.amount}>{money(item.amountCents)}</Text>
                <Badge label={t(`status.${item.status}`)} tone={statusTone(item.status)} />
              </>
            }
            onPress={() => navigation.navigate('QuoteDetail', { quoteId: item.id, quoteNumber: item.quoteNumber })}
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{t('quotes.empty')}</Text> : null}
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
