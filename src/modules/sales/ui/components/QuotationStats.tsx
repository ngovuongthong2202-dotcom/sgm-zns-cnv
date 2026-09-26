import React, { useMemo } from 'react';
import { Target, Cpu, Package, Briefcase, FileCheck2 } from 'lucide-react';
import { normalizeLoai } from '@/src/domain/enums/quotation-loai';

interface Props {
  quotations: import('@/src/domain/schema/quotation.schema').Quotation[];
  allContracts: import('@/src/domain/schema/contract.schema').Contract[];
  allPayments: import('@/src/domain/schema/payment.schema').Payment[];
  selectedLoai: string;
  setSelectedLoai: (val: string) => void;
  selectedTienDo?: string;
  setSelectedTienDo?: (val: string) => void;
}

export const isQuotationWithContract = (q: any, allContracts: any[] = []): boolean => {
  if (!q || !Array.isArray(allContracts)) return false;
  return allContracts.some((c: any) => 
    (c.quotationId && (c.quotationId === q.id || c.quotationId === q.soBaoGia || c.quotationId === q.soPhieuBaoGia)) ||
    (c.soBaoGia && (c.soBaoGia === q.soBaoGia || c.soBaoGia === q.soPhieuBaoGia || c.soBaoGia === q.id)) ||
    (c.soPhieuBaoGia && (c.soPhieuBaoGia === q.soBaoGia || c.soPhieuBaoGia === q.soPhieuBaoGia || c.soPhieuBaoGia === q.id))
  );
};

export function QuotationStats({ 
  quotations, 
  allContracts,
  allPayments,
  selectedLoai, 
  setSelectedLoai,
  selectedTienDo,
  setSelectedTienDo
}: Props) {
  const stats = useMemo(() => {
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
      if (isQuotationWithContract(q, allContracts)) return true;

      const hasPayment = (allPayments || []).some(p => 
        (p.quotationId && (p.quotationId === q.id || p.quotationId === q.soBaoGia || p.quotationId === q.soPhieuBaoGia)) ||
        (p.soPhieuBaoGia && (p.soPhieuBaoGia === q.soBaoGia || p.soPhieuBaoGia === q.soPhieuBaoGia || p.soPhieuBaoGia === q.id))
      );
      return hasPayment;
    };

    const formatCurrency = (val: number | null | undefined) => {
      if (val === null || val === undefined || isNaN(val)) return '0 đ';
      if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
      if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
      return val.toLocaleString('vi-VN');
    };

    const calcStats = (type: string | null) => {
      const normalizedType = normalizeLoai(type);
      const filtered = normalizedType ? quotations.filter(q => normalizeLoai(q.loai) === normalizedType) : quotations;
      
      const count = filtered.length;
      const totalValue = filtered.reduce((sum, q) => sum + getQuotationVal(q), 0);
      
      const chotQuotations = filtered.filter(q => isQuotationChot(q));
      const dsChot = chotQuotations.reduce((sum, q) => sum + getQuotationVal(q), 0);
      
      const winRate = count > 0 ? (chotQuotations.length / count) * 100 : 0;
      
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

    // Thống kê riêng cho Báo giá đã có Hợp đồng
    const contractQuotes = quotations.filter(q => isQuotationWithContract(q, allContracts));
    const contractCount = contractQuotes.length;
    const contractTotalVal = contractQuotes.reduce((sum, q) => sum + getQuotationVal(q), 0);
    const contractRate = quotations.length > 0 ? (contractCount / quotations.length) * 100 : 0;

    const hasContractStat = {
      count: contractCount,
      totalValue: formatCurrency(contractTotalVal),
      totalPayment: formatCurrency(contractTotalVal),
      winRate: contractRate.toFixed(1) + '%'
    };

    const isContractFilterActive = selectedTienDo === 'CO_HOP_DONG';

    return [
      {
        id: 'ALL', label: 'Toàn Bộ Báo Giá', type: '',
        ...all, icon: Target, iconColor: 'bg-slate-100 text-slate-600',
        barColor: 'bg-slate-600',
        isActive: !selectedLoai && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'MAY', label: 'Báo Giá Máy', type: 'BG Máy',
        ...may, icon: Cpu, iconColor: 'bg-blue-100 text-blue-600',
        barColor: 'bg-blue-500',
        isActive: selectedLoai === 'BG Máy' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'VAT_TU', label: 'Báo Giá Vật Tư', type: 'BG Vật tư',
        ...vattu, icon: Package, iconColor: 'bg-emerald-100 text-emerald-600',
        barColor: 'bg-emerald-500',
        isActive: selectedLoai === 'BG Vật tư' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'DICH_VU', label: 'Báo Giá Dịch Vụ', type: 'BG Dịch vụ',
        ...dichvu, icon: Briefcase, iconColor: 'bg-amber-100 text-amber-600',
        barColor: 'bg-amber-500',
        isActive: selectedLoai === 'BG Dịch vụ' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'HAS_CONTRACT', label: 'Đã Có Hợp Đồng', type: 'CO_HOP_DONG',
        ...hasContractStat, icon: FileCheck2, iconColor: 'bg-violet-100 text-violet-700',
        barColor: 'bg-violet-600',
        isActive: isContractFilterActive,
        isContractCard: true
      }
    ];
  }, [quotations, allContracts, allPayments, selectedLoai, selectedTienDo]);

  const handleCardClick = (stat: typeof stats[0]) => {
    if (stat.isContractCard) {
      if (selectedTienDo === 'CO_HOP_DONG') {
        setSelectedTienDo?.('');
      } else {
        setSelectedLoai('');
        setSelectedTienDo?.('CO_HOP_DONG');
      }
      return;
    }

    // Card 1-4: reset selectedTienDo if it was set
    if (selectedTienDo) {
      setSelectedTienDo?.('');
    }
    setSelectedLoai(stat.type);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2 select-none">
      {stats.map((stat, idx) => {
        let activeBorders = 'border-slate-200/80 bg-white hover:border-slate-300';
        if (stat.isActive) {
          activeBorders = stat.isContractCard
            ? 'border-violet-400 bg-violet-50/60 ring-1 ring-violet-400/20'
            : 'border-slate-400 bg-slate-50 ring-1 ring-slate-400/10';
        }

        return (
          <div
            key={idx}
            onClick={() => handleCardClick(stat)}
            role="button"
            tabIndex={0}
            className={`relative border rounded-xl p-2.5 lg:p-2 lg:px-2 xl:p-2.5 flex flex-col gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all select-none overflow-hidden duration-150 cursor-pointer active:scale-[0.98] ${activeBorders}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-2xs lg:text-3xs xl:text-2xs font-bold uppercase tracking-wider text-slate-600 font-sans truncate">
                {stat.label}
              </span>
              <div className={`w-5 h-5 xl:w-6 xl:h-6 shrink-0 rounded-md flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon size={12} strokeWidth={2.5} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 mt-0.5">
              <div className="flex flex-col min-w-0">
                <span className="text-3xs text-slate-500 font-medium truncate">SL / Giá trị</span>
                <span className="text-xs font-semibold text-slate-900 truncate">{stat.count} / {stat.totalValue}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-3xs text-slate-500 font-medium truncate">DS Chốt</span>
                <span className="text-xs font-semibold text-emerald-600 truncate">{stat.totalPayment}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-3xs text-slate-500 font-medium">Tỷ lệ chốt HĐ</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.barColor || 'bg-emerald-500'} rounded-full transition-all`} style={{ width: stat.winRate }} />
                  </div>
                  <span className="text-2xs font-bold text-slate-700 shrink-0">{stat.winRate}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
