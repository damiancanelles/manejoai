import { useLayoutEffect } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import Badge from '../../components/Badge';
import DetailField, { DetailCard } from '../../components/DetailField';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { JobsStackParamList } from '../../navigation/types';

interface Photo {
  id: string;
  url: string;
  caption?: string;
}
interface JobDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  scheduledAt?: string | null;
  account: { id: string; name: string };
  property?: { id: string; name: string } | null;
  photos: Photo[];
}

export default function JobDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<JobsStackParamList, 'JobDetail'>>();
  const { jobId, title } = route.params;

  useLayoutEffect(() => {
    if (title) navigation.setOptions({ title });
  }, [title, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => api.get<JobDetail>(`/jobs/${jobId}`),
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
        <Text style={styles.title}>{data.title}</Text>
        <Badge label={t(`status.${data.status}`)} tone={statusTone(data.status)} />
      </View>
      {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

      <DetailCard>
        <DetailField label={t('jobDetail.customer')} value={data.account.name} />
        {data.property && <DetailField label={t('accountDetail.properties')} value={data.property.name} />}
        {data.scheduledAt && (
          <DetailField label={t('jobDetail.scheduledFor')} value={new Date(data.scheduledAt).toLocaleDateString(locale)} />
        )}
      </DetailCard>

      <Text style={styles.sectionTitle}>{t('jobDetail.photos')} {data.photos.length > 0 ? `(${data.photos.length})` : ''}</Text>
      {data.photos.length === 0 ? (
        <Text style={styles.empty}>{t('jobDetail.noPhotos')}</Text>
      ) : (
        <FlatList
          data={data.photos}
          keyExtractor={(p) => p.id}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.photoRow}
          renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.photo} />}
        />
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
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  description: { fontSize: 14, color: colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  empty: { fontSize: 13, color: colors.textMuted },
  photoRow: { gap: spacing.xs, marginBottom: spacing.xs },
  photo: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: colors.border },
});
