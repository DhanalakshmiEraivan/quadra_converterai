import { Layers } from 'lucide-react';

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div className={`${className} relative grid place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow`}>
      <Layers className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
    </div>
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      {showText && (
        <div className="leading-none">
          <span className="font-display text-[17px] font-extrabold tracking-tight text-ink-900">
            Quadra<span className="text-brand-600">Converter</span>
          </span>
          <span className="ml-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
            AI
          </span>
        </div>
      )}
    </div>
  );
}
