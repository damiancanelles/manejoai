import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { AppOwnership } from 'expo-constants';

/**
 * Requests permission and returns an Expo push token, or null if it can't:
 * simulator, permission denied, running inside Expo Go (see below), or -
 * before `eas init` has been run for this project - no EAS project id yet
 * to ask Expo's push service for a token against. Registration-only for
 * now; nothing on the backend sends a push yet (see
 * UsersService.registerPushToken), so failing quietly here is fine -
 * there's nothing time-sensitive riding on it.
 *
 * Expo Go itself: as of SDK 53, remote push notifications were removed
 * from Expo Go entirely, and `expo-notifications` warns loudly ("Use a
 * development build instead of Expo Go") the moment it's *loaded* there -
 * not just when a function on it is called. That's why this file doesn't
 * `import * as Notifications from 'expo-notifications'` at the top the
 * normal way: this module gets pulled in from AuthContext, which is
 * mounted at the app root, so a static import would run that warning on
 * every single launch under Expo Go, regardless of whether this function
 * ever gets called. The dynamic `await import(...)` below only happens
 * after the Expo Go check, so the package is never even loaded there.
 *
 * `Constants.appOwnership === 'expo'` is the one reliable way to detect
 * *specifically* Expo Go (as opposed to a real dev-client build, which
 * push works fine in) - it's marked deprecated in favor of
 * `executionEnvironment`, but that enum's StoreClient value covers both
 * Expo Go and dev-client builds, which isn't precise enough here.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't meaningful on a simulator
  if (Constants.appOwnership === AppOwnership.Expo) return null; // Expo Go - test this from a dev build instead

  const Notifications = await import('expo-notifications');

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
