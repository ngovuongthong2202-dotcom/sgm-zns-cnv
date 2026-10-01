import { Delivery } from '@/src/domain/schema/delivery.schema';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { resolveAcceptanceProtocolCode } from '@/src/shared/utils/voucherResolver';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';

export interface HandoverTechnicalCheckItem {
  id: string;
  category: string;
  criterion: string;
  standard: string;
  result: 'PASS' | 'QUALIFIED' | 'PENDING';
}

export const SGM_OFFICIAL_TECHNICAL_CHECKLIST: HandoverTechnicalCheckItem[] = [
  {
    id: 'mech',
    category: '1. Kết cấu cơ khí & Ngoại quan',
    criterion: 'Khung sườn, con lăn & trục cán',
    standard: 'Khung thép cứng vững, trục cán nhiệt luyện mạ crom, bề mặt sơn tĩnh điện đồng màu không trầy xước',
    result: 'PASS'
  },
  {
    id: 'hydraulic',
    category: '2. Truyền động & Thủy lực',
    criterion: 'Bơm dầu, xilanh cắt & dao cắt',
    standard: 'Áp suất thủy lực ổn định, xilanh cắt chuyển động êm ái, hành trình dứt khoát, không rò rỉ dầu',
    result: 'PASS'
  },
  {
    id: 'electrical',
    category: '3. Điện điều khiển PLC & HMI',
    criterion: 'Màn hình cảm ứng & Dừng khẩn cấp',
    standard: 'HMI cảm ứng nhạy bén, đếm tấm chính xác, cài đặt độ dài chuẩn, nút dừng khẩn cấp (E-Stop) hoạt động tốt',
    result: 'PASS'
  },
  {
    id: 'test_run',
    category: '4. Chạy thử tải tôn thực tế',
    criterion: 'Biên dạng sóng & Dung sai chiều dài',
    standard: 'Sóng tôn vuông đều sắc nét, không trầy sơn cuộn tôn, dung sai chiều dài cắt tấm đạt chuẩn ±1mm',
    result: 'PASS'
  },
  {
    id: 'dossier',
    category: '5. Hồ sơ & Hướng dẫn kỹ thuật',
    criterion: 'Tài liệu vận hành & Bảo hành',
    standard: 'Đã bàn giao sách HDSD, sơ đồ mạch điện, biên bản kiểm định, phiếu bảo hành chính hãng SGM 12 tháng',
    result: 'PASS'
  }
];

/**
 * Định dạng ngày theo phong cách văn bản pháp lý Việt Nam: ngày DD tháng MM năm YYYY
 */
export function formatVietnamLegalDate(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `ngày ${d} tháng ${m} năm ${y}`;
  }

  try {
    const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(dateObj.getTime())) {
      return 'ngày ... tháng ... năm 2026';
    }
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `ngày ${d} tháng ${m} năm ${y}`;
  } catch {
    return 'ngày ... tháng ... năm 2026';
  }
}

/**
 * Trích xuất giờ và phút thực tế hoặc chuỗi điền tay
 */
export function formatVietnamLegalTime(dateInput?: string | Date | null): { hours: string; minutes: string; formatted: string } {
  if (!dateInput) {
    return { hours: '...', minutes: '...', formatted: '... giờ ... phút' };
  }

  try {
    const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(dateObj.getTime())) {
      return { hours: '...', minutes: '...', formatted: '... giờ ... phút' };
    }
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return { hours, minutes, formatted: `${hours} giờ ${minutes} phút` };
  } catch {
    return { hours: '...', minutes: '...', formatted: '... giờ ... phút' };
  }
}

/**
 * Trích xuất Serial / Số KH cho từng dòng sản phẩm
 */
export function resolveMachineSerials(item: ProductItem, delivery: Delivery, index: number = 0): string {
  // 1. Ưu tiên danh sách mã máy gán riêng cho từng dòng sản phẩm
  if (Array.isArray(item.danhSachMaMay) && item.danhSachMaMay.length > 0) {
    return item.danhSachMaMay.join(', ');
  }

  // 2. Nếu phiếu giao có danh sách mã máy tổng
  if (Array.isArray(delivery.danhSachMaMay) && delivery.danhSachMaMay.length > 0) {
    if (delivery.products && delivery.products.length === 1) {
      return delivery.danhSachMaMay.join(', ');
    }
    if (delivery.danhSachMaMay[index]) {
      return delivery.danhSachMaMay[index];
    }
    return delivery.danhSachMaMay.join(', ');
  }

  // 3. Fallback mặc định theo định danh máy SGM
  return `SGM${String(index + 36).padStart(3, '0')}-26`;
}

export { resolveAcceptanceProtocolCode, SGM_COMPANY_INFO };
