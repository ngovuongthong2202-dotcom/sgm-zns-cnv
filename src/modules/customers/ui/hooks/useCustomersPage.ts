import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useCustomers } from './useCustomers';
import { useAuth } from '@/src/modules/iam';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { useConfirm } from '@/src/design-system/Confirm';
import { Customer } from '@/src/domain/schema/customer.schema';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { filterCustomersList } from '../utils/customer-filter';
import { useCustomerActions } from './useCustomerActions';


export type DrawerState = { mode: 'closed' } | { mode: 'new' } | { mode: 'view'; customer: Customer; initialTab?: 'overview' | 'activity' | 'quotes' | 'contracts' | 'payments' | 'zns' | 'audit' } | { mode: 'edit'; customer: Customer };

export function useCustomersPage() {
  const { user, userData } = useAuth();
  const { confirm } = useConfirm();
  const { nguoiPhuTrachList: rawNguoiPhuTrachList, loaiKhachHangList: rawLoaiKhachHangList } = useSharedFields();
  const {
    customers,
    loading,
    loadMore,
    hasMore,
    createCustomer,
    updateCustomer,
    refresh
  } = useCustomers();

  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: 'closed' });
  const [lastCustomer, setLastCustomer] = useState<Customer | undefined>(undefined);

  // Load initial state from unified localStorage key "dataview:customers:state"
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.density) return parsed.density;
      }
    } catch {
      // ignore
    }
    const gd = localStorage.getItem('sgm_global_density') || 'cozy';
    return gd === 'cozy' ? 'normal' : (gd as 'compact' | 'comfortable');
  });

  const lastDensityRef = useRef(density);
  useEffect(() => {
    lastDensityRef.current = density;
  }, [density]);

  useEffect(() => {
    let isMounted = true;
    const handleGlobalDensity = (e: Event) => {
      const gDensity = (e as CustomEvent).detail;
      const normalized = gDensity === 'cozy' ? 'normal' : gDensity;
      if (normalized !== lastDensityRef.current) {
        lastDensityRef.current = normalized;
        setTimeout(() => {
          if (isMounted) {
            setDensity(normalized);
          }
        }, 0);
      }
    };
    window.addEventListener('sgm_density_changed', handleGlobalDensity);
    return () => {
      isMounted = false;
      window.removeEventListener('sgm_density_changed', handleGlobalDensity);
    };
  }, []);

  const [selectedLoaiKh, setSelectedLoaiKh] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.domainFilters?.selectedLoaiKh || '';
    } catch { return ''; }
  });
  const [selectedNguoiPhuTrach, setSelectedNguoiPhuTrach] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.domainFilters?.selectedNguoiPhuTrach || '';
    } catch { return ''; }
  });
  const [selectedZnsStatus, setSelectedZnsStatus] = useState<string>(''); // Removed from state persistence
  const [selectedTinhThanh, setSelectedTinhThanh] = useState<string>(''); // Removed from state persistence
  const [selectedCreatedDateRange, setSelectedCreatedDateRange] = useState<[string, string]>(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.domainFilters?.selectedCreatedDateRange || ['', ''];
    } catch { return ['', '']; }
  });

  const [searchFilter, setSearchFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.globalFilter || '';
    } catch { return ''; }
  });
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);

  // Periodically persist core table configuration states to unified "dataview:customers:state" key
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dataview:customers:state');
      const parsed = saved ? JSON.parse(saved) : {};
      const nextState = {
        ...parsed,
        globalFilter: searchFilter,
        density,
        domainFilters: {
          selectedLoaiKh,
          selectedNguoiPhuTrach,
          selectedZnsStatus,
          selectedTinhThanh,
          selectedCreatedDateRange
        },
        _local_updatedAt: Date.now()
      };
      localStorage.setItem('dataview:customers:state', JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }, [searchFilter, density, selectedLoaiKh, selectedNguoiPhuTrach, selectedZnsStatus, selectedTinhThanh, selectedCreatedDateRange]);

  useEffect(() => {
    const cleaned = customers.map(c => ({
      ...c,
      tenKhachHang: c.tenKhachHang ? cleanProperVietnameseText(c.tenKhachHang) : '',
      loaiHinhDoanhNghiep: c.loaiHinhDoanhNghiep ? c.loaiHinhDoanhNghiep.trim().toUpperCase() : '',
      diaChi: c.diaChi ? cleanProperVietnameseText(c.diaChi) : '',
      nguoiDaiDien: c.nguoiDaiDien ? cleanProperVietnameseText(c.nguoiDaiDien) : '',
    }));
    setLocalCustomers(cleaned);
  }, [customers]);

  const nguoiPhuTrachList = useMemo(() => {
    const list = new Set(rawNguoiPhuTrachList || []);
    localCustomers.forEach((c) => {
      if (c.nguoiPhuTrach) list.add(c.nguoiPhuTrach);
    });
    return Array.from(list).filter(Boolean) as string[];
  }, [rawNguoiPhuTrachList, localCustomers]);

  const loaiKhachHangList = useMemo(() => {
    const list = new Set(rawLoaiKhachHangList || []);
    localCustomers.forEach((c) => {
      if (c.loaiKh) {
        const found = Array.from(list).find(item => item.toLowerCase() === c.loaiKh?.toLowerCase());
        if (!found) {
          list.add(c.loaiKh);
        }
      }
    });
    return Array.from(list).filter(Boolean) as string[];
  }, [rawLoaiKhachHangList, localCustomers]);

  const tinhThanhList = useMemo(() => {
    const set = new Set(localCustomers.map((c) => c.tinhThanh).filter(Boolean));
    return Array.from(set) as string[];
  }, [localCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(searchFilter);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  const isAdmin = useMemo(() => {
    const role = (userData?.role || '').trim().toUpperCase();
    return role === 'ADMINISTRATOR' || role === 'BAN GIÁM ĐỐC' || role === 'BAN GIAM DOC' || role === 'ADMIN' || role === 'DEV_OPS';
  }, [userData]);

  const isSales = useMemo(() => {
    const role = (userData?.role || '').trim().toUpperCase();
    return role === 'CHUYÊN VIÊN' || role === 'CHUYEN VIEN' || role === 'SALES';
  }, [userData]);

  const canEditCustomer = useCallback((customer: Customer) => {
    if (isAdmin) return true;
    if (isSales) {
      if (!customer.nguoiPhuTrach) return true;
      const userAliases = [
        userData?.displayName,
        user?.displayName,
        userData?.userName,
        user?.email
      ].map(v => typeof v === 'string' ? v.toLowerCase().trim() : '');

      const assignedLower = customer.nguoiPhuTrach.toLowerCase().trim();
      return userAliases.some(alias => alias && (alias.includes(assignedLower) || assignedLower.includes(alias)));
    }
    return true;
  }, [isAdmin, isSales, user, userData]);

  const canDeleteCustomer = useCallback(() => {
    return isAdmin;
  }, [isAdmin]);

  const filteredCustomers = useMemo(() => {
    return filterCustomersList({
      customers: localCustomers,
      selectedLoaiKh,
      selectedNguoiPhuTrach,
      selectedZnsStatus,
      selectedTinhThanh,
      debouncedFilter,
      selectedCreatedDateRange
    });
  }, [localCustomers, selectedLoaiKh, selectedNguoiPhuTrach, selectedZnsStatus, selectedTinhThanh, debouncedFilter, selectedCreatedDateRange]);

  const drawerViewCustomer = useMemo(() => {
    return (drawerState.mode === 'view' || drawerState.mode === 'edit') ? drawerState.customer : undefined;
  }, [drawerState]);

  useEffect(() => {
    if (drawerState.mode === 'view' || drawerState.mode === 'edit') {
      setLastCustomer(drawerState.customer);
    }
  }, [drawerState]);

  const activeCustomerForDetails = drawerViewCustomer || lastCustomer;

  const {
    isSaving,
    isFormDirty,
    setIsFormDirty,
    sendingZnsIds,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleSendZns,
    blockingModalState,
    closeBlockingModal
  } = useCustomerActions({
    localCustomers,
    setLocalCustomers,
    updateCustomer,
    createCustomer,
    refresh,
    canEditCustomer,
    canDeleteCustomer,
    drawerState,
    setDrawerState,
    user,
    confirm
  });

  return {
    user,
    userData,
    customers: localCustomers,
    rawCustomers: customers,
    filteredCustomers,
    loading,
    loadMore,
    hasMore,
    refresh,
    drawerState,
    setDrawerState,
    lastCustomer,
    isSaving,
    isFormDirty,
    setIsFormDirty,
    sendingZnsIds,
    density,
    setDensity,
    searchFilter,
    setSearchFilter,
    debouncedFilter,
    selectedLoaiKh,
    setSelectedLoaiKh,
    selectedNguoiPhuTrach,
    setSelectedNguoiPhuTrach,
    selectedZnsStatus,
    setSelectedZnsStatus,
    selectedTinhThanh,
    setSelectedTinhThanh,
    selectedCreatedDateRange,
    setSelectedCreatedDateRange,
    tinhThanhList,
    drawerViewCustomer,
    activeCustomerForDetails,
    nguoiPhuTrachList,
    loaiKhachHangList,
    canEditCustomer,
    canDeleteCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleSendZns,
    confirm,
    blockingModalState,
    closeBlockingModal
  };
}
