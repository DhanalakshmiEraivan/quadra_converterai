import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Sparkles, ArrowRight, ChevronRight, X, Zap, ShieldCheck, Clock, Star, Wand2, Layers3, FileCheck2, Gauge } from 'lucide-react';
import * as Icons from 'lucide-react';
import { categories, tools, type Tool } from '@/data/tools';

type Props = {
  navigate: (path: string) => void;
  category?: string;
};

const HERO_IMG = 'https://images.pexels.com/photos/17018372/pexels-photo-17018372.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const HERO_IMG_2 = 'https://images.pexels.com/photos/6135955/pexels-photo-6135955.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const CATEGORY_IMAGES: Record<string, string> = {
  image: 'https://images.pexels.com/photos/30105086/pexels-photo-30105086.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  pdf: 'https://images.pexels.com/photos/7054757/pexels-photo-7054757.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  text: 'https://images.pexels.com/photos/7414277/pexels-photo-7414277.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  dev: 'https://images.pexels.com/photos/17279854/pexels-photo-17279854.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  convert: 'https://images.pexels.com/photos/8473782/pexels-photo-8473782.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  qr: 'https://images.pexels.com/photos/17771096/pexels-photo-17771096.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  color: 'https://images.pexels.com/photos/7675031/pexels-photo-7675031.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  calc: 'https://images.pexels.com/photos/7681493/pexels-photo-7681493.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  security: 'https://images.pexels.com/photos/4792285/pexels-photo-4792285.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
};

