import { Button } from '@/src/design-system';
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { FileText } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import AppLayout from './components/layout/AppLayout';
import { ShortcutProvider } from './contexts/ShortcutContext';
import { ConfirmHost, PageSkeleton } from './design-system';
import { DrawerStackProvider } from './contexts/DrawerStackContext';
import { logger } from '@/src/shared/lib/logger';

// Eager loading default pages for offline high-availability and zero dynamic chunk fetch failures
import DashboardPage from './features/dashboard/page';
import ReportsPage from './features/reports/page';


// Placeholder standard login screen
function LoginScreen({ login }: { login: (username?: string, password?: string) => Promise<boolean> }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorWeb, setErrorWeb] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorWeb('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }
    setErrorWeb('');
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (!success) {
        setErrorWeb('Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setErrorWeb('Đã xảy ra lỗi khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 font-sans selection:bg-blue-500/30">
      <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200 w-full max-w-md text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mb-8 flex items-center justify-center shadow-lg group overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
             <FileText size={40} className="text-white relative z-10 transition-transform duration-500 group-hover:scale-110" />
          </div>
          
          <div className="mb-8">
            <h1 className="text-4xl font-sans font-bold text-slate-950 mb-1 tracking-tight">SGM <span className="text-blue-600">OS</span></h1>
            <p className="text-2xs font-bold text-slate-700 uppercase tracking-[0.3em]">Hệ Thống Quản Trị Thông Minh</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-widest mb-1.5" htmlFor="username">Tên đăng nhập</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Ví dụ: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-widest mb-1.5" htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {errorWeb && (
              <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg leading-snug">
                {errorWeb}
              </div>
            )}

            <Button aria-label="Đăng nhập" 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
             variant="accent">
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
            </Button>

            <div className="pt-2 text-center">
              <span className="text-2xs text-slate-700 font-medium">Tài khoản mặc định: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">admin</code> / <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">admin</code></span>
            </div>
          </form>
        </div>
      </div>
      
      <div className="absolute bottom-10 text-2xs font-bold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-4">
        <span>Phiên bản Doanh nghiệp 2.5.0</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Hệ thống trực tuyến</span>
      </div>
    </div>
  );
}

// Offline SWR persistent cache provider for reports and today's analytics
const swrCacheMap = new Map<string, unknown>();

try {
  const stored = localStorage.getItem('sgm_swr_cache');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      for (const [key, val] of parsed) {
        swrCacheMap.set(key, val);
      }
    }
  }
} catch (err) {
  logger.warn('Failed to restore SWR cache:', err);
}

const originalSet = swrCacheMap.set.bind(swrCacheMap);
const originalDelete = swrCacheMap.delete.bind(swrCacheMap);

let persistTimeout: any = null;

const schedulePersist = () => {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(performPersist, { timeout: 2000 });
    } else {
      performPersist();
    }
  }, 1000);
};

const performPersist = () => {
  try {
    const entriesToPersist: [string, unknown][] = [];
    const entries = Array.from(swrCacheMap.entries());
    let sizeCounter = 0;
    
    // Reverse to keep the most recent entries, max ~2MB string length to prevent blocking/quota issues
    for (let i = entries.length - 1; i >= 0; i--) {
      const [k, v] = entries[i];
      if (k.startsWith('/api') || k.includes('full-data') || k.includes('today')) {
        const estSize = JSON.stringify(v).length;
        if (sizeCounter + estSize > 2000000) continue; // Skip if too large
        entriesToPersist.push([k, v]);
        sizeCounter += estSize;
      }
    }
    localStorage.setItem('sgm_swr_cache', JSON.stringify(entriesToPersist));
  } catch (err) {
    logger.warn('Failed to persist SWR cache:', err);
  }
};

swrCacheMap.set = (key: string, value: unknown) => {
  originalSet(key, value);
  if (key.includes('/api/reports') || key.includes('/api/analytics') || key.includes('full-data')) {
    schedulePersist();
  }
  return swrCacheMap;
};

swrCacheMap.delete = (key: string) => {
  const res = originalDelete(key);
  schedulePersist();
  return res;
};

function swrProvider() {
  return swrCacheMap;
}

export default function App() {
  const { user, loading: authLoading, login } = useAuth();

  const swrConfigValue = React.useMemo(() => ({ 
    provider: swrProvider as any,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    keepPreviousData: true
  }), []);

  React.useEffect(() => {
    // Controlled idle prefetch for non-default lazy routes
    if (user && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(() => {
        setTimeout(() => {
          import('./modules/customers/ui/page').catch(() => {});
          import('./modules/sales/ui/page').catch(() => {});
          import('./modules/contracts/ui/page').catch(() => {});
          import('./modules/billing/ui/page').catch(() => {});
          import('./modules/fulfillment/ui/page').catch(() => {});
        }, 1000);
      });
      return () => (window as any).cancelIdleCallback(handle);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen login={login} />;
  }

  return (
    <SWRConfig value={swrConfigValue}>
      <ShortcutProvider>
        <ConfirmHost>
            <BrowserRouter>
              <DrawerStackProvider>
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                  <Route path="/*" element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    {/* All features rendered persistently via KeepAliveShell in AppLayout */}
                    <Route path="customers" element={<div className="contents" />} />
                    <Route path="quotations" element={<div className="contents" />} />
                    <Route path="contracts" element={<div className="contents" />} />
                    <Route path="payments" element={<div className="contents" />} />
                    <Route path="deliveries" element={<div className="contents" />} />
                    <Route path="zns-hub" element={<div className="contents" />} />
                    <Route path="audit-logs" element={<div className="contents" />} />
                    <Route path="settings" element={<Navigate to="/settings/vendor" replace />} />
                    <Route path="settings/*" element={<div className="contents" />} />
                  </Route>
                </Routes>
              </Suspense>
              </DrawerStackProvider>
            </BrowserRouter>
          </ConfirmHost>
      </ShortcutProvider>
    </SWRConfig>
  );
}
