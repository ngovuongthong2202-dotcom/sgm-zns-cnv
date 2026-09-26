import { useState, useEffect, useMemo } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { isQuotationWithContract } from '../components/QuotationStats';

const STATE_KEY = 'dataview:quotations:state';

export function useQuotationsFilters(
  quotations: Quotation[],
  allContracts: import('@/src/domain/schema/contract.schema').Contract[] = [],
  allPayments: import('@/src/domain/schema/payment.schema').Payment[] = [],
  allDeliveries: import('@/src/domain/schema/delivery.schema').Delivery[] = [],
  customerTinhThanhMap: Map<string, string> = new Map()
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

  const [selectedLoai, setSelectedLoai] = useState<string>(() => getInitialFilter('loai', ''));
  const [selectedZns, setSelectedZns] = useState<string>(() => getInitialFilter('zns', ''));
  const [selectedNguoiPhuTrach, setSelectedNguoiPhuTrach] = useState<string>(() => getInitialFilter('nguoiPhuTrach', ''));
  const [selectedTinhThanh, setSelectedTinhThanh] = useState<string>(() => getInitialFilter('tinhThanh', ''));
  const [selectedHieuLuc, setSelectedHieuLuc] = useState<string>(() => getInitialFilter('hieuLuc', ''));
  const [selectedTienDo, setSelectedTienDo] = useState<string>(() => getInitialFilter('tienDo', ''));
  const [selectedDateRange, setSelectedDateRange] = useState<[string, string]>(() => getInitialFilter('dateRange', ['', '']));
  const [isPipelineOnly, setIsPipelineOnly] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const nextState = {
        ...parsed,
        domainFilters: {
          loai: selectedLoai,
          zns: selectedZns,
          nguoiPhuTrach: selectedNguoiPhuTrach,
          tinhThanh: selectedTinhThanh,
          hieuLuc: selectedHieuLuc,
          tienDo: selectedTienDo,
          dateRange: selectedDateRange
        },
        _local_updatedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }, [selectedLoai, selectedZns, selectedNguoiPhuTrach, selectedTinhThanh, selectedHieuLuc, selectedTienDo, selectedDateRange]);

  const getDaysDifference = (futureDateStr: string | Date, baseDateStr: string | Date) => {
    const future = new Date(futureDateStr);
    const base = new Date(baseDateStr);
    future.setHours(0,0,0,0);
    base.setHours(0,0,0,0);
    return Math.floor((future.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  };

  const statsQuotations = useMemo(() => {
    let res = quotations;
    
    if (isPipelineOnly) {
      res = res.filter(q => q.tinhTrangBaoGia !== 'HỦY' && q.tinhTrangBaoGia !== 'ĐÃ CHỐT');
    }
    // DO NOT filter by selectedZns OR selectedLoai here so that QuotationStats can show all dimensions!
    if (selectedNguoiPhuTrach) {
      res = res.filter(q => q.nguoiPhuTrach === selectedNguoiPhuTrach);
    }
    if (selectedTinhThanh) {
      res = res.filter(q => {
        const prov = (q as any).tinhThanh || customerTinhThanhMap.get(q.customerId || '') || entityCachePool.get('customers', q.customerId || '')?.tinhThanh;
        return prov === selectedTinhThanh;
      });
    }
    if (selectedTienDo) {
      res = res.filter(q => {
        const poolContracts = entityCachePool.getAll('contracts');
        const poolPayments = entityCachePool.getAll('payments');
        const poolDeliveries = entityCachePool.getAll('deliveries');

        const combinedContracts = [...(allContracts || []), ...(poolContracts || [])];
        const combinedPayments = [...(allPayments || []), ...(poolPayments || [])];
        const combinedDeliveries = [...(allDeliveries || []), ...(poolDeliveries || [])];

        const hasContract = isQuotationWithContract(q, combinedContracts);
        const hasPayment = combinedPayments.some((p: any) => 
          (p.quotationId && (p.quotationId === q.id || p.quotationId === q.soBaoGia || p.quotationId === q.soPhieuBaoGia)) ||
          (p.soPhieuBaoGia && (p.soPhieuBaoGia === q.soBaoGia || p.soPhieuBaoGia === q.soPhieuBaoGia || p.soPhieuBaoGia === q.id))
        );
        const hasDelivery = combinedDeliveries.some((d: any) => 
          (d.quotationId && (d.quotationId === q.id || d.quotationId === q.soBaoGia || d.quotationId === q.soPhieuBaoGia)) ||
          (d.soPhieuBaoGia && (d.soPhieuBaoGia === q.soBaoGia || d.soPhieuBaoGia === q.soPhieuBaoGia || d.soPhieuBaoGia === q.id))
        );
        
        if (selectedTienDo === 'CO_HOP_DONG') return hasContract;
        if (selectedTienDo === 'DA_THANH_TOAN') return hasPayment;
        if (selectedTienDo === 'DA_GIAO_HANG') return hasDelivery;
        return true;
      });
    }
    if (selectedHieuLuc) {
      const today = new Date();
      today.setHours(0,0,0,0);
      res = res.filter(q => {
        const diff = q.ngayHetHan ? getDaysDifference(q.ngayHetHan, today) : 100;
        if (selectedHieuLuc === 'CON_HIEU_LUC') return !q.ngayHetHan || diff >= 0;
        if (selectedHieuLuc === 'HET_HAN') return q.ngayHetHan && diff < 0;
        return true;
      });
    }
    if (selectedDateRange[0] || selectedDateRange[1]) {
      const [start, end] = selectedDateRange;
      res = res.filter(q => {
        const d = q.ngayBaoGia || '';
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
    return res;
  }, [quotations, isPipelineOnly, selectedNguoiPhuTrach, selectedTinhThanh, selectedHieuLuc, selectedTienDo, selectedDateRange, customerTinhThanhMap, allContracts, allPayments, allDeliveries]);

  const filteredQuotations = useMemo(() => {
    let res = statsQuotations;
    if (selectedLoai) {
      const normalizedType = normalizeLoai(selectedLoai);
      if (normalizedType) {
        res = res.filter(q => normalizeLoai(q.loai) === normalizedType);
      }
    }
    if (selectedZns) {
      res = res.filter(q => normalizeLegacyStatus(q.trangThaiGuiTinBaoGia) === selectedZns);
    }
    return res;
  }, [statsQuotations, selectedLoai, selectedZns]);

  return {
    selectedLoai, setSelectedLoai,
    selectedZns, setSelectedZns,
    selectedNguoiPhuTrach, setSelectedNguoiPhuTrach,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedHieuLuc, setSelectedHieuLuc,
    selectedTienDo, setSelectedTienDo,
    selectedDateRange, setSelectedDateRange,
    isPipelineOnly, setIsPipelineOnly,
    statsQuotations,
    filteredQuotations
  };
}
