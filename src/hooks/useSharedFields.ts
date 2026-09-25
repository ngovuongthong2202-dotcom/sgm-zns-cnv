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
}

export const DEFAULT_LOAI_KHACH_HANG = ['Cá nhân', 'Doanh nghiệp'];
export const DEFAULT_LOAI_BAO_GIA = ['BG Máy', 'BG Vật tư', 'BG Dịch vụ'];
export const DEFAULT_PHUONG_THUC_THANH_TOAN = ['Chuyển khoản', 'Tiền mặt'];
export const DEFAULT_TINH_TRANG_THANH_TOAN = ['Tất toán', 'Công nợ', 'Chưa TT', 'Miễn phí'];
export const DEFAULT_NGUOI_PHU_TRACH = ['Mạnh Hùng (Admin)'];
export const SWR_SYSTEM_RESOURCES_KEY = 'system_resources';

export const VIETNAM_PROVINCES_63: string[] = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
  'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'TP Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

const fetchSystemResources = async () => {
  const [sharedFieldsDataRaw, znsTemplatesRaw, usersResult] = await Promise.all([
    settingsRepo.getById('shared_fields'),
    repositoryFactory.get<Record<string, unknown>>('znsTemplates').list({ limit: 500 }),
    isSupabaseConfigured
      ? supabase.from('users').select('*')
      : Promise.resolve({ data: [], error: null })
  ]);

  const sharedFieldsData = sharedFieldsDataRaw || {};
  const znsTemplatesList = znsTemplatesRaw.filter(d => !d.deletedAt);

  // Extract users from users table
  let userAccountsList: string[] = [];
  const userRows = usersResult.data || [];
  if (userRows.length > 0) {
    userAccountsList = userRows
      .map((d: any) => ((d.display_name || d.displayName || d.data?.displayName || d.username || '') as string).trim())
      .filter(Boolean);
  }

  // Ensure default admin exists and deduplicate while keeping order
  const combinedUsers = Array.from(new Set([...userAccountsList, ...DEFAULT_NGUOI_PHU_TRACH]));

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

  let tinhThanhList: string[] = [...VIETNAM_PROVINCES_63];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://provinces.open-api.vn/api/v2/?depth=1', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length >= 60) {
        tinhThanhList = data.map((p: Record<string, unknown>) => {
          let name = String(p.name || '');
          // Chuẩn hóa tiền tố Tỉnh / Thành phố
          name = name.replace(/^(Tỉnh|Thành phố)\s+/i, '').trim();
          if (name === 'Hồ Chí Minh') return 'TP Hồ Chí Minh';
          return name;
        }).filter(Boolean);
        // Thêm TP Hồ Chí Minh nếu chưa có
        if (!tinhThanhList.includes('TP Hồ Chí Minh')) tinhThanhList.push('TP Hồ Chí Minh');
        tinhThanhList.sort((a, b) => a.localeCompare(b, 'vi'));
      }
    }
  } catch {
    // Luôn có sẵn đầy đủ 63 tỉnh thành chuẩn Việt Nam
    tinhThanhList = [...VIETNAM_PROVINCES_63];
  }

  return {
    sharedFields: {
      nguoiPhuTrachList: combinedUsers,
      loaiBaoGiaList,
      loaiKhachHangList,
      phuongThucThanhToanList,
      tinhTrangThanhToanList
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
        tinhTrangThanhToanList: DEFAULT_TINH_TRANG_THANH_TOAN
      },
      znsTemplates: [],
      tinhThanhList: [
        'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
        'Bình Dương', 'Đồng Nai', 'Bà Rịa - Vũng Tàu', 'Khánh Hòa', 'Quảng Ninh',
        'Bắc Ninh', 'Vĩnh Phúc', 'Hải Dương', 'Long An', 'Tiền Giang'
      ]
    }
  });

  const loading = !data && !error;

  return {
    nguoiPhuTrachList: data?.sharedFields?.nguoiPhuTrachList || DEFAULT_NGUOI_PHU_TRACH,
    loaiBaoGiaList: data?.sharedFields?.loaiBaoGiaList || DEFAULT_LOAI_BAO_GIA,
    loaiKhachHangList: data?.sharedFields?.loaiKhachHangList || DEFAULT_LOAI_KHACH_HANG,
    phuongThucThanhToanList: data?.sharedFields?.phuongThucThanhToanList || DEFAULT_PHUONG_THUC_THANH_TOAN,
    tinhTrangThanhToanList: data?.sharedFields?.tinhTrangThanhToanList || DEFAULT_TINH_TRANG_THANH_TOAN,
    tinhThanhList: data?.tinhThanhList || [],
    znsTemplates: data?.znsTemplates || [],
    loading,
    error,
    isValidating
  };
}
