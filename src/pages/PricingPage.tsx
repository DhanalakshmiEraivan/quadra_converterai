
import { useState } from 'react';
import { Check, Sparkles, ArrowRight, Star, Zap, Crown, Building2 } from 'lucide-react';
import UPIPaymentQR from '@/components/UPIPaymentQR';

import type {
  PaidPlan,
} from '@/lib/payment-config';
type Props = { navigate: (path: string) => void };

const plans = [
  {
    name: 'Free',
    icon: Sparkles,
    price: 0,
    period: 'forever',
    color: 'from-ink-400 to-ink-600',
    features: ['5 conversions per day', '50 MB max file size', 'Basic tools', 'Standard speed', 'Ads supported'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Starter',
    icon: Zap,
    price: 199,
    period: 'month',
    color: 'from-accent-500 to-accent-700',
    features: ['Unlimited conversions', '500 MB max file size', 'AI OCR included', 'No ads', 'Email support'],
    cta: 'Choose Starter',
    highlight: false,
  },
  {
    name: 'Pro',
    icon: Crown,
    price: 499,
    period: 'month',
    color: 'from-brand-500 to-brand-700',
    features: ['Everything in Starter', '5 GB max file size', 'Priority processing speed', 'API access', 'All AI tools unlocked', 'Priority support'],
    cta: 'Choose Pro',
    highlight: true,
  },
  {
    name: 'Business',
    icon: Building2,
    price: 1999,
    period: 'month',
    color: 'from-fuchsia-500 to-purple-700',
    features: ['Everything in Pro', 'Team management (up to 20)', '100 GB shared storage', 'Admin panel', 'Unlimited API calls', 'White-label option'],
    cta: 'Choose Business',
    highlight: false,
  },
];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes — you can cancel your subscription at any time. You will keep access until the end of your billing period.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards, UPI, net banking, and popular wallets. All payments are processed securely.' },
  { q: 'Do unused conversions roll over?', a: 'On paid plans, unused monthly conversions do not roll over, but AI credits refresh every billing cycle.' },
  { q: 'Is there a free trial for paid plans?', a: 'The Free plan lets you try all basic tools. Paid plans can be cancelled within 7 days for a full refund.' },
  { q: 'How does API access work?', a: 'Pro and Business plans include API access. Generate keys from your dashboard and call our REST endpoints programmatically.' },
];

export function PricingPage({ navigate }: Props) {

  const [yearly, setYearly] =
    useState(false);

  const [openFaq, setOpenFaq] =
    useState<number | null>(0);

  const [
    selectedPaymentPlan,
    setSelectedPaymentPlan
  ] = useState<PaidPlan | null>(null);


  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute -top-20 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="container-page relative py-16 text-center">
          <div className="section-eyebrow mx-auto"><Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing</div>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Choose the plan that fits
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-ink-500">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-ink-100 p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${!yearly ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${yearly ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'}`}
            >
              Yearly
              <span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-xs font-bold text-accent-700">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="container-page py-14">
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((p, i) => {
            const Icon = p.icon;
            const price = yearly ? Math.round(p.price * 12 * 0.8) : p.price;
            return (
              <div
                key={p.name}
                className={`card relative flex flex-col p-6 animate-fade-up ${p.highlight ? 'ring-2 ring-brand-500 shadow-glow lg:-translate-y-3' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-soft">
                    Most popular
                  </span>
                )}
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${p.color} text-white shadow-soft`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-ink-900">₹{price}</span>
                  <span className="text-sm text-ink-400">/{yearly ? 'year' : p.period}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
  onClick={() => {

    if (p.name === 'Free') {
      navigate('/dashboard');
      return;
    }

    setSelectedPaymentPlan(
      p.name.toLowerCase() as PaidPlan
    );

  }}
  className={`mt-6 w-full ${
    p.highlight
      ? 'btn-primary'
      : 'btn-secondary'
  }`}
>
  {p.cta}

  <ArrowRight className="h-4 w-4" />
</button>
              </div>
            );
          })}
        </div>

        {/* Enterprise band */}
        <div className="mt-8 card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink-900">Need a custom enterprise plan?</h3>
              <p className="mt-1 text-sm text-ink-500">Dedicated infrastructure, SSO, custom SLAs, and on-premise options available.</p>
            </div>
            <button className="btn-primary shrink-0">Contact sales <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
      {selectedPaymentPlan && (

  <section className="container-page pb-16">

    <div className="mx-auto max-w-xl">

      <UPIPaymentQR
        plan={selectedPaymentPlan}
        onSubmitted={() => {
          // Payment submitted for verification
        }}
      />

    </div>

  </section>

)}

      {/* Comparison */}
      <section className="container-page py-10">
        <h2 className="font-display text-2xl font-bold text-ink-900 text-center">Compare features</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="py-3 text-left font-semibold text-ink-700">Feature</th>
                <th className="py-3 text-center font-semibold text-ink-700">Free</th>
                <th className="py-3 text-center font-semibold text-ink-700">Starter</th>
                <th className="py-3 text-center font-semibold text-brand-700">Pro</th>
                <th className="py-3 text-center font-semibold text-ink-700">Business</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {[
                ['Daily conversions', '5', 'Unlimited', 'Unlimited', 'Unlimited'],
                ['Max file size', '50 MB', '500 MB', '5 GB', '100 GB'],
                ['AI OCR', '—', 'Yes', 'Yes', 'Yes'],
                ['AI Translation', '—', '—', 'Yes', 'Yes'],
                ['Priority speed', '—', '—', 'Yes', 'Yes'],
                ['API access', '—', '—', 'Yes', 'Unlimited'],
                ['Team management', '—', '—', '—', 'Yes'],
                ['White label', '—', '—', '—', 'Yes'],
                ['Support', 'Community', 'Email', 'Priority', 'Dedicated'],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="py-3 font-medium text-ink-800">{row[0]}</td>
                  {row.slice(1).map((cell, i) => (
                    <td key={i} className="py-3 text-center text-ink-600">{cell === 'Yes' ? <Check className="mx-auto h-4 w-4 text-accent-500" /> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ink-50/50 py-16">
        <div className="container-page">
          <h2 className="text-center font-display text-2xl font-bold text-ink-900">Loved by professionals</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {[
              { name: 'Priya Sharma', role: 'Accountant', text: 'The AI Invoice Reader saves me 3 hours every week. It reads GST, totals, and line items perfectly — then exports straight to Excel.' },
              { name: 'Rahul Verma', role: 'Student', text: 'Chat with PDF is a game-changer for research papers. I ask it to summarize and generate quizzes — it cites the exact pages.' },
              { name: 'Anita Desai', role: 'HR Manager', text: 'Resume Analyzer gives instant ATS scores and tells candidates exactly what to fix. Onboarding new hires is so much smoother now.' },
            ].map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-0.5">
                  {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-warn-400 text-warn-400" />)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-900">{t.name}</p>
                    <p className="text-xs text-ink-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-16">
        <h2 className="text-center font-display text-2xl font-bold text-ink-900">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-bold text-ink-900">{f.q}</span>
                <span className={`text-brand-600 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600 animate-fade-in">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
}
