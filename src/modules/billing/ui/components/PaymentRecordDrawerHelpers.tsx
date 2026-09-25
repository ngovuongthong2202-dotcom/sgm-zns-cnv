import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { Payment } from '@/src/domain/schema/payment.schema';

import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

// 1. MoneyInput Component
export const MoneyInput = React.forwardRef<HTMLInputElement, any>(({ value, onChange, placeholder, readOnly, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  useEffect(() => {
    if (value !== undefined && value !== null && !isNaN(value)) {
       setDisplayValue(new Intl.NumberFormat('vi-VN').format(value) + ' ₫');
    } else {
       setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const num = rawValue ? Number(rawValue) : undefined;
    setDisplayValue(num !== undefined ? new Intl.NumberFormat('vi-VN').format(num) + ' ₫' : '');
    onChange?.(num);
  };

  if (readOnly) {
    return (
       <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 border border-transparent py-2 tabular-nums">
          {displayValue || '0 ₫'}
       </div>
    );
  }

  return (
    <div className="relative">
      <input aria-label="Nhập thông tin" 
        ref={ref} type="text" value={displayValue} onChange={handleChange} placeholder={placeholder} {...props} 
        className="premium-input w-full font-bold text-slate-900 text-lg pr-4 text-right font-mono tabular-nums focus:ring-slate-950 focus:border-slate-950 bg-white" 
      />
    </div>
  );
});
MoneyInput.displayName = 'MoneyInput';


// 2. Activity Log Component
interface ActivityLogProps {
  payment: Payment;
}

export function PaymentRecordActivityLog({ payment }: ActivityLogProps) {
  return (
    <div className="w-full md:w-80 shrink-0 border-l border-slate-100 pl-8 hidden md:block">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2 mb-6">
        <History size={14} /> ACTIVITY LOG
      </h3>
      
      <div className="space-y-6">
        <div className="relative pl-5">
          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full ring-4 ring-white bg-slate-300" />
          <div className="absolute left-1 top-2 bottom-[-24px] w-0.5 bg-slate-100" />
          <div className="text-2xs text-slate-600 font-mono tracking-wider mb-0.5">
            {payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM, HH:mm') : '---'}
          </div>
          <div className="text-sm font-medium text-slate-800">Tạo Phiếu Kế Toán</div>
          <div className="text-xs text-slate-600 mt-1">{payment.nguoiPhuTrach || 'Hệ thống'}</div>
        </div>

        <div className="relative pl-5">
          <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ring-4 ring-white ${normalizeLegacyStatus(String(payment.trangThaiGuiTinThanhToan || '')) !== EntityZnsStatus.CHUA_GUI ? 'bg-blue-500' : 'bg-slate-200'}`} />
          <div className="absolute left-1 top-2 bottom-[-24px] w-0.5 bg-slate-100" />
          <div className="text-2xs text-slate-600 font-mono tracking-wider mb-0.5">ZALO ZNS API</div>
          <div className="text-sm font-medium text-slate-800">Sync Pipeline</div>
          {normalizeLegacyStatus(String(payment.trangThaiGuiTinThanhToan || '')) !== EntityZnsStatus.CHUA_GUI ? (
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold font-mono tracking-tight">{payment.trangThaiGuiTinThanhToan}</span>
          ) : (
            <span className="text-xs text-slate-600 italic block mt-1">Pending Sync</span>
          )}
        </div>

        {payment.tinhTrangThanhToan === 'Tất toán' && (
          <div className="relative pl-5">
            <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full ring-4 ring-white bg-emerald-500" />
            <div className="text-2xs text-slate-600 font-mono tracking-wider mb-0.5">COMPLETED</div>
            <div className="text-sm font-bold text-emerald-700">Đã chốt sổ</div>
          </div>
        )}
      </div>
    </div>
  );
}


// 3. Products Section Component
// Removed to src/modules/billing/ui/components/form/PaymentRecordProductsSection.tsx
