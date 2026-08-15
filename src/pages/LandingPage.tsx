import { useState } from 'react';
import {
  Sparkles, ArrowRight, Star, ShieldCheck, Zap, Globe, CheckCircle2,
  FileText, Wand2, Languages,
  ScanLine, Play, ChevronRight, TrendingUp, Users, Lock, Cpu,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { UploadZone, type UploadedFile } from '@/components/UploadZone';
import { categories, aiFeatures, tools } from '@/data/tools';

type Props = { navigate: (path: string) => void };

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Icon ?? Icons.FileText;
}

const scanImg = 'https://images.pexels.com/photos/9301887/pexels-photo-9301887.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const videoImg = 'https://images.pexels.com/photos/11063289/pexels-photo-11063289.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const abstractImg = 'https://images.pexels.com/photos/29022333/pexels-photo-29022333.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function LandingPage({ navigate }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -top-10 right-0 h-64 w-64 rounded-full bg-accent-200/30 blur-3xl" />

        <div className="container-page relative pt-16 pb-20 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="section-eyebrow animate-fade-up">
              <Sparkles className="h-3.5 w-3.5" /> 50+ AI-powered tools in one place
            </div>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl animate-fade-up" style={{ animationDelay: '60ms' }}>
              Convert Anything.
              <br />
              Enhance Everything.
              <br />
              <span className="gradient-text">Powered by AI.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-500 animate-fade-up" style={{ animationDelay: '120ms' }}>
              The all-in-one platform for documents, images, video, audio, and more — with AI OCR, enhancement, translation, and smart automation built in.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <div className="flex items-center -space-x-2">
                {[Star, Star, Star, Star, Star].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warn-400 text-warn-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-ink-600">Rated 4.9/5 by 120,000+ users</span>
            </div>
          </div>

          {/* Upload area */}
          <div className="mx-auto mt-12 max-w-3xl animate-fade-up" style={{ animationDelay: '240ms' }}>
            <UploadZone files={files} onFiles={setFiles} />
            {files.length > 0 && (
              <div className="mt-5 flex justify-center">
                <button onClick={() => navigate('/tools')} className="btn-primary">
                  Continue to tools <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Trust bar */}
          <div className="mx-auto mt-16 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-500 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {[
              { icon: ShieldCheck, text: '256-bit encryption' },
              { icon: Zap, text: 'Lightning fast' },
              { icon: Globe, text: 'Works in browser' },
              { icon: Lock, text: 'Auto-delete after 2h' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-accent-500" /> {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Popular tool categories */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Explore tool categories</h2>
            <p className="mt-2 text-ink-500">Nine categories, 50+ tools — find exactly what you need.</p>
          </div>
          <button onClick={() => navigate('/tools')} className="hidden btn-ghost sm:inline-flex">
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const Icon = getIcon(cat.icon);
            const catTools = tools.filter((t) => t.category === cat.id).slice(0, 4);
            const catCount = tools.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/tools/${cat.id}`)}
                className="card-hover group relative overflow-hidden p-5 text-left animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${cat.color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${cat.color} shadow-soft`}>
  <Icon className="h-5 w-5 text-brand-700" />
</span>
                  <div>
                    <h3 className="font-display font-bold text-ink-900">{cat.name}</h3>
                    <p className="text-xs text-ink-400">{catCount} tools</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {catTools.map((t) => (
                    <span key={t.id} className="rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600 ring-1 ring-ink-100">
                      {t.name}
                    </span>
                  ))}
                  <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600">
                    +{catCount - catTools.length} more
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Exclusive Features */}
      <section className="relative overflow-hidden bg-ink-50/50 py-20">
        <div className="absolute inset-0 dotted-bg opacity-40" />
        <div className="container-page relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="section-eyebrow">
              <Sparkles className="h-3.5 w-3.5" /> AI Exclusive Features
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              AI that does the boring parts for you
            </h2>
            <p className="mt-3 text-ink-500">
              From OCR to translation to invoice reading — QuadraConverter AI handles the work that used to take hours.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {aiFeatures.map((f, i) => {
              const Icon = getIcon(f.icon);
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/ai/${f.id}`)}
                  className="card-hover group relative overflow-hidden p-6 text-left animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${f.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} />
                  <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-soft transition-transform group-hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Try it now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Showcase: Chat with PDF */}
      <section className="container-page py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Featured</div>
            <h2 className="mt-5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Chat with any PDF like it's a colleague
            </h2>
            <p className="mt-4 text-ink-500">
              Upload a research paper, contract, or textbook and ask anything. Get summaries, page references, key findings, and generated quizzes — all grounded in the actual document.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Summarize page 10 in three bullets',
                'What are the key findings?',
                'Generate a 5-question quiz from chapter 2',
                'Find the most important topics',
              ].map((q) => (
                <li key={q} className="flex items-start gap-3 text-sm text-ink-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                  {q}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/ai/chat-pdf')} className="btn-primary mt-8">
              <FileText className="h-4 w-4" /> Open Chat with PDF
            </button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-200/40 to-accent-200/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-ink-200">
              <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-err-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warn-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent-400" />
                </div>
                <span className="ml-2 text-xs font-medium text-ink-400">Research.pdf — Chat</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex justify-end">
                  <span className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">
                    Summarize page 10
                  </span>
                </div>
                <div className="flex justify-start">
                  <span className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-100 px-3.5 py-2.5 text-sm text-ink-800">
                    Page 10 covers the methodology: a double-blind study with 240 participants over 12 weeks. Key result — the treatment group showed a 34% improvement (p&lt;0.01) with no significant side effects.
                  </span>
                </div>
                <div className="flex justify-end">
                  <span className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">
                    Generate a quiz from this
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  AI is generating 5 questions…
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase: AI Scanner + Enhancer split */}
      <section className="bg-ink-50/50 py-20">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <div className="card group relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <ScanLine className="h-5 w-5" />
              </span>
              <h3 className="font-display text-xl font-bold text-ink-900">AI Scanner</h3>
            </div>
            <p className="mt-3 text-sm text-ink-500">Upload a photo of any document. AI detects edges, removes shadows, brightens, crops, and exports a crisp PDF.</p>
            <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-ink-200">
              <img src={scanImg} alt="Document scanning" className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {['Detects edges', 'Removes shadows', 'Brightens', 'Crops & PDF'].map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-ink-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-500" /> {s}
                </span>
              ))}
            </div>
            <button onClick={() => navigate('/ai/ai-scanner')} className="btn-secondary mt-5 w-full">
              Try AI Scanner <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="card group relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white">
                <Wand2 className="h-5 w-5" />
              </span>
              <h3 className="font-display text-xl font-bold text-ink-900">AI Image Enhancer</h3>
            </div>
            <p className="mt-3 text-sm text-ink-500">Upscale low-quality photos to HD, 4K, and 8K while reconstructing fine detail.</p>
            <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-ink-200">
              <img src={abstractImg} alt="AI enhancement" className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-semibold">
              {['Low', 'HD', '4K', '8K'].map((q, i) => (
                <span key={q} className={`rounded-md px-2 py-1 ${i === 3 ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'}`}>{q}</span>
              ))}
            </div>
            <button onClick={() => navigate('/ai/ai-enhancer')} className="btn-secondary mt-5 w-full">
              Try AI Enhancer <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* AI Translation showcase */}
      <section className="container-page py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-sky-200/40 to-brand-200/30 blur-2xl" />
              <div className="relative space-y-3">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Source — English</span>
                    <Languages className="h-4 w-4 text-brand-500" />
                  </div>
                  <p className="mt-2 text-sm text-ink-700">The quarterly report shows a 23% increase in revenue, driven primarily by international sales growth.</p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 rotate-90 text-brand-500" />
                </div>
                <div className="card border-brand-200 p-4 ring-brand-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">Translated — Japanese</span>
                    <CheckCircle2 className="h-4 w-4 text-accent-500" />
                  </div>
                  <p className="mt-2 text-sm text-ink-700">四半期報告書は、主に国際的な売上成長によって推進され、収益が23%増加したことを示しています。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['English', 'Tamil', 'Hindi', 'French', 'Japanese', '+40 more'].map((l) => (
                    <span key={l} className="chip">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="section-eyebrow"><Languages className="h-3.5 w-3.5" /> AI Translation</div>
            <h2 className="mt-5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Translate documents without breaking the layout
            </h2>
            <p className="mt-4 text-ink-500">
              Upload a PDF in English and get it back in Tamil, Hindi, French, Japanese, or 40+ other languages — formatting, tables, and images all preserved.
            </p>
            <button onClick={() => navigate('/ai/ai-translation')} className="btn-primary mt-8">
              <Languages className="h-4 w-4" /> Try AI Translation
            </button>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-ink-200 bg-white py-14">
        <div className="container-page grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, value: '120K+', label: 'Active users' },
            { icon: FileText, value: '8.4M', label: 'Files converted' },
            { icon: TrendingUp, value: '99.2%', label: 'OCR accuracy' },
            { icon: Cpu, value: '50+', label: 'AI tools' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <Icon className="mx-auto h-6 w-6 text-brand-500" />
              <p className="mt-2 font-display text-3xl font-extrabold text-ink-900">{value}</p>
              <p className="text-sm text-ink-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Video tools teaser */}
      <section className="container-page py-20">
        <div className="card relative overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="relative min-h-[280px] overflow-hidden">
              <img src={videoImg} alt="Video editing" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-900/40 to-transparent" />
              <button
                onClick={() => navigate('/tools/video')}
                className="group absolute inset-0 grid place-items-center"
              >
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/90 shadow-float transition-transform group-hover:scale-110">
                  <Play className="ml-1 h-7 w-7 fill-brand-600 text-brand-600" />
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/60" />
                </span>
              </button>
            </div>
            <div className="p-8 lg:p-10">
              <div className="section-eyebrow"><FileText className="h-3.5 w-3.5" /> Video & Audio</div>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                Compress, convert, trim, and caption — all in the browser
              </h2>
              <p className="mt-3 text-ink-500">
                From MP4 to MP3, video to GIF, AI subtitle generation, noise removal, and podcast cleanup — your full media toolkit.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Video Compressor', 'MP4 → MP3', 'Video → GIF', 'Trim Video', 'AI Captions', 'Noise Removal'].map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
              <button onClick={() => navigate('/tools/video')} className="btn-primary mt-7">
                Explore media tools <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-accent-600 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Ready to convert smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-brand-100">
              Join 120,000+ users who convert, enhance, and automate with QuadraConverter AI.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigate('/tools')} className="btn bg-white text-brand-700 hover:bg-brand-50">
                Start free <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/pricing')} className="btn bg-brand-700/40 text-white ring-1 ring-white/30 hover:bg-brand-700/60">
                View pricing
              </button>
            </div>
            <p className="mt-5 text-xs text-brand-200">No credit card required · 5 free conversions per day</p>
          </div>
        </div>
      </section>
    </div>
  );
}
