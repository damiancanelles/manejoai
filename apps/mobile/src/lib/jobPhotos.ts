import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';

export type PhotoSource = 'camera' | 'library';

/**
 * Requests the right permission, opens the camera or photo library, and
 * uploads whatever gets picked to POST /jobs/:id/photos (the same
 * multipart endpoint the web app's job page already uses). Returns false
 * if the user canceled or permission was denied - both are normal outcomes,
 * not errors, so the caller shouldn't show an error message for either.
 *
 * No offline queue yet (WO-5) - a failed upload just rejects and the
 * caller shows a retry prompt; nothing is silently lost, but it isn't
 * automatically retried in the background either.
 */
export async function pickAndUploadJobPhoto(jobId: string, source: PhotoSource): Promise<boolean> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') return false;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: 'images' })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: 'images' });

  if (result.canceled || !result.assets?.[0]) return false;
  const asset = result.assets[0];

  const form = new FormData();
  // React Native's FormData accepts this {uri, name, type} shape for a
  // file part - not a real Blob/File object the way a browser's would be,
  // that's just how RN's fetch polyfill expects a local file reference.
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName ?? `job-photo-${Date.now()}.jpg`,
    // Force a plain image/* type even when the OS reports something our
    // backend/S3 might balk at (e.g. image/heic on an iPhone still set to
    // "Most Compatible" off) - only affects the Content-Type header sent,
    // not the asset's actual bytes.
    type: asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg',
  } as unknown as Blob);

  await api.post(`/jobs/${jobId}/photos`, form);
  return true;
}
