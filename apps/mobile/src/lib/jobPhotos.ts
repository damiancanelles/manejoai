import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
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
  // The classic RN FormData part shape ({uri, name, type}) throws
  // "Unsupported FormDataPart implementation" under Expo's fetch polyfill
  // (apps on SDK 53+ get this by default) - it only accepts a real
  // Blob/File-like part with a .bytes() method, which the old {uri,name,type}
  // object never had. expo-file-system's File class implements Blob and
  // has .bytes(), so it satisfies that check. See expo/src/winter/fetch/
  // convertFormData.ts: "`uri` is not supported for React Native's FormData."
  form.append('file', new File(asset.uri));

  await api.post(`/jobs/${jobId}/photos`, form);
  return true;
}
