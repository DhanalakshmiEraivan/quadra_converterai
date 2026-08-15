import { useEffect, useRef, useState } from 'react';
import { Search, Menu, X, Sparkles, ChevronDown, LogOut, LayoutDashboard, Shield, User as UserIcon } from 'lucide-react';
import { Wordmark } from './Logo';
import { tools, categories } from '@/data/tools';
import type { Route } from '@/router';
import { useAuth } from '@/lib/auth';
import * as Icons from 'lucide-react';

type Props = {
  route: Route;
  navigate: (path: string) => void;
};

export function Header({ route, navigate }: Props) {
  const { user, profile, role, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = search.trim()
    ? tools.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const navItems = user
    ? [
        { label: 'Tools', path: '/tools' },
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Pricing', path: '/pricing' },
        ...(role === 'admin' ? [{ label: 'Admin', path: '/admin' }] : []),
      ]
    : [
        { label: 'Tools', path: '/tools' },
        { label: 'Pricing', path: '/pricing' },
      ];

  const isActive = (path: string) => {
    if (path === '/tools') return route.name === 'tools' || route.name === 'tool';
    if (path === '/dashboard') return route.name === 'dashboard';
    if (path === '/pricing') return route.name === 'pricing';
    if (path === '/admin') return route.name === 'admin';
    return false;
  };

  const getIcon = (name: string) => {
    const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
    return Icon ? <Icon className="h-4 w-4" /> : <Icons.FileText className="h-4 w-4" />;
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-xl ring-1 ring-ink-200/60 shadow-soft' : 'bg-white/0'}`}>
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="shrink-0">
            <Wordmark />
          </button>

          <div ref={searchRef} className="relative hidden flex-1 max-w-md md:block">
            <div className={`relative transition-all ${searchFocus ? 'scale-[1.01]' : ''}`}>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                placeholder="Search 55+ tools…"
                className="w-full rounded-xl bg-ink-50 py-2.5 pl-10 pr-4 text-sm text-ink-900 ring-1 ring-transparent placeholder:text-ink-400 transition focus:bg-white focus:outline-none focus:ring-brand-500/40"
              />
            </div>
            {searchFocus && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl bg-white py-2 shadow-float ring-1 ring-ink-200 animate-scale-in">
                {results.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/tool/${t.id}`); setSearch(''); setSearchFocus(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      {getIcon(t.icon)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{t.name}</span>
                      <span className="block truncate text-xs text-ink-500">{t.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${isActive(item.path) ? 'text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 rounded-xl ring-1 ring-ink-200 px-2.5 py-1.5 hover:bg-ink-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center text-sm font-bold">
                    {(profile?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white py-2 shadow-float ring-1 ring-ink-200 animate-scale-in">
                    <div className="px-4 py-2 border-b border-ink-100">
                      <div className="text-sm font-semibold text-ink-900 truncate">{profile?.full_name || 'User'}</div>
                      <div className="text-xs text-ink-500 truncate">{user.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                        {role === 'admin' ? <><Shield className="w-3 h-3" /> Admin</> : <><UserIcon className="w-3 h-3" /> User</>}
                      </div>
                    </div>
                    <button onClick={() => { navigate('/dashboard'); setUserMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                    {role === 'admin' && (
                      <button onClick={() => { navigate('/admin'); setUserMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50">
                        <Shield className="w-4 h-4" /> Admin Panel
                      </button>
                    )}
                    <button onClick={() => { signOut(); navigate('/'); setUserMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-err-600 hover:bg-err-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('/auth')} className="btn-primary">
                <Sparkles className="h-4 w-4" />
                Sign In
              </button>
            )}
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-ink-200 text-ink-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-float animate-fade-up">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-ink-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools…"
                className="input pl-9"
              />
            </div>
            {search && results.length > 0 && (
              <div className="mt-2 space-y-1">
                {results.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/tool/${t.id}`); setSearch(''); setMobileOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-ink-50"
                  >
                    <span className="text-brand-600">{getIcon(t.icon)}</span>
                    <span className="text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
            <nav className="mt-5 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink-700 hover:bg-ink-100"
                >
                  {item.label}
                </button>
              ))}
              {user && (
                <button onClick={() => { signOut(); navigate('/'); setMobileOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-err-600 hover:bg-err-50">
                  Sign Out
                </button>
              )}
            </nav>
            <div className="mt-4 space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Categories</p>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { navigate(`/tools/${c.id}`); setMobileOpen(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-600 hover:bg-ink-100"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
