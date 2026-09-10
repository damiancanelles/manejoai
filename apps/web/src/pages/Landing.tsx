import { Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';
import { useT } from '../i18n';

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
  perMonth,
  tagline,
  features,
  mostPopular,
  startFree,
  highlight = false,
}: {
  name: string;
  price: string;
  perMonth: string;
  tagline: string;
  features: string[];
  mostPopular: string;
  startFree: string;
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
          {mostPopular}
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{price}</span>
        <span className="text-sm text-slate-500">{perMonth}</span>
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
        {startFree}
      </Link>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: keyof typeof ICONS;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon path={ICONS[icon]} className="h-5 w-5" />
      </div>
      <h3 className="mb-1.5 font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

export default function Landing() {
  const t = useT();
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
              {t('landing.nav.pricing')}
            </a>
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              {t('landing.nav.login')}
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {t('landing.nav.signup')}
            </Link>
            <LangToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <Icon path={ICONS.sparkles} className="h-3.5 w-3.5" />
            {t('landing.hero.badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t('landing.hero.title')}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{t('landing.hero.subtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {t('landing.hero.ctaPrimary')}
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('landing.hero.ctaLogin')}
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">{t('landing.hero.note')}</p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.who.title')}</h2>
          <p className="mt-3 text-slate-600">{t('landing.who.body')}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.users} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">{t('landing.who.tag1')}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.smartphone} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">{t('landing.who.tag2')}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon path={ICONS.bolt} className="h-6 w-6 shrink-0 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">{t('landing.who.tag3')}</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.features.title')}</h2>
            <p className="mt-3 text-slate-600">{t('landing.features.subtitle')}</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="camera" title={t('landing.features.intake.title')} body={t('landing.features.intake.body')} />
            <FeatureCard icon="fileText" title={t('landing.features.quotes.title')} body={t('landing.features.quotes.body')} />
            <FeatureCard icon="receipt" title={t('landing.features.invoices.title')} body={t('landing.features.invoices.body')} />
            <FeatureCard icon="bell" title={t('landing.features.reminders.title')} body={t('landing.features.reminders.body')} />
            <FeatureCard icon="users" title={t('landing.features.customers.title')} body={t('landing.features.customers.body')} />
            <FeatureCard icon="sparkles" title={t('landing.features.growth.title')} body={t('landing.features.growth.body')} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.pricing.title')}</h2>
            <p className="mt-3 text-slate-600">{t('landing.pricing.subtitle')}</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            <PlanCard
              name={t('landing.pricing.basic.name')}
              price="$5"
              perMonth={t('landing.pricing.perMonth')}
              mostPopular={t('landing.pricing.mostPopular')}
              startFree={t('landing.pricing.startFree')}
              tagline={t('landing.pricing.basic.tagline')}
              features={[
                t('landing.pricing.basic.f1'),
                t('landing.pricing.basic.f2'),
                t('landing.pricing.basic.f3'),
                t('landing.pricing.basic.f4'),
                t('landing.pricing.basic.f5'),
                t('landing.pricing.basic.f6'),
              ]}
            />
            <PlanCard
              name={t('landing.pricing.pro.name')}
              price="$25"
              perMonth={t('landing.pricing.perMonth')}
              mostPopular={t('landing.pricing.mostPopular')}
              startFree={t('landing.pricing.startFree')}
              tagline={t('landing.pricing.pro.tagline')}
              highlight
              features={[
                t('landing.pricing.pro.f1'),
                t('landing.pricing.pro.f2'),
                t('landing.pricing.pro.f3'),
                t('landing.pricing.pro.f4'),
                t('landing.pricing.pro.f5'),
              ]}
            />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">{t('landing.pricing.footnote')}</p>
        </div>
      </section>

      {/* No tech skills needed */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.noTech.title')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t('landing.noTech.body')}</p>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-600">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('landing.cta.title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">{t('landing.cta.body')}</p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
            >
              {t('landing.cta.button')}
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
          <p>{t('landing.footer.tagline', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
