import { useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { settingsRepo } from '@/src/data/repositories/system.repo';
import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';

export interface SharedFields {
  nguoiPhuTrachList: string[];
  loaiBaoGiaList: string[];
  loaiKhachHangList: string[];
  phuongThucThanhToanList: string[];
  tinhTrangThanhToanList: string[];
  lanhDaoPheDuyetList: string[];
  donViVanChuyenList: string[];
}

export const DEFAULT_LOAI_KHACH_HANG = ['Cá nhân', 'Doanh nghiệp'];
export const DEFAULT_LOAI_BAO_GIA = ['BG Máy', 'BG Vật tư', 'BG Dịch vụ'];
export const DEFAULT_PHUONG_THUC_THANH_TOAN = ['Chuyển khoản', 'Tiền mặt'];
export const DEFAULT_TINH_TRANG_THANH_TOAN = ['Tất toán', 'Công nợ', 'Chưa TT', 'Miễn phí'];
export const DEFAULT_NGUOI_PHU_TRACH = ['Ngô Vương Thông', 'Ngô Thị Mỹ Lệ', 'Trần Thị Huyền Trang'];
export const DEFAULT_LANH_DAO_PHE_DUYET = ['Ban Giám Đốc', 'Chủ tịch HĐQT', 'Tổng Giám Đốc', 'Phó Tổng Giám Đốc', 'Sếp Nam', 'Sếp Thắng', 'Sếp Tuấn'];
export const DEFAULT_DON_VI_VAN_CHUYEN = ['Xe CNV', 'A Hùng Xe Tải', 'GHTK', 'Viettel Post', 'Chành xe Miền Tây', 'Chành xe Bắc Nam', 'GrabExpress / Ahamove', 'Tự vận chuyển'];
export const SWR_SYSTEM_RESOURCES_KEY = 'system_resources';

import {
  vietnamProvincesApi,
  VIETNAM_PROVINCES_2025,
  VIETNAM_PROVINCES_63
} from '@/src/shared/services/vietnamProvincesApi';

export { VIETNAM_PROVINCES_2025, VIETNAM_PROVINCES_63 };
export { vietnamProvincesApi };

import { usersRepo } from '@/src/data/repositories';

const fetchSystemResources = async () => {
  const [sharedFieldsDataRaw, znsTemplatesRaw, usersResult] = await Promise.all([
    settingsRepo.getById('shared_fields'),
    repositoryFactory.get<Record<string, unknown>>('znsTemplates').list({ limit: 500 }),
    usersRepo.getAll().catch(() => [])
  ]);

  const sharedFieldsData = sharedFieldsDataRaw || {};
  const znsTemplatesList = znsTemplatesRaw.filter((d: any) => !d.deletedAt);

  // Extract users from users table - lấy chính xác displayName (Họ & Tên)
  let userAccountsList: string[] = [];
  const userRows = Array.isArray(usersResult) ? usersResult : [];
  if (userRows.length > 0) {
    userAccountsList = userRows
      .map((d: any) => ((d.displayName || d.display_name || d.data?.displayName || d.username || '') as string).trim())
      .filter(Boolean)
      .filter((name: string) => !name.toLowerCase().includes('mạnh hùng'));
  }

  // Ưu tiên nhân sự thực tế từ database, fallback danh sách cán bộ chuẩn SGM
  const combinedUsers = userAccountsList.length > 0
    ? Array.from(new Set(userAccountsList))
    : DEFAULT_NGUOI_PHU_TRACH;

  const loaiKhachHangList = (Array.isArray(sharedFieldsData.loaiKhachHangList) && sharedFieldsData.loaiKhachHangList.length > 0)
    ? (sharedFieldsData.loaiKhachHangList as string[])
    : DEFAULT_LOAI_KHACH_HANG;

  const loaiBaoGiaList = (Array.isArray(sharedFieldsData.loaiBaoGiaList) && sharedFieldsData.loaiBaoGiaList.length > 0)
    ? (sharedFieldsData.loaiBaoGiaList as string[])
    : DEFAULT_LOAI_BAO_GIA;

  const phuongThucThanhToanList = (Array.isArray(sharedFieldsData.phuongThucThanhToanList) && sharedFieldsData.phuongThucThanhToanList.length > 0)
    ? (sharedFieldsData.phuongThucThanhToanList as string[])
    : DEFAULT_PHUONG_THUC_THANH_TOAN;

  const tinhTrangThanhToanList = (Array.isArray(sharedFieldsData.tinhTrangThanhToanList) && sharedFieldsData.tinhTrangThanhToanList.length > 0)
    ? (sharedFieldsData.tinhTrangThanhToanList as string[])
    : DEFAULT_TINH_TRANG_THANH_TOAN;

  const lanhDaoPheDuyetList = (Array.isArray(sharedFieldsData.lanhDaoPheDuyetList) && sharedFieldsData.lanhDaoPheDuyetList.length > 0)
    ? (sharedFieldsData.lanhDaoPheDuyetList as string[])
    : DEFAULT_LANH_DAO_PHE_DUYET;

  const donViVanChuyenList = (Array.isArray(sharedFieldsData.donViVanChuyenList) && sharedFieldsData.donViVanChuyenList.length > 0)
    ? (sharedFieldsData.donViVanChuyenList as string[])
    : DEFAULT_DON_VI_VAN_CHUYEN;

  const tinhThanhList = await vietnamProvincesApi.fetchProvinceNames(VIETNAM_PROVINCES_2025);

  return {
    sharedFields: {
      nguoiPhuTrachList: combinedUsers,
      loaiBaoGiaList,
      loaiKhachHangList,
      phuongThucThanhToanList,
      tinhTrangThanhToanList,
      lanhDaoPheDuyetList,
      donViVanChuyenList
    },
    znsTemplates: znsTemplatesList,
    tinhThanhList
  };
};

export function useSharedFields() {
  // Realtime subscription to propagate updates to users and settings across tabs
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channelName = `realtime:shared_resources:${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        mutate(SWR_SYSTEM_RESOURCES_KEY);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        mutate(SWR_SYSTEM_RESOURCES_KEY);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { data, error, isValidating } = useSWR(SWR_SYSTEM_RESOURCES_KEY, fetchSystemResources, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30s deduping
    fallbackData: {
      sharedFields: {
        nguoiPhuTrachList: DEFAULT_NGUOI_PHU_TRACH,
        loaiBaoGiaList: DEFAULT_LOAI_BAO_GIA,
        loaiKhachHangList: DEFAULT_LOAI_KHACH_HANG,
        phuongThucThanhToanList: DEFAULT_PHUONG_THUC_THANH_TOAN,
        tinhTrangThanhToanList: DEFAULT_TINH_TRANG_THANH_TOAN,
        lanhDaoPheDuyetList: DEFAULT_LANH_DAO_PHE_DUYET,
        donViVanChuyenList: DEFAULT_DON_VI_VAN_CHUYEN
      },
      znsTemplates: [],
      tinhThanhList: VIETNAM_PROVINCES_2025
    }
  });

  const loading = !data && !error;

  return {
    nguoiPhuTrachList: data?.sharedFields?.nguoiPhuTrachList || DEFAULT_NGUOI_PHU_TRACH,
    loaiBaoGiaList: data?.sharedFields?.loaiBaoGiaList || DEFAULT_LOAI_BAO_GIA,
    loaiKhachHangList: data?.sharedFields?.loaiKhachHangList || DEFAULT_LOAI_KHACH_HANG,
    phuongThucThanhToanList: data?.sharedFields?.phuongThucThanhToanList || DEFAULT_PHUONG_THUC_THANH_TOAN,
    tinhTrangThanhToanList: data?.sharedFields?.tinhTrangThanhToanList || DEFAULT_TINH_TRANG_THANH_TOAN,
    lanhDaoPheDuyetList: data?.sharedFields?.lanhDaoPheDuyetList || DEFAULT_LANH_DAO_PHE_DUYET,
    donViVanChuyenList: data?.sharedFields?.donViVanChuyenList || DEFAULT_DON_VI_VAN_CHUYEN,
    tinhThanhList: data?.tinhThanhList || [],
    znsTemplates: data?.znsTemplates || [],
    loading,
    error,
    isValidating
  };
}

