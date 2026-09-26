import { Button } from '@/src/design-system';
import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Users, FileText, Handshake, CreditCard, Package, Bell, 
  ScrollText, Settings, LogOut, LayoutDashboard, Database, ChevronRight,
  Pin, WifiOff
} from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { can } from '@/src/modules/iam';
import { ErrorBoundary, DensityToggle, PageSkeleton } from '@/src/design-system';
import { NotificationCenter } from '../../features/system/notifications/NotificationCenter';
import { OnboardingModal } from '../../features/system/onboarding/OnboardingModal';
import { realtimeStore } from '@/src/data/realtime-store';
import { sessionCostCounter } from '@/src/data/cost-counter';
import { KeepAliveShell } from './KeepAliveShell';

export default function AppLayout() {
  const { user, userData, logout, switchRole } = useAuth();
  const location = useLocation();
  console.log('[DEBUG AppLayout] rendered with location:', location.pathname);
  
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('sgm_sidebar_pinned') === 'true';
  });
  const [isCollapsed, setIsCollapsed] = useState(!isPinned);
  
  const [globalDensity, setGlobalDensity] = useState<'compact' | 'normal' | 'comfortable'>(
    () => (localStorage.getItem('sgm_global_density') as 'compact' | 'normal' | 'comfortable') || 'normal'
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const togglePin = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    localStorage.setItem('sgm_sidebar_pinned', String(nextPinned));
    if (nextPinned) {
      setIsCollapsed(false);
    }
  };


  const isKeepAliveRoute = [
    '/customers',
    '/quotations',
    '/contracts',
    '/payments',
    '/deliveries',
    '/zns-hub',
    '/audit-logs',
    '/settings',
  ].some((p) => location.pathname.startsWith(p));

  // Intent-based pre-warming helper (keeps cache warm for 5 mins)
  const prewarmCollection = (col: string) => {
    if (!user) return;
    const unsub = realtimeStore.subscribe(col, () => {});
    unsub();
  };

  if (!user) return null;

  const _isSystemRoute = ['/settings', '/zns-hub', '/audit-logs'].some(path => location.pathname.startsWith(path));

  // Sync density change with other active tables through a custom event trigger
  const handleDensityChange = (d: 'compact' | 'normal' | 'comfortable') => {
    setGlobalDensity(d);
    localStorage.setItem('sgm_global_density', d);
    window.dispatchEvent(new CustomEvent('sgm_density_changed', { detail: d }));
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tổng quan';
    if (path.startsWith('/reports')) return 'Trung tâm Báo cáo';
    if (path.startsWith('/customers')) return 'Khách hàng';
    if (path.startsWith('/quotations')) return 'Báo giá';
    if (path.startsWith('/contracts')) return 'Hợp đồng';
    if (path.startsWith('/payments')) return 'Thanh toán';
    if (path.startsWith('/deliveries')) return 'Giao hàng';
    if (path.startsWith('/zns-hub')) return 'ZNS Hub';
    if (path.startsWith('/audit-logs')) return 'Nhật ký';
    if (path.startsWith('/settings')) return 'Cài đặt';
    return 'Hệ thống';
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path.startsWith('/customers')) return 'Quản lý khách hàng tiềm năng và khách hàng hiện tại';
    if (path.startsWith('/quotations')) return 'Quản lý báo giá, đơn đặt hàng vật tư dịch vụ';
    if (path.startsWith('/contracts')) return 'Quản lý hợp đồng máy nguyên chiếc';
    if (path.startsWith('/payments')) return 'Quản lý và đối soát công nợ, khoản thu';
    if (path.startsWith('/deliveries')) return 'Quản lý lịch giao hàng, lắp đặt và kho';
    if (path.startsWith('/reports')) return 'Trung tâm phân tích và báo cáo quản trị đa chiều';
    if (path.startsWith('/zns-hub')) return 'Quản lý tin nhắn Zalo, lỗi gửi tin và mô phỏng giao tiếp Zalo';
    if (path.startsWith('/audit-logs')) return 'Nhật ký truy vết và lịch sử thay đổi hệ thống';
    if (path.startsWith('/settings')) return 'Cấu hình tham số và thiết lập hệ thống';
    return '';
  };

  const asideClasses = `bg-slate-50 text-slate-700 border-r border-slate-200 ${isCollapsed ? 'w-[52px]' : 'w-[220px]'} overflow-x-hidden`;

  const navItemActive = 'bg-white text-slate-900 font-medium shadow-[0_1px_2px_rgba(15,23,42,0.05)] border-slate-200/60 ring-1 ring-slate-900/5';

  const navItemIdle = 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50';

  const sectionHeaderColor = 'text-slate-700';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <OnboardingModal />

      {/* Dynamic Theme Sidebar Shell */}
      <aside 
        onMouseEnter={() => { if (!isPinned) setIsCollapsed(false); }}
        onMouseLeave={() => { if (!isPinned) setIsCollapsed(true); }}
        className={`transition-all duration-200 flex flex-col h-full shrink-0 z-20 relative select-none ${asideClasses}`}
      >
        {/* Workspace Switcher header */}
        <div className={`h-12 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'px-4 justify-between'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm shadow-blue-600/20`}>
              <Database size={12} />
            </div>
            {!isCollapsed && (
              <span className={`text-xs font-semibold tracking-tight truncate text-slate-900`}>
                SGM OS <span className="text-2xs bg-blue-50 text-blue-600 font-normal px-1 py-0.2 rounded border border-blue-100 ml-1">v15</span>
              </span>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              onClick={togglePin}
              className="w-7 h-7 p-0 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 transition-colors pointer-events-auto"
              title={isPinned ? "Bỏ ghim Sidebar" : "Ghim Sidebar luôn hiển thị"}
              aria-label="Ghim menu"
            >
              <Pin size={13} className={isPinned ? "rotate-45 text-blue-600 fill-blue-600/20" : "text-slate-400"} />
            </Button>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* SOLUTIONS IA GROUP */}
          <div>
            {!isCollapsed && (
              <div className={`px-2 mb-1.5 text-2xs font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
                Solutions
              </div>
            )}
            <div className="space-y-0.5">
              <NavItem to="/" icon={<LayoutDashboard size={14} />} label="Dashboard" end isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} />
              <NavItem to="/customers" icon={<Users size={14} />} label="Khách hàng" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} onMouseEnter={() => prewarmCollection('customers')} />
              <NavItem to="/quotations" icon={<FileText size={14} />} label="Báo giá" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} onMouseEnter={() => prewarmCollection('quotations')} />
              <NavItem to="/contracts" icon={<Handshake size={14} />} label="Hợp đồng" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} onMouseEnter={() => prewarmCollection('contracts')} />
              <NavItem to="/payments" icon={<CreditCard size={14} />} label="Thanh toán" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} onMouseEnter={() => prewarmCollection('payments')} />
              <NavItem to="/deliveries" icon={<Package size={14} />} label="Giao hàng" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} onMouseEnter={() => prewarmCollection('deliveries')} />
            </div>
          </div>
          
          {/* SYSTEM IA GROUP */}
          {(can('view', 'zns_template', userData?.role) || can('view', 'audit', userData?.role) || can('view', 'settings', userData?.role)) && (
            <div>
              {!isCollapsed && (
                <div className={`px-2 mb-1.5 text-2xs font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
                  System
                </div>
              )}
              <div className="space-y-0.5">
                {can('view', 'zns_template', userData?.role) && (
                  <NavItem to="/zns-hub" icon={<Bell size={14} />} label="ZNS Hub" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} />
                )}
                {can('view', 'audit', userData?.role) && (
                  <NavItem to="/audit-logs" icon={<ScrollText size={14} />} label="Nhật ký" isCollapsed={isCollapsed} activeClass={navItemActive} idleClass={navItemIdle} currentPath={location.pathname} onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} />
                )}
                {can('view', 'settings', userData?.role) && (
                  <NavItem 
                    to="/settings/vendor" 
                    icon={<Settings size={14} />} 
                    label="Cài đặt" 
                    isCollapsed={isCollapsed} 
                    activeClass={navItemActive} 
                    idleClass={navItemIdle} 
                    currentPath={location.pathname}
                    isActiveMatcher={(path) => path.startsWith('/settings')}
                    onClick={() => { if (!isPinned && window.innerWidth < 768) setIsCollapsed(true); }} 
                  />
                )}
              </div>
            </div>
          )}
        </nav>

        {/* User profile bottom footer */}
        <div className={`p-2 border-t border-slate-200 mt-auto bg-inherit`}>
          <div className={`flex items-center gap-2 rounded-lg ${isCollapsed ? 'justify-center' : 'p-1 hover:bg-slate-200/50'} group cursor-pointer transition-colors`}>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=2563EB&color=fff`} 
              alt="Avatar" 
              className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-slate-200" 
              referrerPolicy="no-referrer" 
              loading="lazy"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-2xs font-semibold truncate text-slate-800 leading-normal">{user.displayName || 'Advisor'}</div>
                <div className="text-3xs text-slate-600 truncate leading-none">{user.email}</div>
              </div>
            )}
            <Button 
              variant="ghost"
              size="xs"
              iconOnly
              onClick={logout} 
              className={`w-6 h-6 p-0 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all ${isCollapsed ? 'hidden' : 'opacity-70 hover:opacity-100'}`} 
              aria-label="Đăng xuất"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={13} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Topbar exactly 48px high - NEXUS Adaptive Command Strip */}
        <header className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-50 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
              <span className="hover:text-slate-700 transition-colors">Bản đồ IA</span>
              <ChevronRight size={11} className="text-slate-300" />
              <span className="text-slate-900 font-bold text-sm tracking-tight">{getPageTitle()}</span>
            </div>
            {getPageSubtitle() && (
              <>
                <div className="h-3.5 w-[1px] bg-slate-200 shrink-0 hidden md:block" />
                <span className="text-xs text-slate-400 font-normal truncate hidden md:block max-w-[280px] lg:max-w-md xl:max-w-xl">
                  {getPageSubtitle()}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-2xs font-semibold animate-pulse">
                <WifiOff size={12} />
                <span>Mất kết nối</span>
              </div>
            )}
            {/* Real User Role Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 border border-slate-200/80 rounded-lg text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${userData?.role === 'Administrator' ? 'bg-blue-600' : userData?.role === 'Ban Giám Đốc' ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
              <span className="text-2xs font-bold text-slate-800">
                {userData?.role === 'Administrator' ? '👑 Quản trị viên' : userData?.role === 'Ban Giám Đốc' ? '👔 Ban Giám Đốc' : '💼 Chuyên viên'}
              </span>
            </div>

            {/* Layout Density controller */}
            <DensityToggle density={globalDensity} onChange={handleDensityChange} />

            <NotificationCenter />
            <div className="w-[1px] h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=2563EB&color=fff`} 
                alt="User" 
                className="w-6 h-6 rounded-full object-cover border border-slate-200" 
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={logout}
                title="Đăng xuất khỏi hệ thống"
                aria-label="Đăng xuất"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic page wrapper with 0ms Keep-Alive feature preservation */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col min-h-0">
          <ErrorBoundary>
            <div className="w-full h-full flex flex-col min-h-0">
              <KeepAliveShell currentPath={location.pathname} />
              {!isKeepAliveRoute && (
                <div className="w-full h-full flex flex-col min-h-0 animate-in fade-in duration-150">
                  <Suspense fallback={<PageSkeleton />}>
                    <Outlet />
                  </Suspense>
                </div>
              )}
            </div>
          </ErrorBoundary>
        </div>

        <CostBadge />
      </main>
    </div>
  );
}

