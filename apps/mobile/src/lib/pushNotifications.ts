import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Requests permission and returns an Expo push token, or null if it can't
 * (simulator, permission denied, or - before `eas init` has been run for
 * this project - no EAS project id yet to ask Expo's push service for a
 * token against). Registration-only for now; nothing on the backend sends
 * a push yet (see UsersService.registerPushToken), so failing quietly here
 * is fine - there's nothing time-sensitive riding on it.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't meaningful on a simulator

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null; // `eas init` hasn't linked a project yet

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
