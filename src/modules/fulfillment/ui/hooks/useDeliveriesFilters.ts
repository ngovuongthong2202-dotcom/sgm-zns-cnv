import { useState, useEffect, useMemo } from 'react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

const STATE_KEY = 'dataview:deliveries:state';

export function useDeliveriesFilters(deliveries: Delivery[], activeTab: string) {
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

  const [selectedStatus, setSelectedStatus] = useState<string>(() => getInitialFilter('status', ''));
  const [selectedSchedule, setSelectedSchedule] = useState<string>(() => getInitialFilter('schedule', ''));
  const [selectedNguoiGiao, setSelectedNguoiGiao] = useState<string>(() => getInitialFilter('nguoiGiao', ''));
  const [selectedZns, setSelectedZns] = useState<string>(() => getInitialFilter('zns', ''));
  const [selectedTinhThanh, setSelectedTinhThanh] = useState<string>(() => getInitialFilter('tinhThanh', ''));
  const [selectedNgayDuKien, setSelectedNgayDuKien] = useState<[string, string]>(() => getInitialFilter('ngayDuKien', ['', '']));
  const [selectedNgayThucTe, setSelectedNgayThucTe] = useState<[string, string]>(() => getInitialFilter('ngayThucTe', ['', '']));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const nextState = {
        ...parsed,
        domainFilters: {
          status: selectedStatus,
          schedule: selectedSchedule,
          nguoiGiao: selectedNguoiGiao,
          zns: selectedZns,
          tinhThanh: selectedTinhThanh,
          ngayDuKien: selectedNgayDuKien,
          ngayThucTe: selectedNgayThucTe
        },
        _local_updatedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }, [selectedStatus, selectedSchedule, selectedNguoiGiao, selectedZns, selectedTinhThanh, selectedNgayDuKien, selectedNgayThucTe]);

  const filteredDeliveries = useMemo(() => {
    let result = deliveries;
    const now = new Date().getTime();
    if (activeTab === 'pending') {
      result = result.filter(d => !d.ngayGiaoThucTe);
    } else if (activeTab === 'completed') {
      result = result.filter(d => !!d.ngayGiaoThucTe);
    } else if (activeTab === 'overdue') {
      result = result.filter(d => !d.ngayGiaoThucTe && (!d.ngayGiaoMay || new Date(d.ngayGiaoMay).getTime() < now));
    }

    if (selectedStatus === 'DELIVERED') result = result.filter(d => !!d.ngayGiaoThucTe);
    if (selectedStatus === 'PENDING') result = result.filter(d => !d.ngayGiaoThucTe);

    if (selectedSchedule) {
      if (selectedSchedule === 'OVERDUE') {
         result = result.filter(d => !d.ngayGiaoThucTe && (!d.ngayGiaoMay || new Date(d.ngayGiaoMay).getTime() < now));
      } else if (selectedSchedule === 'TODAY') {
         const tday = new Date().toISOString().substring(0, 10);
         result = result.filter(d => d.ngayGiaoMay === tday && !d.ngayGiaoThucTe);
      }
    }

    if (selectedNguoiGiao) {
      result = result.filter(d => d.nguoiPhuTrach === selectedNguoiGiao);
    }

    if (selectedTinhThanh) {
      result = result.filter(d => d.customerId?.includes(selectedTinhThanh));
    }

    if (selectedZns) {
      result = result.filter(d => {
         const s1 = normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang);
         const s2 = normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang);
         return s1 === selectedZns || s2 === selectedZns;
      });
    }

    if (selectedNgayDuKien[0] || selectedNgayDuKien[1]) {
      const [start, end] = selectedNgayDuKien;
      result = result.filter(d => {
        if (!d.ngayGiaoMay) return false;
        if (start && d.ngayGiaoMay < start) return false;
        if (end && d.ngayGiaoMay > end) return false;
        return true;
      });
    }

    if (selectedNgayThucTe[0] || selectedNgayThucTe[1]) {
      const [start, end] = selectedNgayThucTe;
      result = result.filter(d => {
        if (!d.ngayGiaoThucTe) return false;
        if (start && d.ngayGiaoThucTe < start) return false;
        if (end && d.ngayGiaoThucTe > end) return false;
        return true;
      });
    }
    
    return result;
  }, [deliveries, activeTab, selectedStatus, selectedSchedule, selectedNguoiGiao, selectedTinhThanh, selectedZns, selectedNgayDuKien, selectedNgayThucTe]);

  return {
    selectedStatus, setSelectedStatus,
    selectedSchedule, setSelectedSchedule,
    selectedNguoiGiao, setSelectedNguoiGiao,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedZns, setSelectedZns,
    selectedNgayDuKien, setSelectedNgayDuKien,
    selectedNgayThucTe, setSelectedNgayThucTe,
    filteredDeliveries
  };
}
