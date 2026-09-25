import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import { normalizeLoai } from '@/src/domain/enums/quotation-loai';

interface Props {
  quotations: import('@/src/domain/schema/quotation.schema').Quotation[];
  allContracts: import('@/src/domain/schema/contract.schema').Contract[];
  allPayments: import('@/src/domain/schema/payment.schema').Payment[];
  selectedLoai: string;
  setSelectedLoai: (val: string) => void;
}

export function QuotationStats({ 
  quotations, 
  allContracts,
  allPayments,
  selectedLoai, setSelectedLoai
}: Props) {
  const stats = useMemo(() => {
    const calcStats = (type: string | null) => {
      const normalizedType = normalizeLoai(type);
      const filtered = normalizedType ? quotations.filter(q => normalizeLoai(q.loai) === normalizedType) : quotations;
      
      const count = filtered.length;
      const totalValue = filtered.reduce((sum, q) => {
        const prodList = Array.isArray(q.products) ? q.products : [];
        return sum + (prodList.reduce((acc: number, p: import('@/src/domain/schema/product.schema').ProductItem) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0);
      }, 0);
      
      let totalPayment = 0;
      filtered.forEach(q => {
        // Find payments linked directly to quotation
        const directPayments = allPayments.filter(p => p.quotationId === q.id);
        totalPayment += directPayments.reduce((acc, p) => acc + (p.soTien || 0), 0);
        
        // Find payments linked to contracts that are linked to this quotation
        const linkedContracts = allContracts.filter(c => c.quotationId === q.id);
        linkedContracts.forEach(c => {
          const contractPayments = allPayments.filter(p => p.contractId === c.id);
          totalPayment += contractPayments.reduce((acc, p) => acc + (p.soTien || 0), 0);
        });
      });
      
      const winRate = totalValue > 0 ? (totalPayment / totalValue) * 100 : 0;
      
      const formatCurrency = (val: number | null | undefined) => {
         if (val === null || val === undefined || isNaN(val)) return '0 đ';
         if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
         if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
         return val.toLocaleString('vi-VN');
      };
      
      return { 
        count, 
        totalValue: formatCurrency(totalValue), 
        totalPayment: formatCurrency(totalPayment), 
        winRate: winRate.toFixed(1) + '%'
      };
    };

    const all = calcStats(null);
    const may = calcStats('BG Máy');
    const vattu = calcStats('BG Vật tư');
    const dichvu = calcStats('BG Dịch vụ');

    return [
      {
        id: 'ALL', label: 'Toàn Bộ Báo Giá', type: '',
        ...all, icon: Target, iconColor: 'bg-slate-100 text-slate-600',
        isActive: !selectedLoai
      },
      {
        id: 'MAY', label: 'Báo Giá Máy', type: 'BG Máy',
        ...may, icon: Target, iconColor: 'bg-blue-100 text-blue-600',
        isActive: selectedLoai === 'BG Máy'
      },
      {
        id: 'VAT_TU', label: 'Báo Giá Vật Tư', type: 'BG Vật tư',
        ...vattu, icon: Target, iconColor: 'bg-emerald-100 text-emerald-600',
        isActive: selectedLoai === 'BG Vật tư'
      },
      {
        id: 'DICH_VU', label: 'Báo Giá Dịch Vụ', type: 'BG Dịch vụ',
        ...dichvu, icon: Target, iconColor: 'bg-amber-100 text-amber-600',
        isActive: selectedLoai === 'BG Dịch vụ'
      }
    ];
  }, [quotations, allContracts, allPayments, selectedLoai]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-2.5">
      {stats.map((stat, idx) => {
        let activeBorders = 'border-slate-200/80 bg-white hover:border-slate-300';
        if (stat.isActive) {
          activeBorders = 'border-slate-400 bg-slate-50 ring-1 ring-slate-400/10';
        }

        return (
          <div
            key={idx}
            onClick={() => setSelectedLoai(stat.type)}
            role="button"
            tabIndex={0}
            className={`relative border rounded-xl p-3 flex flex-col gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all select-none overflow-hidden duration-150 cursor-pointer active:scale-[0.98] ${activeBorders}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 font-sans">
                {stat.label}
              </span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon size={12} strokeWidth={2.5} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-1">
              <div className="flex flex-col">
                <span className="text-2xs text-slate-500 font-medium">SL / Giá trị</span>
                <span className="text-xs font-semibold text-slate-900">{stat.count} / {stat.totalValue}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-slate-500 font-medium">DS Chốt</span>
                <span className="text-xs font-semibold text-emerald-600">{stat.totalPayment}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-2xs text-slate-500 font-medium">Tỷ lệ chốt</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: stat.winRate }} />
                  </div>
                  <span className="text-2xs font-bold text-slate-700">{stat.winRate}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
