import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { pickAndUploadJobPhoto } from '../../lib/jobPhotos';
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

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];

export default function JobDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<JobsStackParamList, 'JobDetail'>>();
  const { jobId, title } = route.params;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  useLayoutEffect(() => {
    if (title) navigation.setOptions({ title });
  }, [title, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => api.get<JobDetail>(`/jobs/${jobId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/jobs/${jobId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', jobId] }),
  });

  async function addPhoto(source: 'camera' | 'library') {
    setUploading(true);
    try {
      const uploaded = await pickAndUploadJobPhoto(jobId, source);
      if (uploaded) await queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
    } catch (err: any) {
      Alert.alert(t('assistant.error'), err.message);
    } finally {
      setUploading(false);
    }
  }

  function onAddPhotoPress() {
    Alert.alert(t('jobDetail.addPhoto'), undefined, [
      { text: 'Take photo', onPress: () => addPhoto('camera') },
      { text: 'Choose from library', onPress: () => addPhoto('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

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

      <View>
        <Text style={styles.statusLabel}>{t('jobDetail.status')}</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const active = data.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending}
                style={[styles.statusPill, active && styles.statusPillActive]}
              >
                <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{t(`status.${s}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.photosHeader}>
        <Text style={styles.sectionTitle}>
          {t('jobDetail.photos')} {data.photos.length > 0 ? `(${data.photos.length})` : ''}
        </Text>
        <Pressable onPress={onAddPhotoPress} disabled={uploading}>
          <Text style={styles.addPhotoText}>{uploading ? t('jobDetail.uploading') : t('jobDetail.addPhoto')}</Text>
        </Pressable>
      </View>
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
  statusLabel: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statusPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusPillText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  statusPillTextActive: { color: '#fff' },
  photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  addPhotoText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  empty: { fontSize: 13, color: colors.textMuted },
  photoRow: { gap: spacing.xs, marginBottom: spacing.xs },
  photo: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: colors.border },
});
