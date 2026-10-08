import React from 'react';
import { TrackingPersonaType } from './OmniContextSwitcher';
import { CheckCircle2, CalendarCheck, Copy, PhoneCall } from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';

export interface MobileStickyActionDockProps {
  activeType: TrackingPersonaType;
  totalAmount?: number;
  remainingDebt?: number;
  accountNumber?: string;
  onAgreeQuotation?: () => void;
  onRegisterInspection?: () => void;
  onCopyAccountNumber?: () => void;
  onCallHotline?: () => void;
}

export function MobileStickyActionDock({
  activeType,
  totalAmount = 0,
  remainingDebt = 0,
  accountNumber = '',
  onAgreeQuotation,
  onRegisterInspection,
  onCopyAccountNumber,
  onCallHotline,
}: MobileStickyActionDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 shadow-lg font-sans">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {activeType === 'quotation' && (
          <>
            <div className="min-w-0">
              <div className="text-3xs uppercase font-semibold text-slate-600">Tổng Giá Trị Báo Giá</div>
              <div className="text-sm font-bold text-amber-700 font-sans tabular-nums truncate">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onCallHotline}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                title="Gọi tư vấn"
              >
                <PhoneCall className="w-4 h-4 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={onAgreeQuotation}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đồng Ý Báo Giá
              </button>
            </div>
          </>
        )}

        {activeType === 'contract' && (
          <>
            <div className="min-w-0">
              <div className="text-3xs uppercase font-semibold text-slate-600">Tiến Độ Chế Tạo</div>
              <div className="text-xs font-bold text-blue-800 font-sans truncate">
                Đang Triển Khai Tại Xưởng
              </div>
            </div>
            <button
              type="button"
              onClick={onRegisterInspection}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Đăng Ký Nghiệm Thu
            </button>
          </>
        )}

        {activeType === 'payment' && (
          <>
            <div className="min-w-0">
              <div className="text-3xs uppercase font-semibold text-slate-600">Công Nợ Còn Lại</div>
              <div className="text-sm font-bold text-emerald-800 font-sans tabular-nums truncate">
                {formatCurrency(remainingDebt)}
              </div>
            </div>
            <button
              type="button"
              onClick={onCopyAccountNumber}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Sao Chép STK SGM
            </button>
          </>
        )}
      </div>
    </div>
  );
}
