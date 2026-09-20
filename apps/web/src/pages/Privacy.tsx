import { Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

// Static English legal text, not run through the app's i18n dictionary -
// unlike the rest of the UI, a policy like this needs one authoritative
// version rather than a maintained translation, and it needs to read
// correctly for Apple/Google review regardless of device language. Update
// the effective date whenever the substance of this page changes.
const EFFECTIVE_DATE = 'September 20, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-lg font-bold tracking-tight text-slate-900">manejoai</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          manejoai ("manejoai," "we," "us") provides scheduling, invoicing, and job-tracking software for
          property-services businesses (painting, cleaning, maintenance, and similar trades), available on the web
          and as iOS/Android apps. This policy explains what information we collect through the app and website
          (manejoai.cloud and the manejoai mobile app), and how it's used.
        </p>

        <Section title="Who this applies to">
          <p>
            A business ("Customer") signs up for manejoai and creates accounts for its own staff and crew members
            ("Users"). manejoai acts on the Customer's behalf to store and process the data described below. If
            you're a User invited by a business, that business controls your account - contact them directly for
            questions about your data, or reach us at the address below and we'll direct you appropriately.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong>Account information.</strong> Name, email address, and password (stored as a salted hash, never
            in plain text) for every staff, admin, and crew account.
          </p>
          <p>
            <strong>Business and customer data a Customer enters.</strong> Business name, address, and contact
            details; the Customer's own customers/properties/contacts; jobs, quotes, and invoices; payment records
            (amounts and dates - manejoai does not store card numbers, see Payments below).
          </p>
          <p>
            <strong>Job photos.</strong> Photos attached to a job or a crew member's job report, uploaded from the
            app's camera or photo library.
          </p>
          <p>
            <strong>Time-clock data.</strong> Clock-in/clock-out timestamps for crew accounts that use that feature.
            manejoai does not collect GPS or location data as part of clocking in or out.
          </p>
          <p>
            <strong>Telegram messages (optional).</strong> If a Customer connects their own Telegram bot for job
            reports, messages and photos sent to that group are processed to suggest a job title/description.
          </p>
          <p>
            <strong>Push notification token.</strong> A device token (from Apple/Google's push services, via Expo) so
            the app can send notifications to your device. We do not use this to track you outside the app.
          </p>
          <p>
            <strong>Usage/device information.</strong> Standard technical data any web server or mobile app receives
            (IP address, device/browser type, timestamps of requests) for security and reliability, not for
            advertising.
          </p>
        </Section>

        <Section title="How we use this information">
          <p>
            To provide the app's core functionality: authenticate you, store and display your business's jobs/
            customers/invoices, send invoices and payment reminders on the Customer's behalf, process the AI
            assistant's requests (Pro plan), and send transactional emails and push notifications you or your
            business have opted into. We do not sell personal information, and we do not use your data to serve
            third-party advertising.
          </p>
        </Section>

        <Section title="AI features">
          <p>
            manejoai's Pro plan includes an AI assistant, and job reports (from Telegram or the crew app) are
            processed by Anthropic's Claude API to suggest a title, description, and property match. Anthropic
            processes this data to generate the response and does not use it to train its models. See{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              Anthropic's privacy policy
            </a>{' '}
            for details on their handling of data sent to the API.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Subscription billing is handled by Stripe. manejoai never receives or stores your card number - Stripe
            collects it directly and gives us only a subscription status and renewal date. See{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              Stripe's privacy policy
            </a>
            .
          </p>
        </Section>

        <Section title="Where data is stored">
          <p>
            Application data is stored in a PostgreSQL database and, for photos, object storage - both hosted by
            third-party infrastructure providers in the United States. Data is encrypted in transit (HTTPS/TLS).
          </p>
        </Section>

        <Section title="Data retention and deletion">
          <p>
            We retain data for as long as a Customer's account is active, so their business records stay available.
            A crew account that's removed is deactivated rather than deleted, so the business's own job-report and
            time-clock history stays intact, but the deactivated person can no longer log in. To request deletion of
            your business's data entirely, contact us at the address below.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can update your account's name, email, and password from Settings at any time. Push notifications
            can be disabled from your device's system settings. To close your business's account, contact us.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>manejoai is a business tool and is not directed at, or knowingly used by, children under 16.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make a material change to this policy, we'll update the effective date above and, where required,
            notify Customers by email.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data:{' '}
            <a href="mailto:privacy@manejoai.cloud" className="text-indigo-600 hover:underline">
              privacy@manejoai.cloud
            </a>
          </p>
        </Section>
      </main>
    </div>
  );
}
