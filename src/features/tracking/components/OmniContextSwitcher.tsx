import React from 'react';
import { FileText, Handshake, CreditCard, ChevronRight } from 'lucide-react';

export type TrackingPersonaType = 'quotation' | 'contract' | 'payment';

export interface OmniContextSwitcherProps {
  activeType: TrackingPersonaType;
  onChangeType: (type: TrackingPersonaType) => void;
  hasQuotation?: boolean;
  hasContract?: boolean;
  hasPayment?: boolean;
  quotationCode?: string;
  contractCode?: string;
  orderCode?: string;
}

export function OmniContextSwitcher({
  activeType,
  onChangeType,
  hasQuotation = true,
  hasContract = true,
  hasPayment = true,
  quotationCode,
  contractCode,
  orderCode,
}: OmniContextSwitcherProps) {
  const tabs = [
    {
      id: 'quotation' as TrackingPersonaType,
      label: 'Báo Giá Thương Mại',
      shortLabel: 'Báo Giá',
      sub: quotationCode || 'BG-SGM',
      icon: FileText,
      available: hasQuotation,
      activeColor: 'bg-white text-amber-900 border-amber-300 shadow-xs ring-1 ring-amber-300/60',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'contract' as TrackingPersonaType,
      label: 'Hợp Đồng Chế Tạo',
      shortLabel: 'Hợp Đồng',
      sub: contractCode || 'HĐKT-SGM',
      icon: Handshake,
      available: hasContract,
      activeColor: 'bg-white text-blue-900 border-blue-300 shadow-xs ring-1 ring-blue-300/60',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'payment' as TrackingPersonaType,
      label: 'Đơn Hàng & Thanh Toán',
      shortLabel: 'Thanh Toán',
      sub: orderCode || 'ĐH-SGM',
      icon: CreditCard,
      available: hasPayment,
      activeColor: 'bg-white text-emerald-900 border-emerald-300 shadow-xs ring-1 ring-emerald-300/60',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 font-sans">
      <div className="bg-slate-100/90 border border-slate-200/90 p-1 rounded-2xl flex items-center gap-1 shadow-2xs overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeType === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeType(tab.id)}
              className={`flex-1 min-w-[130px] md:min-w-0 px-3.5 py-2 rounded-xl text-left transition-all duration-200 border flex items-center justify-between gap-2.5 cursor-pointer ${
                isActive
                  ? tab.activeColor
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? tab.badgeColor : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate leading-tight">
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="inline sm:hidden">{tab.shortLabel}</span>
                  </div>
                  <div className="text-3xs text-slate-600 truncate font-semibold font-sans tabular-nums mt-0.5">
                    {tab.sub}
                  </div>
                </div>
              </div>

              {isActive && (
                <span className="hidden md:flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
