import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Globe, Database, User, HardDrive, Info, Settings, ShieldAlert, Send, Search, ChevronRight } from 'lucide-react';
import { PageHeader, ErrorBoundary, tokens } from '@/src/design-system';
import { t } from '@/src/i18n/vi';

// Direct imports for setting sub-pages to guarantee 0ms instant tab switching
import VendorPage from './pages/VendorPage';
import FieldsPage from './pages/FieldsPage';
import UsersPage from './pages/UsersPage';
import SystemPage from './pages/SystemPage';
import AboutPage from './pages/AboutPage';
import GatePage from './pages/GatePage';
import TelegramPage from './pages/TelegramPage';
import HealthScorePage from './pages/HealthScorePage';
import ProductCatalogPage from './pages/ProductCatalogPage';

type SettingGroup = {
  id: string;
  titleKey: string;
  items: { path: string; label: string; icon: React.FC<any>; description?: string }[];
};

const settingGroups: SettingGroup[] = [
  {
    id: 'zns_automation',
    titleKey: 'settings.groups.zns_automation',
    items: [
      { path: '/settings/vendor', label: 'Vendor & Webhook', icon: Globe, description: 'Cấu hình kết nối đối tác ZNS' },
      { path: '/settings/gates', label: 'Workflow Gates', icon: ShieldAlert, description: 'Điều kiện chuyển đổi trạng thái' },
      { path: '/settings/health-score', label: 'Health Score Logic', icon: Settings, description: 'Trọng số đánh giá Sức Khoẻ KH' },
    ]
  },
  {
    id: 'data_integration',
    titleKey: 'settings.groups.data_integration',
    items: [
      { path: '/settings/fields', label: 'Trường thông tin', icon: Database, description: 'Cấu hình thuộc tính chung' },
      { path: '/settings/catalog', label: 'Thư viện sản phẩm', icon: Database, description: 'Quản lý bảng giá & mẫu hàng' },
      { path: '/settings/telegram', label: 'Telegram Bot', icon: Send, description: 'Báo cáo & Cảnh báo qua Telegram' },
      { path: '/settings/users', label: 'Hệ thống người dùng', icon: User, description: 'Quản trị viên & Phân quyền' },
    ]
  },
  {
    id: 'system_admin',
    titleKey: 'settings.groups.system_admin',
    items: [
      { path: '/settings/system', label: 'Hệ thống', icon: HardDrive, description: 'Bảo trì, sao lưu & hiệu năng' },
      { path: '/settings/about', label: 'Thông tin bản build', icon: Info, description: 'Phiên bản & Tài liệu' },
    ]
  }
];

export default function SettingsFeature() {
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const lastSettingsPathRef = React.useRef('/settings/vendor');
  if (location.pathname.startsWith('/settings')) {
    lastSettingsPathRef.current = location.pathname;
  }
  const activePath = lastSettingsPathRef.current;

  const translatedGroups = useMemo(() => {
    return settingGroups.map(group => ({
      ...group,
      title: t(group.titleKey),
    }));
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return translatedGroups;
    const lowerTerm = searchTerm.toLowerCase();
    return translatedGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(lowerTerm) || 
        (item.description && item.description.toLowerCase().includes(lowerTerm))
      )
    })).filter(g => g.items.length > 0);
  }, [searchTerm, translatedGroups]);
  const activeItem = useMemo(() => {
    for (const group of settingGroups) {
      for (const item of group.items) {
        if (activePath.startsWith(item.path)) return item;
      }
    }
    return null;
  }, [activePath]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
      {/* Top Header */}
      <PageHeader title={t('settings.title')} meta={t('settings.subtitle') as string} />
      
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar Navigation */}
        <div className="w-64 shrink-0 bg-white border-r border-slate-200 overflow-y-auto hidden md:block">
          <div className="p-3 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('settings.searchPlaceholder')}
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
              />
            </div>
          </div>
          <div className="p-4 space-y-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="space-y-1.5 animate-in fade-in duration-200">
                <h3 className="px-3 text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {group.title}
                </h3>
                <nav className="flex flex-col gap-0.5">
                  {group.items.map(item => {
                    const isActive = activePath.startsWith(item.path);
                    return (
                      <NavLink
                         key={item.path}
                         to={item.path}
                         className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all outline-none ${
                           isActive 
                             ? 'bg-blue-50/70 text-blue-700 font-semibold border-l-2 border-blue-600 rounded-l-none pl-2.5' 
                             : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                         }`}
                      >
                         <item.icon size={16} className={`shrink-0 ${isActive ? 'text-blue-600 opacity-100' : 'opacity-70 text-slate-500'}`} />
                         <span className="truncate flex-1">{item.label}</span>
                         <ChevronRight size={14} className={`text-slate-300 transition-transform ${isActive ? 'rotate-90 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] custom-scrollbar">
          <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pb-24 min-h-full flex flex-col gap-6">
            {/* Contextual Header for active setting */}
            {activeItem && (
               <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 shrink-0 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                     <activeItem.icon size={20} className="text-slate-700" />
                   </div>
                   <div>
                     <h2 className={tokens.typography.heading.md + " text-slate-900"}>{activeItem.label}</h2>
                     {activeItem.description && (
                       <p className={tokens.typography.body.sm + " text-slate-500 mt-0.5"}>{activeItem.description}</p>
                     )}
                   </div>
                 </div>
               </div>
            )}

            <ErrorBoundary>
              {(() => {
                if (activePath.includes('/settings/fields')) return <FieldsPage />;
                if (activePath.includes('/settings/gates')) return <GatePage />;
                if (activePath.includes('/settings/health-score')) return <HealthScorePage />;
                if (activePath.includes('/settings/catalog')) return <ProductCatalogPage />;
                if (activePath.includes('/settings/telegram')) return <TelegramPage />;
                if (activePath.includes('/settings/users')) return <UsersPage />;
                if (activePath.includes('/settings/system')) return <SystemPage />;
                if (activePath.includes('/settings/about')) return <AboutPage />;
                return <VendorPage />;
              })()}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

