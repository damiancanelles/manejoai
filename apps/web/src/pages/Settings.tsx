import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth, Business } from '../context/AuthContext';
import { useI18n } from '../i18n';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

/**
 * Business name/address/phone shown on this business's own invoices and
 * emails (see Business in AuthContext) - editable here, more settings
 * sections can join it on this same page later.
 */
function BusinessInfoSection() {
  const { business, setBusiness } = useAuth();
  const t = useI18n().t;
  const [name, setName] = useState(business?.name ?? '');
  const [addressLine1, setAddressLine1] = useState(business?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(business?.addressLine2 ?? '');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [replyToEmail, setReplyToEmail] = useState(business?.replyToEmail ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const updated = await api.patch<Business>('/businesses/me', {
        name,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        phone: phone || undefined,
        replyToEmail: replyToEmail || undefined,
      });
      setBusiness(updated);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-md">
      <h2 className="mb-2 text-lg font-semibold">{t('settings.businessInfo')}</h2>
      <p className="mb-4 text-sm text-slate-500">{t('settings.businessInfoSub')}</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded bg-green-50 p-2 text-sm text-green-800">{t('settings.businessInfoUpdated')}</div>}

        {business && (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">{t('settings.sendingAddress')}</span>
            <div className="font-medium text-slate-700">{business.emailSlug}@manejoai.cloud</div>
            <p className="mt-1 text-xs text-slate-400">{t('settings.sendingAddressHint')}</p>
          </div>
        )}

        <label className="block text-sm">
          {t('settings.businessName')}
          <input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          {t('settings.address')}
          <input
            required
            placeholder={t('settings.streetAddress')}
            value={addressLine1}
            onChange={(e) => {
              setAddressLine1(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <input
            placeholder={t('settings.cityStateZip')}
            value={addressLine2}
            onChange={(e) => {
              setAddressLine2(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          {t('settings.phone')}
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          {t('settings.replyToEmail')}
          <input
            type="email"
            placeholder={t('settings.replyToPlaceholder')}
            value={replyToEmail}
            onChange={(e) => {
              setReplyToEmail(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? t('common.saving') : t('common.saveChanges')}
        </button>
      </form>
    </section>
  );
}

interface TelegramStatus {
  hasToken: boolean;
  botUsername: string | null;
  groupTitle: string | null;
  groupLinked: boolean;
  confirmedAt: string | null;
}

/**
 * Self-service Telegram job-report intake, one bot per business (see
 * TelegramSetupService on the backend). A business pastes in their own bot
 * token; everything else (webhook registration, linking the group) happens
 * automatically or is confirmed by hand, since Telegram gives no API to
 * verify privacy mode or group membership from our side.
 */
function TelegramSection() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  function load() {
    api
      .get<TelegramStatus>('/telegram/me/status')
      .then(setStatus)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSaveToken(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await api.patch<TelegramStatus>('/telegram/me/token', { botToken });
      setStatus(updated);
      setBotToken('');
      setSuccess(t('settings.tgConnected', { username: updated.botUsername ?? '' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm() {
    setError(null);
    setSuccess(null);
    setConfirming(true);
    try {
      const updated = await api.post<TelegramStatus>('/telegram/me/confirm');
      setStatus(updated);
      setSuccess(t('settings.tgMarkedSetUp'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  async function onDisconnect() {
    if (!confirm(t('settings.tgDisconnectConfirm'))) return;
    setError(null);
    setSuccess(null);
    setDisconnecting(true);
    try {
      const updated = await api.delete<TelegramStatus>('/telegram/me/token');
      setStatus(updated);
      setSuccess(t('settings.tgDisconnected'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="max-w-lg">
      <h2 className="mb-2 text-lg font-semibold">{t('settings.telegramTitle')}</h2>
      <p className="mb-4 text-sm text-slate-500">{t('settings.telegramSub')}</p>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded bg-green-50 p-2 text-sm text-green-800">{success}</div>}

        {!loading && status && (
          <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-slate-500">{t('settings.tgBot')}</span>
              <div className="font-medium text-slate-700">{status.hasToken ? `@${status.botUsername}` : t('settings.tgNotConnected')}</div>
            </div>
            <div>
              <span className="text-slate-500">{t('settings.tgGroup')}</span>
              <div className="font-medium text-slate-700">{status.groupLinked ? status.groupTitle || t('settings.tgLinked') : t('settings.tgWaiting')}</div>
            </div>
            <div>
              <span className="text-slate-500">{t('settings.tgSetup')}</span>
              <div className="font-medium text-slate-700">
                {status.confirmedAt
                  ? t('settings.tgConfirmedOn', { date: new Date(status.confirmedAt).toLocaleDateString(locale) })
                  : t('settings.tgNotConfirmed')}
              </div>
            </div>
          </div>
        )}

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          <li>
            {t('settings.tgStep1a')}
            <span className="font-medium text-slate-800">@BotFather</span>
            {t('settings.tgStep1b')}
            <code className="rounded bg-slate-100 px-1 py-0.5">/newbot</code>
            {t('settings.tgStep1c')}
            <code className="rounded bg-slate-100 px-1 py-0.5">123456:ABC-your-token</code>
            {t('settings.tgStep1d')}
          </li>
          <li>{t('settings.tgStep2')}</li>
          <li>
            {t('settings.tgStep3a')}
            <code className="rounded bg-slate-100 px-1 py-0.5">/setprivacy</code>
            {t('settings.tgStep3b')}
            <span className="font-medium text-slate-800">{t('settings.tgStep3disable')}</span>
            {t('settings.tgStep3c')}
          </li>
          <li>{t('settings.tgStep4')}</li>
          <li>{t('settings.tgStep5')}</li>
          <li>{t('settings.tgStep6')}</li>
        </ol>

        <form onSubmit={onSaveToken} className="flex flex-wrap items-end gap-2">
          <label className="block flex-1 text-sm">
            {t('settings.tgBotToken')}
            <input
              type="password"
              placeholder={status?.hasToken ? t('settings.tgTokenPlaceholderNew') : t('settings.tgTokenPlaceholderFrom')}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('settings.tgSave')}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!status?.hasToken || confirming}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            {confirming ? t('common.saving') : t('settings.tgCompletedSteps')}
          </button>
          {status?.hasToken && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {disconnecting ? t('settings.tgDisconnecting') : t('settings.tgDisconnect')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ChangePasswordSection() {
  const t = useI18n().t;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t('settings.pwMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('settings.pwShort'));
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-sm">
      <h2 className="mb-2 text-lg font-semibold">{t('settings.pwTitle')}</h2>
      <p className="mb-4 text-sm text-slate-500">{t('settings.pwSub')}</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="rounded bg-green-50 p-2 text-sm text-green-800">{t('settings.pwChanged')}</div>
        )}

        <label className="block text-sm">
          {t('settings.pwCurrent')}
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          {t('settings.pwNew')}
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          {t('settings.pwConfirm')}
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? t('common.saving') : t('settings.pwSubmit')}
        </button>
      </form>
    </section>
  );
}

export default function Settings() {
  const t = useI18n().t;
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      <BusinessInfoSection />
      <TelegramSection />
      <ChangePasswordSection />
    </div>
  );
}
