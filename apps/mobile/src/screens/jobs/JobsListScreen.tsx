import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import ListRow from '../../components/ListRow';
import SearchInput from '../../components/SearchInput';
import FilterPills from '../../components/FilterPills';
import Badge from '../../components/Badge';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { JobsStackParamList } from '../../navigation/types';

interface JobListItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  account: { name: string };
  property?: { name: string } | null;
}

type StatusFilter = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
const STATUSES: StatusFilter[] = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];

export default function JobsListScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<JobsStackParamList>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jobs', debouncedSearch, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<JobListItem[]>(`/jobs?${params.toString()}`);
    },
  });

  return (
    <View style={styles.screen}>
      <SearchInput value={search} onChangeText={setSearch} placeholder={t('jobs.search')} />
      <FilterPills value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      <FlatList
        style={styles.list}
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={[item.account.name, item.property?.name].filter(Boolean).join(' · ')}
            right={
              <>
                <Badge label={t(`status.${item.status}`)} tone={statusTone(item.status)} />
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString(locale)}</Text>
              </>
            }
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id, title: item.title })}
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{t('jobs.empty')}</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  date: { fontSize: 11, color: colors.textMuted },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textMuted },
});
