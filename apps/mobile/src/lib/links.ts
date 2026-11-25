import { Linking } from 'react-native';

// The public website - forgot password, Terms and Privacy live there (the
// app opens them in the browser rather than duplicating the screens).
// Override with EXPO_PUBLIC_WEB_URL for a local web build.
export const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_URL || 'https://manejoai.cloud').replace(/\/$/, '');

// Same address as the web app's "Contact support" links.
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@manejoai.cloud';

export function openWebPage(path: string) {
  void Linking.openURL(`${WEB_BASE}${path}`).catch(() => {});
}

export function emailSupport() {
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
}
