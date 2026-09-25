import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { useState, useEffect, useMemo } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

const STATE_KEY = 'dataview:contracts:state';

export function useContractsFilters(
  contracts: Contract[], 
  realtimePayments: Payment[], 
  realtimeDeliveries: Delivery[], 
  customerTinhThanhMap: Map<string, string>
) {
  const getInitialFilter = (key: string, defaultVal: string | string[] = '') => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.domainFilters?.[key] !== undefined) return parsed.domainFilters[key];
      }
    } catch {
      // ignore
    }
    return defaultVal;
  };

  const [selectedNguoiPhuTrach, setSelectedNguoiPhuTrach] = useState<string>(() => getInitialFilter('nguoiPhuTrach', ''));
  const [selectedZns, setSelectedZns] = useState<string>(() => getInitialFilter('zns', ''));
  const [selectedTinhThanh, setSelectedTinhThanh] = useState<string>(() => getInitialFilter('tinhThanh', ''));
  const [selectedDkHoanThanh, setSelectedDkHoanThanh] = useState<string>(() => getInitialFilter('dkHoanThanh', ''));
  const [selectedTienDoTT, setSelectedTienDoTT] = useState<string>(() => getInitialFilter('tienDoTT', ''));
  const [selectedTienDoGiao, setSelectedTienDoGiao] = useState<string>(() => getInitialFilter('tienDoGiao', ''));
  const [selectedDateRange, setSelectedDateRange] = useState<[string, string]>(() => getInitialFilter('dateRange', ['', '']));
  const [activeKpiFilter, setActiveKpiFilter] = useState<'ALL' | 'UNPAID' | 'UNDELIVERED' | 'OVERDUE' | 'UPCOMING' | 'TOTAL' | 'PAID'>(() => getInitialFilter('activeKpiFilter', 'ALL'));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const nextState = {
        ...parsed,
        domainFilters: {
          nguoiPhuTrach: selectedNguoiPhuTrach,
          zns: selectedZns,
          tinhThanh: selectedTinhThanh,
          dkHoanThanh: selectedDkHoanThanh,
          tienDoTT: selectedTienDoTT,
          tienDoGiao: selectedTienDoGiao,
          dateRange: selectedDateRange,
          activeKpiFilter
        },
        _local_updatedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }, [selectedNguoiPhuTrach, selectedZns, selectedTinhThanh, selectedDkHoanThanh, selectedTienDoTT, selectedTienDoGiao, selectedDateRange, activeKpiFilter]);

  const filteredContracts = useMemo(() => {
    let res = contracts;

    if (selectedNguoiPhuTrach) {
      res = res.filter(c => c.nguoiPhuTrach === selectedNguoiPhuTrach);
    }
    if (selectedZns) {
      res = res.filter(c => normalizeLegacyStatus(c.trangThaiGuiTinHopDong) === selectedZns);
    }
    if (selectedTinhThanh) {
      res = res.filter(c => customerTinhThanhMap.get(c.customerId || '') === selectedTinhThanh);
    }
    if (selectedDkHoanThanh) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      res = res.filter(c => {
         if (!c.ngayKy || !c.soNgayDuKienHoanThanh) return false;
         const dt = new Date(c.ngayKy);
         dt.setDate(dt.getDate() + c.soNgayDuKienHoanThanh);
         dt.setHours(0,0,0,0);
         
         if (selectedDkHoanThanh === 'TODAY') {
             return dt.getTime() === today.getTime();
         } else if (selectedDkHoanThanh === 'OVERDUE') {
             return dt.getTime() < today.getTime();
         } else if (selectedDkHoanThanh === 'UPCOMING') {
             const in3Days = new Date(today);
             in3Days.setDate(in3Days.getDate() + 3);
             return dt.getTime() > today.getTime() && dt.getTime() <= in3Days.getTime();
         }
         return true;
      });
    }
    if (selectedTienDoTT) {
      res = res.filter(c => {
        const pays = realtimePayments.filter((p: Payment) => p.contractId === c.id);
        const totalContractAmount = c.totalAmount || c.products?.reduce((sum: number, p: import('@/src/domain/schema/product.schema').ProductItem) => sum + (p.total || 0), 0) || 1;
        const totalPaid = pays
          .filter((p: Payment) => ['ĐÃ THANH TOÁN', 'Đã thanh toán', 'Đã TT', 'Tất toán'].includes(p.tinhTrangThanhToan || ''))
          .reduce((sum: number, p: Payment) => sum + (p.soTien || 0), 0);
        const pct = Math.min(100, Math.round((totalPaid / totalContractAmount) * 100));

        if (selectedTienDoTT === 'CHUA_TT') return pct === 0;
        if (selectedTienDoTT === 'DANG_TT') return pct > 0 && pct < 100;
        if (selectedTienDoTT === 'DA_TT') return pct === 100;
        return true;
      });
    }
    if (selectedTienDoGiao) {
      res = res.filter(c => {
        const dels = realtimeDeliveries.filter((d: Delivery) => d.contractId === c.id);
        const totalContractQty = c.products?.reduce((sum: number, p: import('@/src/domain/schema/product.schema').ProductItem) => sum + (p.quantity || 0), 0) || c.slMay || 1;
        const totalDeliveredQty = dels
          .filter((d: Delivery) => d.ngayGiaoThucTe != null)
          .reduce((sum: number, d: Delivery) => {
            const qtyInShipment = d.products?.reduce((s: number, p: import('@/src/domain/schema/product.schema').ProductItem) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
            return sum + qtyInShipment;
          }, 0);
        const pct = Math.min(100, Math.round((totalDeliveredQty / totalContractQty) * 100));

        if (selectedTienDoGiao === 'CHUA_GIAO') return pct === 0;
        if (selectedTienDoGiao === 'DANG_GIAO') return pct > 0 && pct < 100;
        if (selectedTienDoGiao === 'DA_GIAO') return pct === 100;
        return true;
      });
    }
    if (selectedDateRange[0] || selectedDateRange[1]) {
      const [start, end] = selectedDateRange;
      res = res.filter(c => {
        const d = c.ngayKy || '';
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (activeKpiFilter === 'TOTAL') return res;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (activeKpiFilter === 'UNPAID') {
       res = res.filter(c => {
         const pays = realtimePayments.filter((p: Payment) => p.contractId === c.id);
         const paid = pays.filter((p: Payment) => ['ĐÃ THANH TOÁN', 'Đã thanh toán', 'Đã TT', 'Tất toán'].includes(p.tinhTrangThanhToan || '')).reduce((s: number, p: Payment) => s + (p.soTien || 0), 0);
         const total = c.totalAmount || c.products?.reduce((sum: number, p: import('@/src/domain/schema/product.schema').ProductItem) => sum + (p.total || 0), 0) || 0;
         return paid < total;
       });
    } else if (activeKpiFilter === 'PAID') {
       res = res.filter(c => {
         const pays = realtimePayments.filter((p: Payment) => p.contractId === c.id);
         const paid = pays.filter((p: Payment) => ['ĐÃ THANH TOÁN', 'Đã thanh toán', 'Đã TT', 'Tất toán'].includes(p.tinhTrangThanhToan || '')).reduce((s: number, p: Payment) => s + (p.soTien || 0), 0);
         const total = c.totalAmount || c.products?.reduce((sum: number, p: import('@/src/domain/schema/product.schema').ProductItem) => sum + (p.total || 0), 0) || 0;
         return total > 0 && paid >= total;
       });
    } else if (activeKpiFilter === 'UNDELIVERED') {
       res = res.filter(c => {
         const dels = realtimeDeliveries.filter((d: Delivery) => d.contractId === c.id);
         const delQty = dels.filter((d: Delivery) => d.ngayGiaoThucTe).reduce((sum: number, d: Delivery) => sum + (d.products?.reduce((s: number, p: import('@/src/domain/schema/product.schema').ProductItem) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0), 0);
         const maxQty = c.products?.reduce((sum: number, p: import('@/src/domain/schema/product.schema').ProductItem) => sum + (p.quantity || 0), 0) || c.slMay || 0;
         return delQty < maxQty;
       });
    } else if (activeKpiFilter === 'OVERDUE' || activeKpiFilter === 'UPCOMING') {
       res = res.filter(c => {
         if (!c.ngayKy || !c.soNgayDuKienHoanThanh) return false;
         const dt = new Date(c.ngayKy);
         dt.setDate(dt.getDate() + c.soNgayDuKienHoanThanh);
         dt.setHours(0,0,0,0);
         if (activeKpiFilter === 'OVERDUE') return dt.getTime() < today.getTime();
         
         const in3Days = new Date(today);
         in3Days.setDate(in3Days.getDate() + 3);
         return dt.getTime() > today.getTime() && dt.getTime() <= in3Days.getTime();
       });
    }

    return res;
  }, [contracts, selectedNguoiPhuTrach, selectedZns, selectedTinhThanh, selectedDkHoanThanh, selectedTienDoTT, selectedTienDoGiao, selectedDateRange, activeKpiFilter, realtimePayments, realtimeDeliveries, customerTinhThanhMap]);

  return {
    selectedNguoiPhuTrach, setSelectedNguoiPhuTrach,
    selectedZns, setSelectedZns,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedDkHoanThanh, setSelectedDkHoanThanh,
    selectedTienDoTT, setSelectedTienDoTT,
    selectedTienDoGiao, setSelectedTienDoGiao,
    selectedDateRange, setSelectedDateRange,
    activeKpiFilter, setActiveKpiFilter,
    filteredContracts
  };
}
