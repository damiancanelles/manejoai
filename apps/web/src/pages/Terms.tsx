import { Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';
import LegalFooter from '../components/LegalFooter';
import { SUPPORT_EMAIL } from '../lib/support';

// ============================================================================
// PLACEHOLDER TERMS - NOT FINAL LEGAL TEXT.
//
// Every section below is an outline of what the Terms need to cover, not
// wording to rely on. Replace each [FILL IN: ...] with the real terms (ideally
// reviewed by a lawyer), set the effective date and the legal company name,
// then set IS_DRAFT to false - that removes the yellow "draft" banner.
//
// Same approach as Privacy.tsx: static English, not run through i18n, so
// there's one authoritative version.
// ============================================================================
const IS_DRAFT = true;
const EFFECTIVE_DATE = '[FILL IN: effective date]';
const COMPANY_LEGAL_NAME = '[FILL IN: legal name of the company that sells manejoai]';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function FillIn({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-amber-800">[FILL IN: {children}]</p>;
}

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-lg font-bold tracking-tight text-slate-900">manejoai</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {IS_DRAFT && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Draft.</strong> These Terms of Service are a placeholder and are not yet in effect.
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-500">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          These Terms of Service govern your use of manejoai, provided by {COMPANY_LEGAL_NAME}. Our{' '}
          <Link to="/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy
          </Link>{' '}
          explains how we handle your data.
        </p>

        <Section title="1. Accounts">
          <FillIn>who can sign up, keeping login details safe, responsibility for staff and crew accounts</FillIn>
        </Section>

        <Section title="2. Free trial">
          <FillIn>trial length, what happens when the trial ends without a subscription, whether data is kept</FillIn>
        </Section>

        <Section title="3. Plans, billing and price changes">
          <FillIn>monthly plans and prices, billing through Stripe, automatic renewal, failed payments, notice before price changes, taxes</FillIn>
        </Section>

        <Section title="4. Cancellation and refunds">
          <FillIn>how to cancel, when cancellation takes effect, the refund rule</FillIn>
        </Section>

        <Section title="5. Your data">
          <FillIn>
            the business owns its customer, job and invoice data; what we may do with it to run the service; export
            and deletion when an account closes
          </FillIn>
        </Section>

        <Section title="6. Acceptable use">
          <FillIn>what customers may not do with the service (for example spam, unlawful content, abuse)</FillIn>
        </Section>

        <Section title="7. Emails sent on your behalf">
          <FillIn>invoices and payment reminders go out in the business's name; the business is responsible for who it emails</FillIn>
        </Section>

        <Section title="8. AI features">
          <FillIn>AI suggestions may be wrong and should be checked before use</FillIn>
        </Section>

        <Section title="9. Availability and changes to the service">
          <FillIn>no guarantee of uninterrupted service, changes to features</FillIn>
        </Section>

        <Section title="10. Disclaimers and limitation of liability">
          <FillIn>warranty disclaimer and limit on liability</FillIn>
        </Section>

        <Section title="11. Governing law">
          <FillIn>which state's law applies and where disputes are handled</FillIn>
        </Section>

        <Section title="12. Changes to these terms">
          <FillIn>how customers are told about changes</FillIn>
        </Section>

        <Section title="13. Contact">
          <p>
            Questions about these terms:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <FillIn>mailing address</FillIn>
        </Section>
      </main>

      <LegalFooter />
    </div>
  );
}
