import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import LangToggle from '../components/LangToggle';
import { emailSupport, openWebPage } from '../lib/links';
import { colors, spacing } from '../theme';
import type { MoreStackParamList } from '../navigation/types';

const ROWS: { key: keyof MoreStackParamList; labelKey: string }[] = [
  { key: 'Customers', labelKey: 'nav.customers' },
  { key: 'Quotes', labelKey: 'nav.quotes' },
  { key: 'JobReports', labelKey: 'nav.jobReports' },
  { key: 'Team', labelKey: 'nav.team' },
  { key: 'Reports', labelKey: 'nav.reports' },
  { key: 'Settings', labelKey: 'nav.settings' },
  { key: 'Billing', labelKey: 'nav.billing' },
];

export default function MoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { logout } = useAuth();
  const t = useT();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.list}>
        {ROWS.map((row) => (
          <Pressable
            key={row.key}
            onPress={() => navigation.navigate(row.key as any)}
            style={styles.row}
          >
            <Text style={styles.rowText}>{t(row.labelKey)}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.linksRow}>
          <Pressable onPress={emailSupport}>
            <Text style={styles.linkText}>{t('more.contactSupport')}</Text>
          </Pressable>
          <Pressable onPress={() => openWebPage('/terms')}>
            <Text style={styles.linkText}>{t('more.terms')}</Text>
          </Pressable>
          <Pressable onPress={() => openWebPage('/privacy')}>
            <Text style={styles.linkText}>{t('more.privacy')}</Text>
          </Pressable>
        </View>
        <LangToggle />
        <Pressable onPress={() => logout()} style={styles.logoutRow}>
          <Text style={styles.logoutText}>{t('common.logOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  list: { paddingTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { fontSize: 15, color: colors.text },
  chevron: { fontSize: 18, color: colors.textMuted },
  footer: { padding: spacing.lg, gap: spacing.md },
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  linkText: { color: colors.accent, fontSize: 14 },
  logoutRow: { alignItems: 'flex-start' },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
