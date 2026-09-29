import { Customer } from '@/src/domain/schema/customer.schema';
import { useState, useEffect, useMemo } from 'react';
import { Payment } from '@/src/domain/schema/payment.schema';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { resolvePaymentLoai } from '../../domain/resolvePaymentLoai';

const STATE_KEY = 'dataview:payments:state';

export function usePaymentsFilters(payments: Payment[], customers: Customer[] = [], activeTab: string) {
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

  const [selectedTinhTrangThanhToan, setSelectedTinhTrangThanhToan] = useState<string>(() => getInitialFilter('tinhTrangThanhToan', ''));
  const [selectedPhanLoai, setSelectedPhanLoai] = useState<string>(() => getInitialFilter('phanLoai', ''));
  const [selectedTinhThanh, setSelectedTinhThanh] = useState<string>(() => getInitialFilter('tinhThanh', ''));
  const [selectedZns, setSelectedZns] = useState<string>(() => getInitialFilter('zns', ''));
  const [selectedNguoiPhuTrach, setSelectedNguoiPhuTrach] = useState<string>(() => getInitialFilter('nguoiPhuTrach', ''));
  const [selectedDateRange, setSelectedDateRange] = useState<[string, string]>(() => getInitialFilter('dateRange', ['', '']));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const nextState = {
        ...parsed,
        domainFilters: {
          tinhTrangThanhToan: selectedTinhTrangThanhToan,
          phanLoai: selectedPhanLoai,
          tinhThanh: selectedTinhThanh,
          zns: selectedZns,
          nguoiPhuTrach: selectedNguoiPhuTrach,
          dateRange: selectedDateRange
        },
        _local_updatedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }, [selectedTinhTrangThanhToan, selectedPhanLoai, selectedTinhThanh, selectedZns, selectedNguoiPhuTrach, selectedDateRange]);

  const filteredPayments = useMemo(() => {
    let result = payments;
    if (activeTab === 'PENDING') {
      result = result.filter(p => p.tinhTrangThanhToan === 'Công nợ' || p.tinhTrangThanhToan === 'Chưa TT');
    } else if (activeTab === 'PAID') {
      result = result.filter(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || p.tinhTrangThanhToan === 'Miễn phí');
    } else if (activeTab === 'OVERDUE') {
      const nay = new Date().getTime();
      result = result.filter(p => {
        if (p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'Miễn phí' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN') return false;
        if (!p.ngayDenHan) return false;
        const han = new Date(p.ngayDenHan).getTime();
        return nay > han;
      });
    }

    if (selectedTinhTrangThanhToan) {
      const selNorm = selectedTinhTrangThanhToan.trim().toLowerCase();
      result = result.filter(p => {
        const pStatus = (p.tinhTrangThanhToan || '').trim().toLowerCase();
        if (pStatus === selNorm) return true;
        
        if (selNorm === 'tất toán' || selNorm === 'đã thanh toán' || selNorm === 'paid' || selNorm === 'paid_full') {
          return pStatus === 'tất toán' || pStatus === 'đã thanh toán' || pStatus === 'paid' || pStatus === 'paid_full' || pStatus === 'miễn phí';
        }
        if (selNorm === 'tạm ứng' || selNorm === 'thanh toán 1 phần' || selNorm === 'thanh toán một phần' || selNorm === 'paid_partial') {
          return pStatus === 'tạm ứng' || pStatus === 'thanh toán 1 phần' || pStatus === 'thanh toán một phần' || pStatus === 'paid_partial';
        }
        if (selNorm === 'công nợ' || selNorm === 'chưa tt' || selNorm === 'chưa thanh toán' || selNorm === 'unpaid') {
          return pStatus === 'công nợ' || pStatus === 'chưa tt' || pStatus === 'chưa thanh toán' || pStatus === 'unpaid';
        }
        return false;
      });
    }
    if (selectedPhanLoai) {
      const selectedNorm = normalizeLoai(selectedPhanLoai);
      result = result.filter(p => {
        const typeStr = resolvePaymentLoai(p);
        return normalizeLoai(typeStr) === selectedNorm || typeStr === selectedPhanLoai;
      });
    }
    if (selectedTinhThanh) {
      const target = selectedTinhThanh.toLowerCase().trim();
      result = result.filter(p => {
        const prov = (p as any).tinhThanh || customers.find(x => x.id === p.customerId)?.tinhThanh || entityCachePool.get<Customer>('customers', p.customerId || '')?.tinhThanh || '';
        return String(prov).toLowerCase().trim() === target || String(prov).toLowerCase().includes(target);
      });
    }
    if (selectedZns) {
      result = result.filter(p => normalizeLegacyStatus(p.trangThaiGuiTinThanhToan) === selectedZns);
    }
    if (selectedNguoiPhuTrach) {
      result = result.filter(p => p.nguoiPhuTrach === selectedNguoiPhuTrach);
    }
    if (selectedDateRange[0] || selectedDateRange[1]) {
      const [start, end] = selectedDateRange;
      result = result.filter(p => {
        const d = p.ngayThanhToan || (p as any).ngayThu || (p as any).createdAt || '';
        if (!d) return false;
        const dtStr = String(d).substring(0, 10);
        if (start && dtStr < start) return false;
        if (end && dtStr > end) return false;
        return true;
      });
    }

    return result.map(p => ({
      ...p,
      __customerInfo: customers.find(x => x.id === p.customerId) || entityCachePool.get('customers', p.customerId || '') || undefined
    }));
  }, [
    payments, activeTab, selectedTinhTrangThanhToan, selectedPhanLoai, 
    selectedTinhThanh, selectedZns, selectedNguoiPhuTrach, selectedDateRange, customers
  ]);

  return {
    selectedTinhTrangThanhToan, setSelectedTinhTrangThanhToan,
    selectedPhanLoai, setSelectedPhanLoai,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedZns, setSelectedZns,
    selectedNguoiPhuTrach, setSelectedNguoiPhuTrach,
    selectedDateRange, setSelectedDateRange,
    filteredPayments
  };
}
