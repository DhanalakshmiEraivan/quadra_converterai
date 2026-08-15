import { useRouter } from '@/router';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { ToolsPage } from '@/pages/ToolsPage';
import { ToolWorkspace } from '@/pages/ToolWorkspace';
import { DashboardPage } from '@/pages/DashboardPage';
import { PricingPage } from '@/pages/PricingPage';
import { AdminPage } from '@/pages/AdminPage';
import { AuthPage } from '@/pages/AuthPage';
import { getToolById } from '@/data/tools';
import { Loader2 } from 'lucide-react';

function App() {
  const { route, navigate } = useRouter();
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const isAdminRoute = route.name === 'admin';
  const isAuthRoute = route.name === 'auth';

  // Redirect to auth if trying to access protected routes without login
  if ((route.name === 'dashboard' || route.name === 'admin' || route.name === 'tool') && !user) {
    return <AuthPage />;
  }

  // Redirect admin route if not admin
  if (route.name === 'admin' && role !== 'admin') {
    return <DashboardPage navigate={navigate} />;
  }

  // Redirect auth route away if already logged in
  if (isAuthRoute && user) {
    return role === 'admin' ? <AdminPage navigate={navigate} /> : <DashboardPage navigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {!isAuthRoute && !isAdminRoute && <Header route={route} navigate={navigate} />}

      <main className="flex-1">
        {isAuthRoute && <AuthPage />}
        {route.name === 'home' && <LandingPage navigate={navigate} />}
        {route.name === 'tools' && <ToolsPage navigate={navigate} category={route.category} />}
        {route.name === 'tool' && user && (() => {
          const tool = getToolById(route.id);
          if (!tool) return <NotFound navigate={navigate} />;
          return <ToolWorkspace tool={tool} navigate={navigate} />;
        })()}
        {route.name === 'dashboard' && user && <DashboardPage navigate={navigate} />}
        {route.name === 'pricing' && <PricingPage navigate={navigate} />}
        {route.name === 'admin' && role === 'admin' && <AdminPage navigate={navigate} />}
      </main>

      {!isAuthRoute && !isAdminRoute && <Footer navigate={navigate} />}
    </div>
  );
}

function NotFound({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-ink-200">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-ink-500">The tool or page you are looking for does not exist.</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6">Back to home</button>
    </div>
  );
}

export default App;
