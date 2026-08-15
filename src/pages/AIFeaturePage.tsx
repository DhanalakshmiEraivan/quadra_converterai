import { useState } from 'react';
import {
  ArrowRight, Sparkles, Send,
  CheckCircle2, UploadCloud,
  Download, RefreshCw, TrendingUp, AlertCircle, Lightbulb,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { UploadZone, type UploadedFile } from '@/components/UploadZone';
import { aiFeatures, type AIFeature } from '@/data/tools';

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Icon ?? Icons.FileText;
}

type Props = {
  feature: AIFeature;
  navigate: (path: string) => void;
};

type ChatMsg = { role: 'user' | 'ai'; text: string };

export function AIFeaturePage({ feature, navigate }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [stage, setStage] = useState<'upload' | 'result'>('upload');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const Icon = getIcon(feature.icon);

  const sampleQuestions = [
    'Summarize this document in 3 bullets',
    'What are the key findings?',
    'Generate a 5-question quiz',
    'Find the most important topics',
  ];

  const sendQuestion = (q: string) => {
    if (!q.trim()) return;
    const userMsg: ChatMsg = { role: 'user', text: q };
    setChat((c) => [...c, userMsg]);
    setInput('');
    setProcessing(true);
    setTimeout(() => {
      const responses: Record<string, string> = {
        'summarize': 'Here are the key points:\n• The study ran over 12 weeks with 240 participants in a double-blind setup.\n• The treatment group showed a 34% improvement (p<0.01).\n• No significant side effects were reported across the cohort.',
        'key findings': 'The main findings are:\n1. 34% improvement in the primary metric (p<0.01)\n2. Strong effect in the 18-35 age group\n3. Minimal adverse events — comparable to placebo\n4. Cost-effectiveness ratio improved by 2.1x',
        'quiz': '1. What was the sample size? (A) 120 (B) 240 (C) 480\n2. How long was the study? (A) 6 weeks (B) 12 weeks (C) 24 weeks\n3. What was the improvement percentage? (A) 24% (B) 34% (C) 44%\n4. Was the study double-blind? (Yes/No)\n5. Were side effects significant? (Yes/No)',
        'important': 'The most important topics are:\n• Methodology (pages 8-11)\n• Statistical analysis (pages 12-14)\n• Limitations and future work (page 18)\n• Clinical implications (page 19)',
      };
      const key = Object.keys(responses).find((k) => q.toLowerCase().includes(k)) ?? 'default';
      const answer = responses[key] ?? `Based on the document, here's what I found regarding "${q}": the content suggests several relevant insights. The AI has analyzed all pages and cross-referenced the key sections to provide this answer.`;
      setChat((c) => [...c, { role: 'ai', text: answer }]);
      setProcessing(false);
    }, 1400);
  };

  const isChat = feature.id === 'chat-pdf';

  // Simulated extraction results for non-chat features
  const runAI = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStage('result');
    }, 1800);
  };

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <button onClick={() => navigate('/')} className="hover:text-brand-600">Home</button>
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-ink-700">{feature.title}</span>
      </div>

      {/* Header */}
      <div className="mt-5 flex items-center gap-4">
        <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-soft`}>
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink-900">{feature.title}</h1>
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">AI</span>
          </div>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-500">{feature.description}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isChat ? (
            <div className="card flex h-[600px] flex-col">
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-900">AI Document Assistant</p>
                    <p className="text-xs text-ink-400">{files[0]?.file.name ?? 'No document loaded'}</p>
                  </div>
                </div>
                <button onClick={() => { setFiles([]); setChat([]); setStage('upload'); }} className="btn-ghost text-xs">
                  <RefreshCw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>

              {/* Chat area */}
              <div className="flex-1 overflow-y-auto scroll-soft p-5">
                {files.length === 0 ? (
                  <div className="flex h-full flex-col">
                    <div className="flex-1" />
                    <UploadZone files={files} onFiles={setFiles} accept="application/pdf" multiple={false} compact title="Upload a PDF to start chatting" />
                    <div className="flex-1" />
                  </div>
                ) : chat.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <p className="mt-4 font-display text-lg font-bold text-ink-900">Ask anything about your document</p>
                    <p className="mt-1 text-sm text-ink-500">Try one of these to get started:</p>
                    <div className="mt-5 grid w-full max-w-sm gap-2">
                      {sampleQuestions.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendQuestion(q)}
                          className="rounded-xl bg-ink-50 px-4 py-2.5 text-left text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chat.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                        <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-ink-100 text-ink-800'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {processing && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-ink-100 px-4 py-3">
                          {[0, 1, 2].map((d) => (
                            <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${d * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              {files.length > 0 && (
                <div className="border-t border-ink-100 p-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question about your document…"
                      className="input flex-1"
                    />
                    <button type="submit" disabled={!input.trim() || processing} className="btn-primary">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : stage === 'upload' ? (
            <div className="card p-6">
              <UploadZone files={files} onFiles={setFiles} accept="image/*,application/pdf" multiple={false} />
              <button
                onClick={runAI}
                disabled={!files.some((f) => f.status === 'done') || processing}
                className="btn-primary mt-6 w-full sm:w-auto"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> AI is analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Run AI
                  </>
                )}
              </button>
            </div>
          ) : (
            <ResultView feature={feature} onReset={() => { setFiles([]); setStage('upload'); }} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-800">
              <Lightbulb className="h-4 w-4 text-warn-500" /> What it does
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.description}</p>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink-800">AI capabilities</h3>
            <ul className="mt-3 space-y-2">
              {getCapabilities(feature.id).map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-ink-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" /> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink-800">More AI features</h3>
            <div className="mt-3 space-y-1.5">
              {aiFeatures.filter((f) => f.id !== feature.id).slice(0, 6).map((f) => {
                const FIcon = getIcon(f.icon);
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/ai/${f.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-600 hover:bg-ink-50"
                  >
                    <FIcon className="h-4 w-4 text-ink-400" />
                    <span className="truncate">{f.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCapabilities(id: string): string[] {
  const map: Record<string, string[]> = {
    'chat-pdf': ['Understands the full document', 'Cites page references', 'Generates quizzes', 'Finds key topics'],
    'ai-ocr': ['Reads blurry & skewed text', 'Recognizes handwriting', 'Handles receipts & invoices', 'Multi-language support'],
    'ai-scanner': ['Edge detection', 'Shadow removal', 'Auto-brightness', 'Crops & exports PDF'],
    'ai-enhancer': ['Upscales to 8K', 'Reconstructs detail', 'Improves color & lighting', 'Reduces noise'],
    'ai-translation': ['Keeps original layout', '40+ languages', 'Preserves tables & images', 'Batch support'],
    'ai-resume': ['ATS score', 'Missing skills detection', 'Keyword optimization', 'Download improved version'],
    'ai-invoice': ['Extracts company & GST', 'Reads line items', 'Calculates totals', 'Exports to Excel'],
    'ai-table': ['Detects table structure', 'Rebuilds rows & columns', 'Exports to Excel', 'Handles merged cells'],
    'ai-receipt': ['Categorizes expenses', 'Reads merchant & total', 'Organizes by date', 'Export expense report'],
    'ai-signature': ['Detects signed regions', 'Flags unsigned docs', 'Counts multiple signatures', 'Audit-ready output'],
  };
  return map[id] ?? ['AI-powered analysis', 'Fast and accurate', 'Secure processing'];
}

function ResultView({ feature, onReset }: { feature: AIFeature; onReset: () => void }) {
  const Icon = getIcon(feature.icon);

  if (feature.id === 'ai-resume') {
    return (
      <div className="card p-6 animate-scale-in">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${feature.accent} text-white`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">Resume Analysis</h3>
            <p className="text-sm text-ink-500">AI scan complete</p>
          </div>
        </div>

        {/* ATS Score */}
        <div className="mt-6 rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-5 ring-1 ring-brand-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">ATS Compatibility Score</span>
            <span className="font-display text-3xl font-extrabold text-brand-600">78<span className="text-lg text-ink-400">/100</span></span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: '78%' }} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-err-50/50 p-4 ring-1 ring-err-100">
            <h4 className="flex items-center gap-2 text-sm font-bold text-err-600"><AlertCircle className="h-4 w-4" /> Missing Skills</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['TypeScript', 'AWS', 'Docker', 'CI/CD'].map((s) => (
                <span key={s} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-err-600 ring-1 ring-err-200">{s}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-accent-50/50 p-4 ring-1 ring-accent-100">
            <h4 className="flex items-center gap-2 text-sm font-bold text-accent-700"><TrendingUp className="h-4 w-4" /> Found Keywords</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['React', 'Python', 'SQL', 'Leadership', 'Agile'].map((s) => (
                <span key={s} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-accent-700 ring-1 ring-accent-200">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-ink-50 p-4">
          <h4 className="text-sm font-bold text-ink-800">Suggestions</h4>
          <ul className="mt-2 space-y-2 text-sm text-ink-600">
            <li>• Add a "Technical Skills" section with TypeScript and AWS</li>
            <li>• Quantify achievements — e.g. "reduced load time by 40%"</li>
            <li>• Use more keywords from the job description</li>
            <li>• Keep bullet points to 1-2 lines each</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary"><Download className="h-4 w-4" /> Download Improved Resume</button>
          <button onClick={onReset} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Scan another</button>
        </div>
      </div>
    );
  }

  if (feature.id === 'ai-invoice' || feature.id === 'ai-receipt') {
    const fields = feature.id === 'ai-invoice'
      ? [
          { label: 'Company', value: 'Acme Corp Pvt Ltd' },
          { label: 'GST Number', value: '27AABCU9603R1ZJ' },
          { label: 'Invoice Date', value: '2026-07-28' },
          { label: 'Invoice No.', value: 'INV-2026-0847' },
        ]
      : [
          { label: 'Merchant', value: 'The Coffee House' },
          { label: 'Date', value: '2026-07-28' },
          { label: 'Category', value: 'Restaurant' },
          { label: 'Payment', value: 'Card ending 4242' },
        ];
    const items = feature.id === 'ai-invoice'
      ? [
          { desc: 'Consulting services', qty: 1, price: '₹45,000' },
          { desc: 'Software license (annual)', qty: 1, price: '₹12,000' },
          { desc: 'On-site support', qty: 2, price: '₹8,000' },
        ]
      : [
          { desc: 'Cappuccino', qty: 2, price: '₹280' },
          { desc: 'Croissant', qty: 1, price: '₹190' },
          { desc: 'Service charge', qty: 1, price: '₹47' },
        ];
    return (
      <div className="card p-6 animate-scale-in">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${feature.accent} text-white`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">{feature.title} — Extracted Data</h3>
            <p className="text-sm text-ink-500">AI extraction complete with 99.2% confidence</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label} className="rounded-xl bg-ink-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{f.label}</p>
              <p className="mt-1 text-sm font-semibold text-ink-800">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5 text-center">Qty</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((it) => (
                <tr key={it.desc}>
                  <td className="px-4 py-2.5 text-ink-700">{it.desc}</td>
                  <td className="px-4 py-2.5 text-center text-ink-600">{it.qty}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-ink-800">{it.price}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-ink-50">
              <tr>
                <td className="px-4 py-2.5 font-bold text-ink-800" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-brand-700">
                  {feature.id === 'ai-invoice' ? '₹73,000' : '₹517'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary"><Download className="h-4 w-4" /> Export to Excel</button>
          <button onClick={onReset} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Scan another</button>
        </div>
      </div>
    );
  }

  if (feature.id === 'ai-table') {
    return (
      <div className="card p-6 animate-scale-in">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${feature.accent} text-white`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">Table Extracted</h3>
            <p className="text-sm text-ink-500">5 rows × 4 columns detected</p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr><th className="px-4 py-2.5">Region</th><th className="px-4 py-2.5">Q1</th><th className="px-4 py-2.5">Q2</th><th className="px-4 py-2.5">Q3</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {[
                ['North', '₹1.2M', '₹1.5M', '₹1.8M'],
                ['South', '₹0.9M', '₹1.1M', '₹1.4M'],
                ['East', '₹2.1M', '₹2.4M', '₹2.7M'],
                ['West', '₹1.7M', '₹1.9M', '₹2.2M'],
                ['Central', '₹0.8M', '₹1.0M', '₹1.3M'],
              ].map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => <td key={i} className={`px-4 py-2.5 ${i === 0 ? 'font-medium text-ink-800' : 'text-ink-600'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary"><Download className="h-4 w-4" /> Export to Excel</button>
          <button onClick={onReset} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Extract another</button>
        </div>
      </div>
    );
  }

  if (feature.id === 'ai-signature') {
    return (
      <div className="card p-6 animate-scale-in">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${feature.accent} text-white`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">Signature Detection</h3>
            <p className="text-sm text-ink-500">3 signature regions found</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            { label: 'Signature 1 — Party A', status: 'Signed', color: 'accent' },
            { label: 'Signature 2 — Party B', status: 'Signed', color: 'accent' },
            { label: 'Signature 3 — Witness', status: 'Unsigned', color: 'err' },
          ].map((s) => (
            <div key={s.label} className={`flex items-center justify-between rounded-xl p-4 ring-1 ${s.color === 'accent' ? 'bg-accent-50/50 ring-accent-100' : 'bg-err-50/50 ring-err-100'}`}>
              <span className="text-sm font-semibold text-ink-800">{s.label}</span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ${s.color === 'accent' ? 'bg-accent-100 text-accent-700' : 'bg-err-100 text-err-600'}`}>{s.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary"><Download className="h-4 w-4" /> Download Report</button>
          <button onClick={onReset} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Check another</button>
        </div>
      </div>
    );
  }

  // Generic result (OCR, scanner, enhancer, translation)
  return (
    <div className="card p-6 animate-scale-in">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${feature.accent} text-white`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-ink-900">{feature.title} — Result</h3>
          <p className="text-sm text-ink-500">AI processing complete</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Before</p>
          <div className="mt-2 grid h-40 place-items-center rounded-lg bg-white ring-1 ring-ink-200 text-ink-300">
            <UploadCloud className="h-8 w-8" />
          </div>
        </div>
        <div className="rounded-xl bg-accent-50/50 p-4 ring-1 ring-accent-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">After (AI)</p>
          <div className="mt-2 grid h-40 place-items-center rounded-lg bg-white ring-1 ring-accent-200">
            <CheckCircle2 className="h-8 w-8 text-accent-500" />
          </div>
        </div>
      </div>

      {feature.id === 'ai-ocr' || feature.id === 'ai-scanner' ? (
        <div className="mt-5 rounded-xl bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Extracted Text</p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-700">
            {feature.id === 'ai-ocr'
              ? 'INVOICE\nDate: 28 July 2026\nBill To: Acme Corp\nAmount Due: ₹73,000\nGST: 27AABCU9603R1ZJ'
              : 'Document scanned successfully. Edges detected, shadows removed, and brightness corrected. Ready to export as PDF.'}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary"><Download className="h-4 w-4" /> Download Result</button>
        <button onClick={onReset} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Process another</button>
      </div>
    </div>
  );
}
