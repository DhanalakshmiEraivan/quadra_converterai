import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUsageStatus, type UsageStatus } from '@/lib/usage';
import { useAuth } from '@/lib/auth';
import {
  HardDrive, History, Zap,
  FileText, Image as ImageIcon, FileCode2, QrCode,
  Calculator, Type, KeyRound, Palette, Loader2, Trash2, CheckCircle2,
  XCircle, Sparkles, Activity, BarChart3, Download, UserCircle, RefreshCw,
} from 'lucide-react';

interface ConversionRecord {
  id: string;
  tool_id: string;
  tool_name: string;
  category: string;
  input_name: string | null;
  output_name: string | null;
  output_format: string;
  status: string;
  file_size: number | null;
  output_path: string | null;
  created_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [serverStats, setServerStats] = useState<{ total: number; completed: number; failed: number; total_size: number; categories: Record<string, number> } | null>(null);

  const loadConversions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setConversions(data as ConversionRecord[]);
    const { data: statsData } = await supabase.rpc('get_conversion_stats');
    if (statsData) setServerStats(statsData as typeof serverStats);
    try { setUsage(await getUsageStatus()); } catch (error) { console.error('Usage status failed:', error); }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversions();
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversions', filter: `user_id=eq.${user.id}` }, () => { loadConversions(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` }, () => { loadConversions(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversions, user]);

  const downloadHistoryFile = async (path: string | null, filename: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('conversion-files').createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) return;
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = filename || 'converted-file';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const deleteConversion = async (id: string, outputPath?: string | null) => {
    if (outputPath) await supabase.storage.from('conversion-files').remove([outputPath]);
    await supabase.from('conversions').delete().eq('id', id);
    setConversions((prev) => prev.filter((c) => c.id !== id));
  };

  const clearHistory = async () => {
    if (!user) return;
    const paths = conversions.map((c) => c.output_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from('conversion-files').remove(paths);
    await supabase.from('conversions').delete().eq('user_id', user.id);
    setConversions([]);
  };

  const localStats = {
    total: conversions.length,
    completed: conversions.filter((c) => c.status === 'completed').length,
    failed: conversions.filter((c) => c.status === 'failed').length,
    totalSize: conversions.reduce((sum, c) => sum + (c.file_size || 0), 0),
    byCategory: conversions.reduce<Record<string, number>>((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {}),
  };
  const stats = {
    total: serverStats?.total ?? localStats.total,
    completed: serverStats?.completed ?? localStats.completed,
    failed: serverStats?.failed ?? localStats.failed,
    totalSize: Number(serverStats?.total_size ?? localStats.totalSize),
    byCategory: serverStats?.categories ?? localStats.byCategory,
  };


  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    image: ImageIcon,
    pdf: FileText,
    text: Type,
    dev: FileCode2,
    qr: QrCode,
    color: Palette,
    calc: Calculator,
    security: KeyRound,
  };

  const filteredConversions = filter === 'all' ? conversions : conversions.filter((c) => c.category === filter);

  const storageLimitBytes = 500 * 1024 * 1024;
  const storagePercent = Math.min((stats.totalSize / storageLimitBytes) * 100, 100);

  return (
    <div className="container-page py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Dashboard</h1>
          <p className="text-ink-500 mt-1">Welcome back, {user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadConversions} className="btn-secondary" title="Refresh dashboard">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => navigate('/tools')} className="btn-primary">
          <Sparkles className="h-4 w-4" /> Browse Tools
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-wider text-ink-400">Current plan</p><div className="mt-1 flex items-center gap-3"><h2 className="font-display text-2xl font-extrabold capitalize text-ink-900">{usage?.plan ?? 'free'}</h2><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{usage?.unlimited ? 'Unlimited' : `${usage?.free_remaining ?? 5} free today`}</span></div></div>
          <button onClick={() => navigate('/pricing')} className="btn-secondary">Upgrade with UPI <Zap className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Activity} label="Total Conversions" value={String(stats.total)} color="from-brand-500 to-brand-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={String(stats.completed)} color="from-accent-500 to-accent-600" />
        <StatCard icon={XCircle} label="Failed" value={String(stats.failed)} color="from-err-500 to-err-600" />
        <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(stats.totalSize)} color="from-warn-500 to-warn-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Conversion History */}
        <div className="bg-white rounded-3xl border border-ink-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-ink-100">
            <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-600" /> Conversion History
            </h2>
            {conversions.length > 0 && (
              <button onClick={clearHistory} className="text-sm text-err-500 hover:text-err-600 font-medium flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 p-4 border-b border-ink-100">
            <FilterChip label="All" count={stats.total} active={filter === 'all'} onClick={() => setFilter('all')} />
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <FilterChip key={cat} label={cat} count={count} active={filter === cat} onClick={() => setFilter(cat)} />
            ))}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <p className="text-sm text-ink-500 mt-3">Loading your conversions…</p>
            </div>
          ) : filteredConversions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-ink-300 mx-auto" />
              <p className="text-ink-500 mt-3 font-medium">No conversions yet</p>
              <p className="text-sm text-ink-400 mt-1">Start using tools to see your history here</p>
              <button onClick={() => navigate('/tools')} className="btn-primary mt-4">
                <Sparkles className="h-4 w-4" /> Explore Tools
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ink-50 max-h-[600px] overflow-auto">
              {filteredConversions.map((conv) => {
                const CatIcon = categoryIcons[conv.category] || FileText;
                return (
                  <div key={conv.id} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition group">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink-900 truncate">{conv.tool_name}</p>
                        {conv.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-err-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-ink-500 truncate">
                        {conv.input_name || '—'} → {conv.output_name || '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-ink-400">{timeAgo(conv.created_at)}</p>
                      <p className="text-xs text-ink-500">{formatBytes(conv.file_size)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {conv.output_path && (
                        <button
                          onClick={() => downloadHistoryFile(conv.output_path, conv.output_name)}
                          className="opacity-0 group-hover:opacity-100 text-brand-600 hover:text-brand-700 transition"
                          title="Download converted file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteConversion(conv.id, conv.output_path)}
                        className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-err-500 transition"
                        title="Delete history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Storage */}
          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <h3 className="font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-600" /> Storage
            </h3>
            <div className="relative h-3 bg-ink-100 rounded-full overflow-hidden mb-2">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-500">
              <span>{formatBytes(stats.totalSize)}</span>
              <span>500 MB limit</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <h3 className="font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-600" /> By Category
            </h3>
            {Object.keys(stats.byCategory).length === 0 ? (
              <p className="text-sm text-ink-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const CatIcon = categoryIcons[cat] || FileText;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-ink-600 capitalize">
                          <CatIcon className="w-3.5 h-3.5" /> {cat}
                        </span>
                        <span className="font-semibold text-ink-900">{count}</span>
                      </div>
                      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-2xl border border-brand-100 p-5">
            <h3 className="font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-600" /> Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['pdf-merge', 'img-compress', 'text-case', 'qr-generate'].map((id) => (
                <button
                  key={id}
                  onClick={() => navigate(`/tool/${id}`)}
                  className="p-3 rounded-xl bg-white border border-ink-100 hover:border-brand-300 hover:shadow-soft transition text-left"
                >
                  <p className="text-xs font-semibold text-ink-800 capitalize">{id.replace(/-/g, ' ')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-200 p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white grid place-items-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-display font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition capitalize ${active ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'}`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
}
