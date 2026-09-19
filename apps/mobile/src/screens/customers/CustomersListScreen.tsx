import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { useT } from '../../i18n';
import ListRow from '../../components/ListRow';
import SearchInput from '../../components/SearchInput';
import FilterPills from '../../components/FilterPills';
import { colors, spacing } from '../../theme';
import type { CustomersStackParamList } from '../../navigation/types';

interface AccountListItem {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'MULTIFAMILY';
  properties: { id: string }[];
}

type FilterType = 'ALL' | 'INDIVIDUAL' | 'MULTIFAMILY';

export default function CustomersListScreen() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<CustomersStackParamList>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['accounts', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<AccountListItem[]>(`/accounts?${params.toString()}`);
    },
  });

  const visible = filter === 'ALL' ? accounts : accounts.filter((a) => a.type === filter);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <SearchInput value={search} onChangeText={setSearch} placeholder={t('accounts.search')} />
      <FilterPills
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: t('status.ALL') },
          { value: 'INDIVIDUAL', label: t('accountType.INDIVIDUAL') },
          { value: 'MULTIFAMILY', label: t('accountType.MULTIFAMILY') },
        ]}
      />
      <FlatList
        style={styles.list}
        data={visible}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={item.type === 'MULTIFAMILY' ? t('accountType.MULTIFAMILY') : t('accountType.INDIVIDUAL')}
            right={<Text style={styles.count}>{item.properties.length}</Text>}
            onPress={() => navigation.navigate('CustomerDetail', { accountId: item.id, accountName: item.name })}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('accounts.empty')}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  count: { fontSize: 13, color: colors.textMuted },
  empty: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
