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
      
      const getQuotationVal = (q: any): number => {
        const prodSum = Array.isArray(q.products)
          ? q.products.reduce((acc: number, p: any) => acc + ((Number(p.price || p.donGia) || 0) * (Number(p.quantity || p.soLuong) || 1)), 0)
          : (Array.isArray(q.sanPham) 
              ? q.sanPham.reduce((acc: number, p: any) => acc + ((Number(p.donGia || p.price) || 0) * (Number(p.soLuong || p.quantity) || 1)), 0)
              : 0);
        return Number(q.totalAmount || q.tongGiaTri || q.tongTien) || prodSum || 0;
      };

      const isQuotationChot = (q: any): boolean => {
        const status = String(q.tinhTrangBaoGia || q.trangThai || '').toUpperCase();
        if (status.includes('CHỐT') || status.includes('ĐÃ KÝ') || status.includes('THÀNH CÔNG') || status.includes('HOÀN TẤT')) {
          return true;
        }

        // Kiểm tra hợp đồng liên kết
        const hasContract = (allContracts || []).some((c: any) => 
          (c.quotationId && (c.quotationId === q.id || c.quotationId === q.soBaoGia || c.quotationId === q.soPhieuBaoGia)) ||
          (c.soBaoGia && (c.soBaoGia === q.soBaoGia || c.soBaoGia === q.soPhieuBaoGia || c.soBaoGia === q.id)) ||
          (c.soPhieuBaoGia && (c.soPhieuBaoGia === q.soBaoGia || c.soPhieuBaoGia === q.soPhieuBaoGia || c.soPhieuBaoGia === q.id))
        );
        if (hasContract) return true;

        // Kiểm tra thanh toán liên kết
        const hasPayment = (allPayments || []).some(p => 
          (p.quotationId && (p.quotationId === q.id || p.quotationId === q.soBaoGia || p.quotationId === q.soPhieuBaoGia)) ||
          (p.soPhieuBaoGia && (p.soPhieuBaoGia === q.soBaoGia || p.soPhieuBaoGia === q.soPhieuBaoGia || p.soPhieuBaoGia === q.id))
        );
        if (hasPayment) return true;

        return false;
      };

      const count = filtered.length;
      const totalValue = filtered.reduce((sum, q) => sum + getQuotationVal(q), 0);
      
      const chotQuotations = filtered.filter(isQuotationChot);
      const dsChot = chotQuotations.reduce((sum, q) => sum + getQuotationVal(q), 0);
      
      const winRate = count > 0 ? (chotQuotations.length / count) * 100 : 0;
      
      const formatCurrency = (val: number | null | undefined) => {
         if (val === null || val === undefined || isNaN(val)) return '0 đ';
         if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
         if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
         return val.toLocaleString('vi-VN');
      };
      
      return { 
        count, 
        totalValue: formatCurrency(totalValue), 
        totalPayment: formatCurrency(dsChot), 
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
