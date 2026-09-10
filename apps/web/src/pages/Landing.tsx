import { Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

function Icon({ path, className = '' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  sparkles: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  camera: 'M4 8h3l2-2h6l2 2h3v11H4V8Z M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6M9 12h6M9 16h3',
  fileText: 'M7 3h7l4 4v14H7V3Z M14 3v4h4 M9 12h6M9 16h6',
  bell: 'M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z M10 19a2 2 0 0 0 4 0',
  smartphone: 'M8 3h8v18H8V3Z M12 18h.01',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20c0-3 2.5-5 6-5s6 2 6 5 M17 8a2.5 2.5 0 1 1 0 5 M17 13c2.8 0 5 1.6 5 3.6V20h-4',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  check: 'M20 6 9 17l-5-5',
};

function PlanCard({
  name,
  price,
  tagline,
  features,
  highlight = false,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        highlight ? 'border-2 border-indigo-600 shadow-md' : 'border-slate-200'
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{price}</span>
        <span className="text-sm text-slate-500">/month</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{tagline}</p>
      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm text-slate-700">
            <Icon path={ICONS.check} className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`mt-6 rounded-lg px-5 py-2.5 text-center text-sm font-semibold shadow-sm transition-colors ${
          highlight
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Start free
      </Link>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof ICONS;
  title: string;
  children: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon path={ICONS[icon]} className="h-5 w-5" />
      </div>
      <h3 className="mb-1.5 font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="text-lg font-bold tracking-tight">manejoai</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden text-sm font-medium text-slate-600 hover:text-indigo-600 sm:inline">
              Pricing
            </a>
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <Icon path={ICONS.sparkles} className="h-3.5 w-3.5" />
            AI-powered, built for the field
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            The back office for vendors who&apos;d rather be on the job
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Manejoai runs the business side for multifamily and residential vendors — painters, cleaners,
            handymen, and every trade in between — so a low-tech, one-person crew can look, invoice, and grow
            like a company ten times its size.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Start free — no card needed
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">Set up your business in under two minutes.</p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Built for property-services vendors, not office managers
          </h2>
          <p className="mt-3 text-slate-600">
            If your customers are apartment communities, HOAs, property managers, or homeowners — and your real
            job happens on a ladder or under a sink, not behind a keyboard — this is built around how you
            actually work.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.users} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Multifamily &amp; property management</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.smartphone} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Residential &amp; homeowners</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.bolt} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Every trade — solo or growing crew</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Everything runs itself, so you don&apos;t have to</h2>
            <p className="mt-3 text-slate-600">
              No spreadsheets, no chasing paper, no software degree required — just what a growing vendor
              actually needs.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="camera" title="Text in a job, get a job record">
              Send photos and a quick note from the field the way you already text your crew — AI reads it and
              turns it into an organized job, matched to the right property automatically.
            </FeatureCard>
            <FeatureCard icon="fileText" title="Quotes that turn into invoices">
              Build a quote in minutes, get it approved, and it becomes a real invoice with one click — no
              retyping line items twice.
            </FeatureCard>
            <FeatureCard icon="receipt" title="Professional invoices, your brand">
              Every invoice and email goes out under your business's own name and address — polished enough
              for a property management company, simple enough that you built it in a minute.
            </FeatureCard>
            <FeatureCard icon="bell" title="Payment reminders that never forget">
              Overdue invoices get flagged and followed up automatically, grouped by property, so getting paid
              doesn't depend on you remembering to ask.
            </FeatureCard>
            <FeatureCard icon="users" title="Every customer and property in one place">
              One-off homeowners or a management company with fifty buildings - track every customer, property,
              and contact without losing track of who owes what.
            </FeatureCard>
            <FeatureCard icon="sparkles" title="Reports that show you're growing">
              See income by month, by customer, by property, year over year - the numbers a bank or a bigger
              client would want to see, ready whenever you need them.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Simple pricing, one price per business</h2>
            <p className="mt-3 text-slate-600">
              Every plan starts with a 14-day free trial — no card required, and the trial includes everything
              in Pro so you can try the AI assistant before you decide. One flat price covers your whole crew.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            <PlanCard
              name="Basic"
              price="$5"
              tagline="Everything you need to run the business side, start to finish."
              features={[
                'AI job intake — text in photos and a note from the field',
                'Quotes that convert to invoices in one click',
                'Branded invoices and emails under your own name',
                'Automatic payment reminders, grouped by property',
                'Every customer, property, and contact in one place',
                'Income reports by month, customer, property, and year',
              ]}
            />
            <PlanCard
              name="Pro"
              price="$25"
              tagline="Everything in Basic, plus an AI assistant that knows your business."
              highlight
              features={[
                'Everything in Basic',
                'In-app AI assistant — ask about your business in plain English',
                '“What did we do at unit 413?” · “Which invoices are still unpaid?”',
                'Answers pulled straight from your own jobs, quotes, and invoices',
                'More assistant capabilities added over time',
              ]}
            />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">
            Change plans or cancel anytime from your billing page — upgrades take effect immediately and are
            prorated.
          </p>
        </div>
      </section>

      {/* No tech skills needed */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">You don&apos;t need to be a tech person to run a tech-powered business</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Manejoai is built for entrepreneurs who grew a business with a truck and a phone, not a computer
          science degree. If you can send a text message, you can run your whole back office here.
        </p>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-600">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to grow past the notebook and the group chat?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Set up your business for free and send your first professional invoice today.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
            >
              Create your account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-semibold text-slate-700">manejoai</span>
          </div>
          <p>© {new Date().getFullYear()} manejoai. Built for vendors, not spreadsheets.</p>
        </div>
      </footer>
    </div>
  );
}
