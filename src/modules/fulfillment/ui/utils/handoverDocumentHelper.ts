import { Delivery } from '@/src/domain/schema/delivery.schema';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { resolveAcceptanceProtocolCode } from '@/src/shared/utils/voucherResolver';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { formatZnsDate } from '@/src/shared/utils/formatDate';

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
 * TUYỆT ĐỐI KHÔNG SINH MÃ GIẢ (Zero Hallucination)
 */
export function resolveMachineSerials(item: ProductItem, delivery: Delivery, index: number = 0): string {
  // 1. Ưu tiên danh sách mã máy gán riêng cho từng dòng sản phẩm
  if (Array.isArray(item.danhSachMaMay) && item.danhSachMaMay.length > 0) {
    return item.danhSachMaMay.join(', ');
  }

  // 2. Mã máy trực tiếp trên item (machineCode)
  if (item.machineCode) {
    return item.machineCode;
  }

  // 3. Nếu phiếu giao có danh sách mã máy tổng
  if (Array.isArray(delivery.danhSachMaMay) && delivery.danhSachMaMay.length > 0) {
    if (delivery.products && delivery.products.length === 1) {
      return delivery.danhSachMaMay.join(', ');
    }
    if (delivery.danhSachMaMay[index]) {
      return delivery.danhSachMaMay[index];
    }
    const isMachine = item.itemType === 'MACHINE' || ['Máy', 'Bộ'].includes(item.unit || '');
    if (isMachine && delivery.danhSachMaMay[0]) {
      return delivery.danhSachMaMay[0];
    }
  }

  // 4. Tuyệt đối không sinh mã giả: trả về chuỗi rỗng
  return '';
}

/**
 * Trích xuất thời hạn bảo hành thông minh cho từng dòng sản phẩm
 */
export function resolveItemWarranty(item: ProductItem, _delivery?: Delivery): string {
  if ((item as any).thoiGianBaoHanh) {
    return String((item as any).thoiGianBaoHanh);
  }
  if ((item as any).warrantyMonths) {
    return `${(item as any).warrantyMonths} tháng`;
  }

  const pName = (item.productName || '').toLowerCase();
  const unit = (item.unit || '').toLowerCase();
  const itemType = item.itemType || '';

  // Máy móc công nghiệp chính (dập vòm, cán sóng, xả cuộn, chấn, chặt...)
  if (
    itemType === 'MACHINE' || 
    unit.includes('máy') || 
    pName.includes('máy') || 
    pName.includes('bộ cán') || 
    item.machineCode || 
    (item.danhSachMaMay && item.danhSachMaMay.length > 0)
  ) {
    return '12 tháng';
  }

  // Chi phí, nhân công, dịch vụ, vận chuyển
  if (
    itemType === 'SERVICE' || 
    pName.includes('chi phí') || 
    pName.includes('nhân công') || 
    pName.includes('ăn uống') || 
    pName.includes('đi lại') || 
    pName.includes('vận chuyển')
  ) {
    return '---';
  }

  // Linh kiện, phụ kiện, vật tư tiêu hao
  return 'Theo NSX';
}

/**
 * Trích xuất ngày hết hạn bảo hành của sản phẩm có thời hạn dài nhất (theo đúng định dạng dd/mm/yyyy)
 * phục vụ mẫu ZNS 531052 (Kích hoạt bảo hành)
 */
export function calculateMaxWarrantyExpiryDate(delivery: Partial<Delivery>): {
  expiryDateFormatted: string;
  maxMonths: number;
  primarySerial: string;
  contractReference: string;
  contractProductLabel: string;
} {
  // 1. Xác định ngày giao hàng mốc (Base Date)
  const rawBase = delivery.ngayGiaoThucTe || delivery.ngayGiaoHang || new Date().toISOString();
  let baseDate = new Date();
  if (typeof rawBase === 'string') {
    const dmyMatch = rawBase.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const ymdMatch = rawBase.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dmyMatch) {
      baseDate = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    } else if (ymdMatch) {
      baseDate = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    } else {
      const parsed = new Date(rawBase);
      if (!isNaN(parsed.getTime())) baseDate = parsed;
    }
  } else if (rawBase instanceof Date) {
    baseDate = rawBase;
  }

  // 2. Tìm thời hạn bảo hành dài nhất của các sản phẩm (tính bằng tháng)
  const prods = Array.isArray(delivery.products) ? delivery.products : [];
  let maxMonths = 12; // Mặc định máy móc SGM bảo hành 12 tháng

  for (const p of prods) {
    let months = 0;
    if (typeof (p as any).warrantyMonths === 'number' && (p as any).warrantyMonths > 0) {
      months = (p as any).warrantyMonths;
    } else if ((p as any).thoiGianBaoHanh) {
      const matchMonth = String((p as any).thoiGianBaoHanh).match(/(\d+)\s*(tháng|thang|m)/i);
      const matchYear = String((p as any).thoiGianBaoHanh).match(/(\d+)\s*(năm|nam|y)/i);
      if (matchMonth) {
        months = parseInt(matchMonth[1], 10);
      } else if (matchYear) {
        months = parseInt(matchYear[1], 10) * 12;
      }
    } else {
      const resolvedText = resolveItemWarranty(p, delivery as any);
      const matchMonth = resolvedText.match(/(\d+)\s*(tháng|thang|m)/i);
      if (matchMonth) {
        months = parseInt(matchMonth[1], 10);
      }
    }

    if (months > maxMonths) {
      maxMonths = months;
    }
  }

  // 3. Tính ngày hết hạn = baseDate + maxMonths
  const expiryDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + maxMonths, baseDate.getDate());
  const expiryDateFormatted = formatZnsDate(expiryDate);

  // 4. Trích xuất số Serial thực tế đã xuất kho
  let primarySerial = '';
  if (Array.isArray(delivery.danhSachMaMay) && delivery.danhSachMaMay.length > 0) {
    primarySerial = String(delivery.danhSachMaMay[0]).trim();
  } else {
    for (const p of prods) {
      const ser = resolveMachineSerials(p, delivery as any);
      if (ser) {
        primarySerial = ser.split(',')[0].trim();
        break;
      }
    }
  }
  if (!primarySerial) {
    primarySerial = String(delivery.deliveryId || delivery.id || 'BH-SGM');
  }
  primarySerial = primarySerial.slice(0, 30);

  // 5. Căn cứ theo hợp đồng
  const soHd = delivery.soHopDong || delivery.soDonHang || '';
  const contractReference = ('Căn cứ theo ' + (soHd || 'HĐ SGM')).slice(0, 30);

  return {
    expiryDateFormatted,
    maxMonths,
    primarySerial,
    contractReference,
    contractProductLabel: contractReference,
  };
}

export { resolveAcceptanceProtocolCode, SGM_COMPANY_INFO };
