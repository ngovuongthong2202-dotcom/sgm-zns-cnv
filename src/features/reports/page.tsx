import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/src/design-system/PageHeader';

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden animate-in fade-in">
      <PageHeader 
        title="Dashboard & Báo cáo" 
        meta="Chào mừng bạn quay trở lại! Bạn có thể bắt đầu lập báo cáo tại đây." 
      />
      
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
          <LayoutDashboard size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Trang chủ Dashboard & Báo cáo</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
          Chào mừng bạn quay trở lại! Bạn có thể bắt đầu xây dựng cấu trúc Dashboard và báo cáo hoàn toàn mới của doanh nghiệp tại đây.
        </p>
      </div>
    </div>
  );
}
