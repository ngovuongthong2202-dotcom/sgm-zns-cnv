import React from 'react';
import { Phone, ShieldCheck, Sparkles, FileText, FileCheck, CreditCard } from 'lucide-react';
import { PortalContextType } from '../types';

interface TrackingHeaderProps {
  portalMode: PortalContextType;
  hotline?: string;
}

export function TrackingHeader({ portalMode, hotline = '0932000999' }: TrackingHeaderProps) {
  const meta = React.useMemo(() => {
    switch (portalMode) {
      case 'QUOTATION':
        return {
          subtitle: 'CƠ KHÍ CÔNG NGHIỆP SÀI GÒN • BÁO GIÁ ĐIỆN TỬ',
          title: 'Cổng Tra Cứu & Xác Nhận Báo Giá Thương Mại',
          badge: 'Báo Giá Chính Thức',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <FileText className="w-4 h-4 text-emerald-600" />
        };
      case 'CONTRACT':
        return {
          subtitle: 'CƠ KHÍ CÔNG NGHIỆP SÀI GÒN • HỢP ĐỒNG KINH TẾ',
          title: 'Cổng Giám Sát Tiến Độ Hợp Đồng & Chế Tạo Máy',
          badge: 'Hiệu Lực Sản Xuất',
          badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <FileCheck className="w-4 h-4 text-blue-600" />
        };
      case 'PAYMENT':
      case 'ORDER':
      default:
        return {
          subtitle: 'CƠ KHÍ CÔNG NGHIỆP SÀI GÒN • TÀI CHÍNH & BẢO HÀNH',
          title: 'Cổng Đối Soát Thanh Toán & Bảo Hành Xuất Kho',
          badge: 'Minh Bạch Tài Chính',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <CreditCard className="w-4 h-4 text-amber-600" />
        };
    }
  }, [portalMode]);

  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-2xs shrink-0">
            <img src="/sgm-logo.png" alt="SGM Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-2xs font-extrabold tracking-wider text-slate-500 uppercase flex items-center gap-1.5 truncate">
              <span>{meta.subtitle}</span>
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
              {meta.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.badgeColor}`}>
            {meta.icon}
            <span>{meta.badge}</span>
          </span>
          <a 
            href={`tel:${hotline}`} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all shadow-2xs"
            title="Gọi Hotline tư vấn kỹ thuật"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Hotline</span>
            <span className="tabular-nums font-bold">0932.000.999</span>
          </a>
        </div>
      </div>
    </header>
  );
}
