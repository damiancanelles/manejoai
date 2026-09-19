// SDK 57 replaced expo-file-system's plain async functions with a
// class-based File/Directory API - the "/legacy" subpath is Expo's own
// official compatibility import for exactly this, not a deprecated hack.
// See AGENTS.md: this SDK changed enough that it's worth checking the
// versioned docs rather than assuming a remembered API still applies.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function escapeCsvValue(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

/**
 * apps/web downloads a CSV file directly (browsers can do that); a native
 * app has no equivalent, so this writes it to the app's cache dir and
 * hands it to the OS share sheet instead - AirDrop, Files, email, Slack,
 * whatever the user picks - same end result.
 */
export async function shareCsv(filename: string, headers: string[], rows: (string | number)[][]): Promise<void> {
  const csv = toCsv(headers, rows);
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
}
