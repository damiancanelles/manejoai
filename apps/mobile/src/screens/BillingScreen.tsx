import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api/client';
import { useAuth, type Business } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { colors, spacing, tones } from '../theme';

const STATUS_LABEL_KEY: Record<string, string> = {
  trialing: 'billing.statusTrialing',
  active: 'billing.statusActive',
  past_due: 'billing.statusPastDue',
  canceled: 'billing.statusCanceled',
  incomplete: 'billing.statusIncomplete',
  incomplete_expired: 'billing.statusIncomplete',
  unpaid: 'billing.statusUnpaid',
};

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function BillingScreen() {
  const { business: cachedBusiness, setBusiness, logout } = useAuth();
  const { t, locale } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // The cached business from login can be stale, most importantly right
  // after returning from the in-app browser having just paid - refetch on
  // mount so the status shown here (and everywhere else via AuthContext) is
  // current, same reasoning as the web app's Billing page.
  useEffect(() => {
    api.get<Business>('/businesses/me').then(setBusiness).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const business = cachedBusiness;
  const status = business?.subscriptionStatus ?? 'trialing';
  const tier = business?.subscriptionTier ?? 'pro';
  const isActive = status === 'active';
  const isTrialing = status === 'trialing' && !!business?.trialEndsAt && daysLeft(business.trialEndsAt) > 0;
  const lapsed = !isActive && !isTrialing;

  async function refetchBusiness() {
    try {
      const fresh = await api.get<Business>('/businesses/me');
      setBusiness(fresh);
    } catch {
      // best-effort - the next screen visit will refetch anyway
    }
  }

  async function goToCheckout(plan: 'basic' | 'pro') {
    setSubmitting(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout', { tier: plan });
      await WebBrowser.openBrowserAsync(url);
      await refetchBusiness();
    } catch (err: any) {
      Alert.alert(t('assistant.error'), err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changePlan(plan: 'basic' | 'pro') {
    if (plan === 'basic') {
      Alert.alert(t('settings.tgDisconnect'), t('billing.switchToBasicConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('billing.switchToBasic'), style: 'destructive', onPress: () => doChangePlan(plan) },
      ]);
    } else {
      doChangePlan(plan);
    }
  }

  async function doChangePlan(plan: 'basic' | 'pro') {
    setSubmitting(true);
    setNotice(null);
    try {
      await api.post('/billing/change-plan', { tier: plan });
      await refetchBusiness();
      setNotice(plan === 'pro' ? t('billing.nowOnPro') : t('billing.nowOnBasic'));
    } catch (err: any) {
      Alert.alert(t('assistant.error'), err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function goToPortal() {
    setSubmitting(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/portal');
      await WebBrowser.openBrowserAsync(url);
      await refetchBusiness();
    } catch (err: any) {
      Alert.alert(t('assistant.error'), err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('billing.status')}</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isActive ? tones.success.bg : isTrialing ? tones.warning.bg : tones.danger.bg },
            ]}
          >
            <Text style={{ color: isActive ? tones.success.fg : isTrialing ? tones.warning.fg : tones.danger.fg, fontSize: 12, fontWeight: '600' }}>
              {STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status]) : status}
            </Text>
          </View>
        </View>
        {isTrialing && business?.trialEndsAt && (
          <Text style={styles.statusText}>{t('billing.trialDaysLeft', { days: daysLeft(business.trialEndsAt) })}</Text>
        )}
        {isActive && (
          <Text style={styles.statusText}>
            {tier === 'pro' ? t('billing.proPlan') : t('billing.basicPlan')}
            {business?.currentPeriodEnd ? t('billing.renews', { date: new Date(business.currentPeriodEnd).toLocaleDateString(locale) }) : ''}.
          </Text>
        )}
        {isTrialing && <Text style={styles.statusHint}>{t('billing.trialIncludesPro')}</Text>}
        {lapsed && <Text style={styles.statusDanger}>{t('billing.lapsed')}</Text>}
      </View>

      {notice && <Text style={styles.notice}>{notice}</Text>}

      {lapsed || isTrialing ? (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{t('billing.basicName')}</Text>
              <Text style={styles.planPrice}>{t('billing.basicPrice')}</Text>
            </View>
            <Text style={styles.planDesc}>{t('billing.basicDesc')}</Text>
            <Pressable onPress={() => goToCheckout('basic')} disabled={submitting} style={[styles.outlineBtn, submitting && styles.btnDisabled]}>
              <Text style={styles.outlineBtnText}>{submitting ? t('common.redirecting') : t('billing.chooseBasic')}</Text>
            </Pressable>
          </View>
          <View style={[styles.planCard, styles.planCardPro]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{t('billing.proName')}</Text>
              <Text style={styles.planPrice}>{t('billing.proPrice')}</Text>
            </View>
            <Text style={styles.planDesc}>{t('billing.proDesc')}</Text>
            <Pressable onPress={() => goToCheckout('pro')} disabled={submitting} style={[styles.solidBtn, submitting && styles.btnDisabled]}>
              <Text style={styles.solidBtnText}>{submitting ? t('common.redirecting') : t('billing.choosePro')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {tier === 'basic' ? (
            <Pressable onPress={() => changePlan('pro')} disabled={submitting} style={[styles.solidBtn, submitting && styles.btnDisabled]}>
              <Text style={styles.solidBtnText}>{submitting ? t('common.working') : t('billing.upgradeToPro')}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => changePlan('basic')} disabled={submitting} style={[styles.outlineBtn, submitting && styles.btnDisabled]}>
              <Text style={styles.outlineBtnText}>{submitting ? t('common.working') : t('billing.switchToBasic')}</Text>
            </Pressable>
          )}
          <Pressable onPress={goToPortal} disabled={submitting} style={[styles.neutralBtn, submitting && styles.btnDisabled]}>
            <Text style={styles.neutralBtnText}>{submitting ? t('common.redirecting') : t('billing.manageSubscription')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => logout()} style={styles.logoutRow}>
        <Text style={styles.logoutText}>{t('common.logOut')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  statusCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 13, color: colors.textMuted },
  statusPill: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 13, color: colors.text },
  statusHint: { fontSize: 12, color: colors.textMuted },
  statusDanger: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  notice: { fontSize: 13, color: tones.success.fg },
  planCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4 },
  planCardPro: { borderColor: colors.accent, borderWidth: 2 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontSize: 15, fontWeight: '700', color: colors.text },
  planPrice: { fontSize: 13, color: colors.textMuted },
  planDesc: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  outlineBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  outlineBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  solidBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  solidBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  neutralBtn: { backgroundColor: colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  neutralBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  logoutRow: { alignItems: 'center', marginTop: spacing.md },
  logoutText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
