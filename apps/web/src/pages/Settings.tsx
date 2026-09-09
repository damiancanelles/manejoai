import { FormEvent, useState } from 'react';
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
      <ChangePasswordSection />
    </div>
  );
}
