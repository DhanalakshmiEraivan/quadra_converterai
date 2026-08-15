import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Sparkles, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, ShieldCheck, Zap, FileText } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName || undefined);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col gap-8 p-8">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="text-2xl font-bold font-display text-ink-900">QuadraConverter</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold font-display text-ink-900 leading-tight">
              Convert Anything.<br />Enhance Everything.
            </h1>
            <p className="mt-4 text-ink-500 text-lg">
              55+ real-time conversion tools for images, PDFs, text, and developer workflows — all in your browser.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Zap, title: 'Real-time conversion', desc: 'Most tools process instantly in your browser' },
              { icon: ShieldCheck, title: 'Privacy first', desc: 'Local tools keep files on your device; Office conversions use the secure conversion server' },
              { icon: FileText, title: '50+ tools', desc: 'Image, PDF, text, JSON, QR, and more' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <div className="font-semibold text-ink-800">{f.title}</div>
                  <div className="text-sm text-ink-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth form */}
        <div className="bg-white rounded-3xl shadow-float border border-ink-100 p-8 sm:p-10">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold font-display text-ink-900">QuadraConverter</span>
          </div>

          <div className="flex gap-1 p-1 bg-ink-50 rounded-xl mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'}`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-2xl font-bold font-display text-ink-900 mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Get started free'}
          </h2>
          <p className="text-ink-500 text-sm mb-6">
            {mode === 'signin' ? 'Sign in to access your dashboard and tools' : 'Create an account to start converting files'}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-err-50 border border-err-100 rounded-xl mb-4 text-sm text-err-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-ink-900 placeholder:text-ink-300"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-ink-900 placeholder:text-ink-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-ink-900 placeholder:text-ink-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-glow"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-accent-50 rounded-xl border border-accent-100">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4.5 h-4.5 text-accent-600 shrink-0 mt-0.5" />
              <div className="text-sm text-ink-600">
                <span className="font-semibold text-ink-800">First user becomes admin.</span> Sign up first to get admin access. Additional users get standard accounts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
