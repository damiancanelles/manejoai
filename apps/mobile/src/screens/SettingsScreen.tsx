import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth, type Business } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import TextField from '../components/TextField';
import { colors, spacing, tones } from '../theme';

interface TelegramStatus {
  hasToken: boolean;
  botUsername: string | null;
  groupTitle: string | null;
  groupLinked: boolean;
  confirmedAt: string | null;
}

function BusinessInfoSection() {
  const { business, setBusiness } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState(business?.name ?? '');
  const [addressLine1, setAddressLine1] = useState(business?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(business?.addressLine2 ?? '');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [replyToEmail, setReplyToEmail] = useState(business?.replyToEmail ?? '');

  const save = useMutation({
    mutationFn: () =>
      api.patch<Business>('/businesses/me', {
        name,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        phone: phone || undefined,
        replyToEmail: replyToEmail || undefined,
      }),
    onSuccess: setBusiness,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.businessInfo')}</Text>
      <Text style={styles.cardSub}>{t('settings.businessInfoSub')}</Text>

      {business && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>{t('settings.sendingAddress')}</Text>
          <Text style={styles.infoValue}>{business.emailSlug}@manejoai.cloud</Text>
          <Text style={styles.infoHint}>{t('settings.sendingAddressHint')}</Text>
        </View>
      )}

      <TextField label={t('settings.businessName')} value={name} onChangeText={setName} />
      <TextField label={t('settings.address')} value={addressLine1} onChangeText={setAddressLine1} placeholder={t('settings.streetAddress')} />
      <TextField label="" value={addressLine2} onChangeText={setAddressLine2} placeholder={t('settings.cityStateZip')} />
      <TextField label={t('settings.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField
        label={t('settings.replyToEmail')}
        value={replyToEmail}
        onChangeText={setReplyToEmail}
        placeholder={t('settings.replyToPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Pressable onPress={() => save.mutate()} disabled={save.isPending} style={[styles.submit, save.isPending && styles.submitDisabled]}>
        <Text style={styles.submitText}>{save.isPending ? t('common.saving') : t('common.saveChanges')}</Text>
      </Pressable>
      {save.isSuccess && <Text style={styles.successText}>{t('settings.businessInfoUpdated')}</Text>}
    </View>
  );
}

function TelegramSection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [botToken, setBotToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['telegram', 'status'],
    queryFn: () => api.get<TelegramStatus>('/telegram/me/status'),
  });

  const saveToken = useMutation({
    mutationFn: () => api.patch<TelegramStatus>('/telegram/me/token', { botToken }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['telegram', 'status'], updated);
      setBotToken('');
      setMessage(t('settings.tgConnected', { username: updated.botUsername ?? '' }));
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const confirm = useMutation({
    mutationFn: () => api.post<TelegramStatus>('/telegram/me/confirm'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['telegram', 'status'], updated);
      setMessage(t('settings.tgMarkedSetUp'));
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const disconnect = useMutation({
    mutationFn: () => api.delete<TelegramStatus>('/telegram/me/token'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['telegram', 'status'], updated);
      setMessage(t('settings.tgDisconnected'));
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  function confirmDisconnect() {
    Alert.alert(t('settings.tgDisconnect'), t('settings.tgDisconnectConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.tgDisconnect'), style: 'destructive', onPress: () => disconnect.mutate() },
    ]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.telegramTitle')}</Text>
      <Text style={styles.cardSub}>{t('settings.telegramSub')}</Text>

      {!isLoading && status && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>{t('settings.tgBot')}</Text>
          <Text style={styles.infoValue}>{status.hasToken ? `@${status.botUsername}` : t('settings.tgNotConnected')}</Text>
          <Text style={[styles.infoLabel, { marginTop: spacing.xs }]}>{t('settings.tgGroup')}</Text>
          <Text style={styles.infoValue}>{status.groupLinked ? status.groupTitle || t('settings.tgLinked') : t('settings.tgWaiting')}</Text>
          <Text style={[styles.infoLabel, { marginTop: spacing.xs }]}>{t('settings.tgSetup')}</Text>
          <Text style={styles.infoValue}>
            {status.confirmedAt
              ? t('settings.tgConfirmedOn', { date: new Date(status.confirmedAt).toLocaleDateString(locale) })
              : t('settings.tgNotConfirmed')}
          </Text>
        </View>
      )}

      <View style={styles.stepsBox}>
        <Text style={styles.stepText}>1. {t('settings.tgStep1a')}@BotFather{t('settings.tgStep1b')}/newbot{t('settings.tgStep1d')}</Text>
        <Text style={styles.stepText}>2. {t('settings.tgStep2')}</Text>
        <Text style={styles.stepText}>
          3. {t('settings.tgStep3a')}/setprivacy{t('settings.tgStep3b')}
          {t('settings.tgStep3disable')}
          {t('settings.tgStep3c')}
        </Text>
        <Text style={styles.stepText}>4. {t('settings.tgStep4')}</Text>
        <Text style={styles.stepText}>5. {t('settings.tgStep5')}</Text>
        <Text style={styles.stepText}>6. {t('settings.tgStep6')}</Text>
      </View>

      {message && <Text style={styles.successText}>{message}</Text>}

      <TextField
        label={t('settings.tgBotToken')}
        value={botToken}
        onChangeText={setBotToken}
        placeholder={status?.hasToken ? t('settings.tgTokenPlaceholderNew') : t('settings.tgTokenPlaceholderFrom')}
        autoCapitalize="none"
        secureTextEntry
      />
      <Pressable
        onPress={() => botToken.trim() && saveToken.mutate()}
        disabled={saveToken.isPending || !botToken.trim()}
        style={[styles.submit, (saveToken.isPending || !botToken.trim()) && styles.submitDisabled]}
      >
        <Text style={styles.submitText}>{saveToken.isPending ? t('common.saving') : t('settings.tgSave')}</Text>
      </Pressable>

      <View style={styles.rowActions}>
        <Pressable
          onPress={() => confirm.mutate()}
          disabled={!status?.hasToken || confirm.isPending}
          style={[styles.confirmBtn, (!status?.hasToken || confirm.isPending) && styles.submitDisabled]}
        >
          <Text style={styles.confirmBtnText}>{confirm.isPending ? t('common.saving') : t('settings.tgCompletedSteps')}</Text>
        </Pressable>
        {status?.hasToken && (
          <Pressable onPress={confirmDisconnect} disabled={disconnect.isPending} style={styles.disconnectBtn}>
            <Text style={styles.disconnectBtnText}>{disconnect.isPending ? t('settings.tgDisconnecting') : t('settings.tgDisconnect')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ChangePasswordSection() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const change = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) throw new Error(t('settings.pwMismatch'));
      if (newPassword.length < 8) throw new Error(t('settings.pwShort'));
      return api.patch<void>('/users/me/password', { currentPassword, newPassword });
    },
    onSuccess: () => {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.pwTitle')}</Text>
      <Text style={styles.cardSub}>{t('settings.pwSub')}</Text>

      <TextField label={t('settings.pwCurrent')} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      <TextField label={t('settings.pwNew')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TextField label={t('settings.pwConfirm')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <Pressable
        onPress={() => {
          setSuccess(false);
          change.mutate();
        }}
        disabled={change.isPending}
        style={[styles.submit, change.isPending && styles.submitDisabled]}
      >
        <Text style={styles.submitText}>{change.isPending ? t('common.saving') : t('settings.pwSubmit')}</Text>
      </Pressable>
      {success && <Text style={styles.successText}>{t('settings.pwChanged')}</Text>}
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BusinessInfoSection />
      <TelegramSection />
      <ChangePasswordSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
  infoBox: { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  infoHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  stepsBox: { gap: 4 },
  stepText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  submit: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  successText: { fontSize: 13, color: tones.success.fg },
  rowActions: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  confirmBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  disconnectBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, paddingHorizontal: spacing.md, alignItems: 'center' },
  disconnectBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
