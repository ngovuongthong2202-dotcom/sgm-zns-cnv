import { useState, useEffect, useMemo } from 'react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

const STATE_KEY = 'dataview:deliveries:state';

export function useDeliveriesFilters(
  deliveries: Delivery[], 
  activeTab: string = 'all', 
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

    if (selectedStatus) {
      const statusUpper = selectedStatus.toUpperCase().trim();
      if (statusUpper === 'DELIVERED' || statusUpper === 'COMPLETED' || selectedStatus === 'completed' || selectedStatus === 'Đã hoàn tất' || selectedStatus === 'Đã giao') {
        result = result.filter(d => !!d.ngayGiaoThucTe || (d as any).trangThai === 'COMPLETED' || (d as any).trangThai === 'DELIVERED');
      } else if (statusUpper === 'PENDING' || selectedStatus === 'pending' || selectedStatus === 'Chờ giao') {
        result = result.filter(d => !d.ngayGiaoThucTe && ((d as any).trangThai !== 'ONGOING' && (d as any).trangThai !== 'Đang đi giao'));
      } else if (statusUpper === 'ONGOING' || selectedStatus === 'ongoing' || selectedStatus === 'Đang đi giao') {
        result = result.filter(d => !d.ngayGiaoThucTe && ((d as any).trangThai === 'ONGOING' || (d as any).trangThai === 'Đang đi giao' || Boolean((d as any).taiXe) || Boolean((d as any).thoGiaoMay)));
      }
    }

    if (selectedSchedule) {
      if (selectedSchedule === 'OVERDUE') {
         result = result.filter(d => !d.ngayGiaoThucTe && (!d.ngayGiaoMay || new Date(d.ngayGiaoMay).getTime() < now));
      } else if (selectedSchedule === 'TODAY') {
         const tday = new Date().toISOString().substring(0, 10);
         result = result.filter(d => d.ngayGiaoMay === tday && !d.ngayGiaoThucTe);
      }
    }

    if (selectedNguoiGiao) {
      result = result.filter(d => 
        d.nguoiPhuTrach === selectedNguoiGiao ||
        (d as any).taiXe === selectedNguoiGiao ||
        (d as any).thoGiaoMay === selectedNguoiGiao
      );
    }

    if (selectedTinhThanh) {
      const target = selectedTinhThanh.toLowerCase().trim();
      result = result.filter(d => {
        const custProv = (d.customerId ? customerTinhThanhMap.get(d.customerId) : '')
          || (d.customerId ? entityCachePool.get<Customer>('customers', d.customerId)?.tinhThanh : '')
          || '';
        return (
          custProv.toLowerCase().includes(target) ||
          (d.diaChiGiaoHang && d.diaChiGiaoHang.toLowerCase().includes(target))
        );
      });
    }

    if (selectedZns) {
      result = result.filter(d => {
         const s1 = normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang);
         return s1 === selectedZns;
      });
    }

    if (selectedNgayDuKien[0] || selectedNgayDuKien[1]) {
      const [start, end] = selectedNgayDuKien;
      result = result.filter(d => {
        const dateVal = d.ngayGiaoMay || (d as any).ngayLapPgh || (d as any).createdAt || '';
        if (!dateVal) return false;
        const dtStr = String(dateVal).substring(0, 10);
        if (start && dtStr < start) return false;
        if (end && dtStr > end) return false;
        return true;
      });
    }

    if (selectedNgayThucTe[0] || selectedNgayThucTe[1]) {
      const [start, end] = selectedNgayThucTe;
      result = result.filter(d => {
        const dateVal = d.ngayGiaoThucTe;
        if (!dateVal) return false;
        const dtStr = String(dateVal).substring(0, 10);
        if (start && dtStr < start) return false;
        if (end && dtStr > end) return false;
        return true;
      });
    }
    
    return result;
  }, [deliveries, activeTab, selectedStatus, selectedSchedule, selectedNguoiGiao, selectedTinhThanh, selectedZns, selectedNgayDuKien, selectedNgayThucTe, customerTinhThanhMap]);

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
