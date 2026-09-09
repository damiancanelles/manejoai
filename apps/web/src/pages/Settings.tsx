import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth, Business } from '../context/AuthContext';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

/**
 * Business name/address/phone shown on this business's own invoices and
 * emails (see Business in AuthContext) - editable here, more settings
 * sections can join it on this same page later.
 */
function BusinessInfoSection() {
  const { business, setBusiness } = useAuth();
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
      <h2 className="mb-2 text-lg font-semibold">Business info</h2>
      <p className="mb-4 text-sm text-slate-500">
        Shown on every invoice and email this business sends.
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded bg-green-50 p-2 text-sm text-green-800">Business info updated.</div>}

        {business && (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Sending address</span>
            <div className="font-medium text-slate-700">{business.emailSlug}@manejoai.cloud</div>
            <p className="mt-1 text-xs text-slate-400">
              Every invoice and reminder email is sent from this address - fixed once your business is created.
            </p>
          </div>
        )}

        <label className="block text-sm">
          Business name
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
          Address
          <input
            required
            placeholder="Street address"
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
            placeholder="City, state, zip (optional)"
            value={addressLine2}
            onChange={(e) => {
              setAddressLine2(e.target.value);
              setSuccess(false);
            }}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          Phone
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
          Reply-to email
          <input
            type="email"
            placeholder="Where replies to invoices/reminders should land"
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
          {submitting ? 'Saving...' : 'Save changes'}
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
      setSuccess(`Connected to @${updated.botUsername}. Now finish the steps below.`);
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
      setSuccess('Marked as set up.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  async function onDisconnect() {
    if (!confirm('Disconnect this bot? Job reports will stop coming in until you connect a new one.')) return;
    setError(null);
    setSuccess(null);
    setDisconnecting(true);
    try {
      const updated = await api.delete<TelegramStatus>('/telegram/me/token');
      setStatus(updated);
      setSuccess('Disconnected.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="max-w-lg">
      <h2 className="mb-2 text-lg font-semibold">Job reports (Telegram)</h2>
      <p className="mb-4 text-sm text-slate-500">
        Let your crew text job photos/updates into a Telegram group and have them show up as Job Reports here,
        ready to turn into real jobs.
      </p>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded bg-green-50 p-2 text-sm text-green-800">{success}</div>}

        {!loading && status && (
          <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-slate-500">Bot</span>
              <div className="font-medium text-slate-700">{status.hasToken ? `@${status.botUsername}` : 'Not connected'}</div>
            </div>
            <div>
              <span className="text-slate-500">Group</span>
              <div className="font-medium text-slate-700">{status.groupLinked ? status.groupTitle || 'Linked' : 'Waiting for a message'}</div>
            </div>
            <div>
              <span className="text-slate-500">Setup</span>
              <div className="font-medium text-slate-700">
                {status.confirmedAt ? `Confirmed ${new Date(status.confirmedAt).toLocaleDateString()}` : 'Not confirmed'}
              </div>
            </div>
          </div>
        )}

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          <li>
            Message <span className="font-medium text-slate-800">@BotFather</span> on Telegram and send{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">/newbot</code> to create a bot (skip this if you
            already have one) - it'll give you a token that looks like{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">123456:ABC-your-token</code>.
          </li>
          <li>Paste that token below and click Save.</li>
          <li>
            Back in @BotFather, send <code className="rounded bg-slate-100 px-1 py-0.5">/setprivacy</code>, pick
            your bot, and choose <span className="font-medium text-slate-800">Disable</span> - otherwise it can
            only see messages that directly @mention it, not ordinary chatter.
          </li>
          <li>Add your bot to the Telegram group your crew reports jobs in, like any other member.</li>
          <li>Send any message in that group - the "Group" status above will pick it up automatically.</li>
          <li>Once all of that's done, click "I've completed these steps" below.</li>
        </ol>

        <form onSubmit={onSaveToken} className="flex flex-wrap items-end gap-2">
          <label className="block flex-1 text-sm">
            Bot token
            <input
              type="password"
              placeholder={status?.hasToken ? 'Enter a new token to replace the current one' : 'From @BotFather'}
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
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!status?.hasToken || confirming}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            {confirming ? 'Saving...' : "I've completed these steps"}
          </button>
          {status?.hasToken && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ChangePasswordSection() {
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
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
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
      <h2 className="mb-2 text-lg font-semibold">Change password</h2>
      <p className="mb-4 text-sm text-slate-500">Just for your own login - doesn't affect anyone else on this business.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="rounded bg-green-50 p-2 text-sm text-green-800">Password changed successfully.</div>
        )}

        <label className="block text-sm">
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          New password
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
          Confirm new password
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
          {submitting ? 'Saving...' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

export default function Settings() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <BusinessInfoSection />
      <TelegramSection />
      <ChangePasswordSection />
    </div>
  );
}