const CostBadge = React.memo(function CostBadge() {
  const [dbStats, setDbStats] = useState(() => sessionCostCounter.getStats());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return sessionCostCounter.subscribe(() => {
        setDbStats(sessionCostCounter.getStats());
      });
    }
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-3 left-16 z-20 flex items-center gap-1.5 bg-slate-900/85 hover:bg-slate-900 text-white px-2.5 py-1 rounded-full text-2xs font-mono shadow-sm border border-slate-700/50 select-none backdrop-blur-xs transition-opacity opacity-75 hover:opacity-100">
      <Database className="h-3 w-3 text-emerald-400" />
      <span className="text-slate-300">Supabase:</span>
      <span className="text-emerald-400 font-bold">{dbStats.reads}R</span>
      <span className="text-slate-600">|</span>
      <span className="text-amber-400 font-bold">{dbStats.writes}W</span>
    </div>
  );
});

const NavItem = React.memo(function NavItem({ 
  to, icon, label, end = false, isCollapsed = false, activeClass, idleClass, onClick, onMouseEnter, isActiveMatcher, currentPath 
}: { 
  to: string, icon: React.ReactNode, label: string, end?: boolean, isCollapsed?: boolean, activeClass: string, idleClass: string, onClick?: () => void, onMouseEnter?: () => void, isActiveMatcher?: (pathname: string) => boolean, currentPath?: string 
}) {
  return (
    <NavLink 
      to={to} 
      end={end}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={({ isActive: navActive }) => {
        const active = isActiveMatcher ? isActiveMatcher(currentPath || window.location.pathname) : navActive;
        return `
        h-8 rounded-md px-2.5 text-xs font-medium flex items-center transition-all group relative border border-transparent
        ${isCollapsed ? 'justify-center mx-0.5 px-0' : 'gap-2.5'}
        ${active ? activeClass : idleClass}
      `;
      }}
      title={isCollapsed ? label : undefined}
    >
      <span className="shrink-0 opacity-80 group-hover:opacity-100">{icon}</span>
      {!isCollapsed && <span className="truncate">{label}</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-800 text-white text-2xs font-semibold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[110] shadow-md whitespace-nowrap">
          {label}
        </div>
      )}
    </NavLink>
  );
});
