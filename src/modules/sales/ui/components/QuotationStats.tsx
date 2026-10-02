import React, { useMemo } from 'react';
import { Target, Cpu, Package, Briefcase, FileCheck2 } from 'lucide-react';
import { normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';

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
      if (val === null || val === undefined || isNaN(val)) return '0 ₫';
      return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
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
        rawTotalValue: totalValue,
        rawDsChot: dsChot,
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
      rawTotalValue: contractTotalVal,
      rawDsChot: contractTotalVal,
      totalValue: formatCurrency(contractTotalVal),
      totalPayment: formatCurrency(contractTotalVal),
      winRate: contractRate.toFixed(1) + '%'
    };

    const isContractFilterActive = selectedTienDo === 'CO_HOP_DONG';

    return [
      {
        id: 'ALL', label: 'Toàn Bộ Báo Giá', type: '',
        ...all, icon: Target, iconColor: 'bg-slate-100 text-slate-700',
        barColor: 'bg-slate-700',
        activeClasses: 'border-slate-500 bg-slate-50/90 ring-2 ring-slate-400/20 shadow-sm',
        isActive: !selectedLoai && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'MAY', label: 'Báo Giá Máy', type: 'BG Máy',
        ...may, icon: Cpu, iconColor: 'bg-blue-100 text-blue-700',
        barColor: 'bg-blue-600',
        activeClasses: 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/20 shadow-sm',
        isActive: selectedLoai === 'BG Máy' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'VAT_TU', label: 'Báo Giá Vật Tư', type: 'BG Vật tư',
        ...vattu, icon: Package, iconColor: 'bg-emerald-100 text-emerald-700',
        barColor: 'bg-emerald-600',
        activeClasses: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20 shadow-sm',
        isActive: selectedLoai === 'BG Vật tư' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'DICH_VU', label: 'Báo Giá Dịch Vụ', type: 'BG Dịch vụ',
        ...dichvu, icon: Briefcase, iconColor: 'bg-amber-100 text-amber-700',
        barColor: 'bg-amber-600',
        activeClasses: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/20 shadow-sm',
        isActive: selectedLoai === 'BG Dịch vụ' && !isContractFilterActive,
        isContractCard: false
      },
      {
        id: 'HAS_CONTRACT', label: 'Đã Có Hợp Đồng', type: 'CO_HOP_DONG',
        ...hasContractStat, icon: FileCheck2, iconColor: 'bg-teal-100 text-teal-700',
        barColor: 'bg-teal-600',
        activeClasses: 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-400/20 shadow-sm',
        isActive: isContractFilterActive,
        isContractCard: true
      }
    ];
  }, [quotations, allContracts, allPayments, selectedLoai, selectedTienDo]);

  const handleCardClick = (stat: typeof stats[0]) => {
    // Toggle off if already active
    if (stat.isActive) {
      setSelectedLoai('');
      setSelectedTienDo?.('');
      return;
    }

    if (stat.isContractCard) {
      setSelectedLoai('');
      setSelectedTienDo?.('CO_HOP_DONG');
      return;
    }

    // Reset contract filter and set category
    if (selectedTienDo) {
      setSelectedTienDo?.('');
    }
    setSelectedLoai(stat.type);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-2.5 select-none">
      {stats.map((stat, idx) => {
        let borderAndBg = 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs';
        if (stat.isActive) {
          borderAndBg = stat.activeClasses;
        }

        const verbalText = readVietnameseCurrency(stat.rawTotalValue);
        const fullTooltip = verbalText 
          ? `${stat.totalValue} (${verbalText})\nGồm: ${stat.count} Báo giá`
          : `${stat.totalValue} - Gồm ${stat.count} Báo giá`;

        return (
          <div
            key={idx}
            onClick={() => handleCardClick(stat)}
            role="button"
            tabIndex={0}
            className={`relative border rounded-xl p-2.5 flex flex-col justify-between gap-1.5 transition-all select-none duration-150 cursor-pointer active:scale-[0.99] ${borderAndBg}`}
          >
            {/* Hàng 1: Tiêu đề + Huy hiệu số lượng + Icon */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-700 font-sans truncate">
                  {stat.label}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-3xs font-black bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                  {stat.count} BG
                </span>
              </div>
              <div className={`w-5 h-5 xl:w-6 xl:h-6 shrink-0 rounded-md flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon size={13} strokeWidth={2.5} />
              </div>
            </div>

            {/* Hàng 2: FULL GIÁ TRỊ TIỀN TỆ (Adaptive Typography - Không bao giờ truncate) */}
            <div className="flex flex-col mt-0.5 min-w-0">
              <span className="text-3xs text-slate-500 font-semibold uppercase tracking-wide">
                Tổng giá trị
              </span>
              <span 
                className={`font-bold font-currency tabular-nums tracking-tight text-slate-950 leading-snug whitespace-nowrap overflow-visible ${
                  stat.totalValue.length > 17
                    ? 'text-2xs xl:text-xs'
                    : stat.totalValue.length > 14
                      ? 'text-xs xl:text-sm'
                      : 'text-sm xl:text-base'
                }`}
                title={fullTooltip}
              >
                {stat.totalValue}
              </span>
            </div>

            {/* Hàng 3: DS Chốt & Thanh tiến độ Tỷ lệ ký HĐ */}
            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 items-end mt-0.5">
              <div className="flex flex-col min-w-0">
                <span className="text-3xs text-slate-500 font-medium truncate">DS Chốt</span>
                <span 
                  className="text-2xs xl:text-xs font-bold font-currency tabular-nums text-emerald-700 truncate"
                  title={`${stat.totalPayment} (Doanh số chốt thành công)`}
                >
                  {stat.totalPayment}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center justify-between text-3xs text-slate-500 mb-0.5">
                  <span className="truncate">Tỷ lệ</span>
                  <span className="font-bold text-slate-800 shrink-0">{stat.winRate}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stat.barColor} rounded-full transition-all duration-300`} 
                    style={{ width: stat.winRate }} 
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