function Badge({ type }: { type: NonNullable<Tool['badge']> }) {
  const styles: Record<string, string> = {
    AI: 'bg-brand-50 text-brand-700 ring-brand-200',
    New: 'bg-accent-50 text-accent-700 ring-accent-200',
    Pro: 'bg-warn-50 text-warn-600 ring-warn-200',
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${styles[type]}`}>{type}</span>;
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Icon ?? Icons.FileText;
}

export function ToolsPage({ navigate, category }: Props) {
  const [activeCat, setActiveCat] = useState<string>(category ?? 'all');
  const [query, setQuery] = useState('');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = tools;
    if (activeCat !== 'all') list = list.filter((t) => t.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, query]);

  const activeCategory = categories.find((c) => c.id === activeCat);
  const visibleTools = showAll ? filtered : filtered.slice(0, 24);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
          }
        });
      },
      { threshold: 0.1 }
    );
    const cards = containerRef.current?.querySelectorAll('.tool-card');
    cards?.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [visibleTools]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-ink-900/90 via-ink-900/80 to-brand-900/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-50 via-transparent to-transparent" />
        </div>
        <div className="relative container-page py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 animate-fade-up">
              <Sparkles className="h-4 w-4 text-accent-400" />
              {tools.length}+ professional tools, all free
            </div>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl animate-fade-up" style={{ animationDelay: '100ms' }}>
              Every tool you need,
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">beautifully crafted</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300 animate-fade-up" style={{ animationDelay: '200ms' }}>
              Convert, edit, and transform files with precision. From PDF merging to image compression, QR codes to JSON formatting — all running instantly in your browser.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '300ms' }}>
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a tool…"
                  className="w-full rounded-2xl border border-white/10 bg-white/95 py-3.5 pl-12 pr-4 text-base text-ink-900 shadow-2xl outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
                />
              </div>
              <button onClick={() => navigate('/pricing')} className="btn-primary shrink-0 rounded-2xl px-6 py-3.5 text-base">
                Get Pro <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-400 animate-fade-up" style={{ animationDelay: '400ms' }}>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-400" /> 100% private</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent-400" /> Instant results</span>
              <span className="flex items-center gap-2"><Star className="h-4 w-4 text-accent-400" /> No signup needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatItem value={String(tools.length)} label="Tools available" />
            <StatItem value="9" label="Categories" />
            <StatItem value="100%" label="Browser-based" />
            <StatItem value="0" label="Files uploaded to server" />
          </div>
        </div>
      </section>

      <div className="container-page py-10" ref={containerRef}>
        {/* Category Pills */}
        <div className="sticky top-0 z-20 -mx-4 mb-8 bg-white/80 px-4 py-3 backdrop-blur-lg">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCat('all')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeCat === 'all' ? 'bg-ink-900 text-white shadow-lg' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300'}`}
            >
              <Icons.LayoutGrid className="h-4 w-4" />
              All Tools <span className="opacity-60">{tools.length}</span>
            </button>
            {categories.map((c) => {
              const Icon = getIcon(c.icon);
              const count = tools.filter((t) => t.category === c.id).length;
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${active ? 'bg-ink-900 text-white shadow-lg' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {c.name}
                  <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Hero Banner */}
        {activeCategory && activeCat !== 'all' && (
          <div className="mb-8 relative overflow-hidden rounded-3xl border border-ink-200 animate-fade-up">
            <div className="relative h-40 sm:h-48">
              <img
                src={CATEGORY_IMAGES[activeCat] || HERO_IMG_2}
                alt={activeCategory.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-transparent" />
              <div className="relative flex h-full items-center px-6 sm:px-10">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-white shadow-lg">
                      {(() => { const I = getIcon(activeCategory.icon); return <I className="h-6 w-6" />; })()}
                    </span>
                    <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{activeCategory.name}</h2>
                  </div>
                  <p className="mt-2 max-w-lg text-sm text-ink-300">{activeCategory.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        {filtered.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-ink-100 text-ink-400">
              <Search className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-ink-700">No tools match your search</p>
            <p className="mt-1 text-sm text-ink-500">Try a different keyword or browse all tools</p>
            <button onClick={() => { setQuery(''); setActiveCat('all'); }} className="btn-secondary mt-4">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-500">
                Showing <span className="font-bold text-ink-900">{visibleTools.length}</span> of {filtered.length} tools
                {activeCategory ? ` in ${activeCategory.name}` : ''}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTools.map((t, i) => {
                const Icon = getIcon(t.icon);
                const cat = categories.find((c) => c.id === t.category)!;
                const isHovered = hoveredTool === t.id;
                return (
                  <div
                    key={t.id}
                    className="tool-card group relative opacity-0 translate-y-4"
                    onMouseEnter={() => setHoveredTool(t.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    style={{ animationDelay: `${Math.min(i * 40, 600)}ms` }}
                  >
                    <button
                      onClick={() => navigate(`/tool/${t.id}`)}
                      className="card-hover relative flex h-full w-full flex-col overflow-hidden p-5 text-left"
                    >
                      {/* Gradient glow on hover */}
                      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-ink-800 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-10" />

                      <div className="relative flex items-start justify-between">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl">
                          <Icon className="h-6 w-6" />
                        </span>
                        {t.badge && <Badge type={t.badge} />}
                      </div>

                      <h3 className="relative mt-4 font-display font-bold text-ink-900 transition-colors group-hover:text-brand-700">{t.name}</h3>
                      <p className="relative mt-1.5 text-sm leading-relaxed text-ink-500 line-clamp-2">{t.description}</p>

                      {/* Hover detail bar */}
                      <div className={`relative mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                        <Zap className="h-3.5 w-3.5" />
                        Open tool
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>

                    {/* Floating Detail Tooltip */}
                    {isHovered && t.details && (
                      <div
                        className="pointer-events-none absolute z-30 w-72 animate-fade-up"
                        style={{
                          left: Math.min(mousePos.x + 20, 200),
                          top: mousePos.y - 80,
                        }}
                      >
                        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-800 text-white">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <p className="font-display text-sm font-bold text-ink-900">{t.name}</p>
                          </div>
                          <p className="text-xs leading-relaxed text-ink-600">{t.details}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500">{t.outputFormat}</span>
                            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500">{t.inputType}</span>
                          </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute -left-1.5 top-8 h-3 w-3 rotate-45 border-l border-b border-ink-200 bg-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!showAll && filtered.length > 24 && (
              <div className="mt-10 text-center">
                <button onClick={() => setShowAll(true)} className="btn-secondary px-8 py-3 text-base">
                  Show all {filtered.length} tools <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-14">
          <div className="section-eyebrow"><Wand2 className="h-3.5 w-3.5" /> Advanced workspace</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink-900">Professional conversion features</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">Batch workflows, structure-aware PDF extraction, real Office rendering, OCR-ready tools, previews, history, and secure QR/UPI plan activation.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={Layers3} title="Batch processing" desc="Handle multi-file PDF and image workflows with one action." />
            <FeatureCard icon={FileCheck2} title="Structure-aware PDF" desc="Extract text blocks and tables instead of renaming file extensions." />
            <FeatureCard icon={Gauge} title="Real Office engine" desc="DOCX, PPTX and XLSX to PDF uses LibreOffice for reliable rendering." />
            <FeatureCard icon={ShieldCheck} title="Server-authoritative usage" desc="Credits and UPI subscriptions are enforced by Supabase." />
          </div>
        </div>

        {/* Feature CTA */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={ShieldCheck}
            title="Privacy First"
            desc="Browser tools stay local; layout-sensitive Office conversions use the conversion server."
          />
          <FeatureCard
            icon={Clock}
            title="Instant Results"
            desc="Fast local tools run instantly; complex Office/PDF conversions use a dedicated engine."
          />
          <FeatureCard
            icon={Sparkles}
            title="AI-Powered"
            desc="Smart tools with OCR, translation, and intelligent document analysis."
          />
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 card relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent-200/30 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink-800 text-white shadow-glow">
                <Sparkles className="h-7 w-7" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink-900">Ready to supercharge your workflow?</h3>
                <p className="mt-1 text-sm text-ink-500">Access all {tools.length}+ tools with a Pro account. No limits, no ads.</p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => navigate('/pricing')} className="btn-primary">
                View Pricing <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/auth')} className="btn-secondary">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/60 backdrop-blur-sm animate-fade-up" onClick={() => setSelectedTool(null)}>
          <div className="mx-4 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getIcon(selectedTool.icon);
                  const cat = categories.find((c) => c.id === selectedTool.category)!;
                  return (
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                  );
                })()}
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900">{selectedTool.name}</h3>
                  <p className="text-xs text-ink-500 capitalize">{selectedTool.category} · {selectedTool.outputFormat}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTool(null)} className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 hover:bg-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">{selectedTool.details || selectedTool.description}</p>
            <button onClick={() => navigate(`/tool/${selectedTool.id}`)} className="btn-primary mt-5 w-full">
              Open Tool <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="font-display text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card group p-5">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-800 text-white shadow-lg transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{desc}</p>
    </div>
  );
}
