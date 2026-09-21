import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useT } from '../../i18n';
import { colors, spacing, tones } from '../../theme';

interface PickedPhoto {
  uri: string;
}

const MAX_PHOTOS = 5;

export default function ReportJobScreen() {
  const t = useT();
  const [rawText, setRawText] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  async function addPhoto(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') return;

      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) return;

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: 'images' })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: 'images', allowsMultipleSelection: true, selectionLimit: remaining });

      if (result.canceled || !result.assets?.length) return;
      setPhotos((prev) => [...prev, ...result.assets.slice(0, remaining).map((a) => ({ uri: a.uri }))]);
    } catch (err: any) {
      Alert.alert(t('assistant.error'), err.message || String(err));
    }
  }

  function onAddPhotoPress() {
    if (photos.length >= MAX_PHOTOS) return;
    Alert.alert(t('reportJob.addPhoto'), undefined, [
      { text: 'Take photo', onPress: () => addPhoto('camera') },
      { text: 'Choose from library', onPress: () => addPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (rawText.trim()) form.append('rawText', rawText.trim());
      // The classic RN FormData part shape ({uri, name, type}) throws
      // "Unsupported FormDataPart implementation" under Expo's fetch
      // polyfill (SDK 53+) - it only accepts a real Blob/File-like part
      // with a .bytes() method. expo-file-system's File class implements
      // Blob and has .bytes(), so it satisfies that check. See
      // src/lib/jobPhotos.ts for the same fix on the existing job-photo
      // upload.
      photos.forEach((p) => {
        form.append('photos', new File(p.uri));
      });
      return api.post('/incoming-reports', form);
    },
    onSuccess: () => {
      setRawText('');
      setPhotos([]);
      Alert.alert(t('reportJob.sent'));
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const canSubmit = (rawText.trim().length > 0 || photos.length > 0) && !submit.isPending;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('reportJob.title')}</Text>
        <Text style={styles.subtitle}>{t('reportJob.subtitle')}</Text>

        <View style={styles.noteBox}>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            placeholder={t('reportJob.notePlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            style={styles.noteInput}
          />
        </View>

        <View style={styles.photoRow}>
          {photos.map((p) => (
            <View key={p.uri} style={styles.photoWrap}>
              <Image source={{ uri: p.uri }} style={styles.photo} />
              <Pressable onPress={() => removePhoto(p.uri)} style={styles.removeBadge}>
                <Text style={styles.removeBadgeText}>×</Text>
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={onAddPhotoPress} style={styles.addPhotoTile}>
              <Text style={styles.addPhotoTileText}>{t('reportJob.addPhoto')}</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => submit.mutate()} disabled={!canSubmit} style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}>
          <Text style={styles.submitBtnText}>{submit.isPending ? t('common.saving') : t('reportJob.submit')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  noteBox: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  noteInput: { padding: spacing.sm, fontSize: 15, color: colors.text, minHeight: 120, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoWrap: { position: 'relative' },
  photo: { width: 84, height: 84, borderRadius: 8, backgroundColor: colors.border },
  removeBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  removeBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  addPhotoTile: { width: 84, height: 84, borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addPhotoTileText: { fontSize: 11, color: colors.accent, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  submitBtn: { backgroundColor: tones.success.fg, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
