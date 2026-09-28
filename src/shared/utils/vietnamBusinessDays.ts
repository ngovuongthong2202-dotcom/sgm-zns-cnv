import { formatDate } from './formatDate';

/**
 * Danh sách toàn bộ các ngày nghỉ Lễ, Tết chính thức và ngày nghỉ bù theo quy định
 * của Bộ luật Lao động Việt Nam (Điều 112) cho các năm 2024 - 2030 (định dạng YYYY-MM-DD).
 */
export const VIETNAM_PUBLIC_HOLIDAYS_SET = new Set<string>([
  // === NĂM 2024 ===
  '2024-01-01', // Tết Dương lịch
  '2024-02-08', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', // Tết Giáp Thìn
  '2024-04-18', // Giỗ Tổ Hùng Vương (10/3 ÂL)
  '2024-04-29', '2024-04-30', '2024-05-01', // 30/4 & 1/5 (kèm ngày hoán đổi)
  '2024-09-02', '2024-09-03', // Quốc khánh

  // === NĂM 2025 ===
  '2025-01-01', // Tết Dương lịch
  '2025-01-25', '2025-01-26', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', // Tết Ất Tỵ
  '2025-04-07', // Giỗ Tổ Hùng Vương (10/3 ÂL)
  '2025-04-30', '2025-05-01', // 30/4 & 1/5
  '2025-09-01', '2025-09-02', // Quốc khánh

  // === NĂM 2026 ===
  '2026-01-01', // Tết Dương lịch
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', // Tết Bính Ngọ
  '2026-04-26', '2026-04-27', // Giỗ Tổ Hùng Vương (10/3 ÂL rơi vào CN -> nghỉ bù 27/04)
  '2026-04-30', '2026-05-01', // 30/4 & 1/5
  '2026-09-02', '2026-09-03', // Quốc khánh

  // === NĂM 2027 ===
  '2027-01-01', // Tết Dương lịch
  '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12', // Tết Đinh Mùi
  '2027-04-16', // Giỗ Tổ Hùng Vương (10/3 ÂL)
  '2027-04-30', '2027-05-01', '2027-05-03', // 30/4 & 1/5 (nghỉ bù do 1/5 là T7)
  '2027-09-02', '2027-09-03', // Quốc khánh

  // === NĂM 2028 ===
  '2028-01-01', '2028-01-03', // Tết Dương lịch (1/1 là T7 -> nghỉ bù 3/1)
  '2028-01-25', '2028-01-26', '2028-01-27', '2028-01-28', '2028-01-29', '2028-01-30', '2028-01-31', '2028-02-01', // Tết Mậu Thân
  '2028-04-05', // Giỗ Tổ Hùng Vương (10/3 ÂL)
  '2028-04-30', '2028-05-01', '2028-05-02', // 30/4 rơi vào CN -> nghỉ bù 02/05
  '2028-09-01', '2028-09-02', '2028-09-04', // Quốc khánh (2/9 là T7 -> nghỉ bù 04/09)

  // === NĂM 2029 ===
  '2029-01-01', // Tết Dương lịch
  '2029-02-12', '2029-02-13', '2029-02-14', '2029-02-15', '2029-02-16', '2029-02-17', '2029-02-18', '2029-02-19', // Tết Kỷ Dậu
  '2029-04-22', '2029-04-23', // Giỗ Tổ Hùng Vương (22/4 là CN -> nghỉ bù 23/04)
  '2029-04-30', '2029-05-01', // 30/4 & 1/5
  '2029-09-02', '2029-09-03', '2029-09-04', // Quốc khánh (2/9 là CN -> nghỉ bù)

  // === NĂM 2030 ===
  '2030-01-01', // Tết Dương lịch
  '2030-02-01', '2030-02-02', '2030-02-03', '2030-02-04', '2030-02-05', '2030-02-06', '2030-02-07', '2030-02-08', // Tết Canh Tuất
  '2030-04-11', // Giỗ Tổ Hùng Vương (10/3 ÂL)
  '2030-04-30', '2030-05-01', // 30/4 & 1/5
  '2030-09-02', '2030-09-03', // Quốc khánh
]);

/**
 * Danh sách các ngày Thứ Bảy đi làm bù cho các ngày nghỉ lễ hoán đổi theo quyết định của Chính phủ (YYYY-MM-DD).
 * Khi rơi vào các ngày này, hệ thống luôn coi là ngày làm việc kể cả khi cấu hình nghỉ Thứ Bảy.
 */
export const VIETNAM_COMPENSATORY_WORKDAYS_SET = new Set<string>([
  '2024-05-04', // Đi làm bù Thứ Bảy cho ngày 29/04/2024 dịp lễ 30/4 - 1/5
  '2025-01-18', // Đi làm bù Thứ Bảy trước Tết Ất Tỵ
  '2025-02-08', // Đi làm bù Thứ Bảy sau Tết
  '2026-04-18', // Đi làm bù Thứ Bảy trước dịp 30/4
  '2027-04-24', // Đi làm bù Thứ Bảy trước dịp 30/4
]);

/**
 * Chuyển đổi mọi định dạng ngày thành Date object an toàn tuyệt đối (tránh timezone drift).
 */
export function parseSafeDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  let str = '';
  if (typeof input?.toDate === 'function') {
    try {
      const d = input.toDate();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } catch {
      return null;
    }
  } else if (typeof input === 'object' && typeof input.seconds === 'number') {
    const d = new Date(input.seconds * 1000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    str = String(input).trim();
  }

  if (!str || str === '---') return null;

  // Khớp dd/MM/yyyy hoặc d/M/yyyy
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Khớp yyyy-MM-dd
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback ISO string
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Kiểm tra xem ngày có phải là Chủ Nhật hay không.
 */
export function isVietnamSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Kiểm tra xem ngày có phải là ngày Lễ, Tết hoặc ngày nghỉ bù tại Việt Nam hay không.
 */
export function isVietnamHoliday(date: Date): boolean {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;

  // Kiểm tra trong danh mục chính thức 2024-2030
  if (VIETNAM_PUBLIC_HOLIDAYS_SET.has(dateKey)) {
    return true;
  }

  // Fallback các ngày lễ dương lịch cố định hàng năm cho các năm ngoài 2024-2030
  if (
    (mm === '01' && dd === '01') || // Tết Dương lịch
    (mm === '04' && dd === '30') || // Ngày Chiến Thắng
    (mm === '05' && dd === '01') || // Quốc tế Lao Động
    (mm === '09' && (dd === '02' || dd === '03')) // Quốc khánh
  ) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra ngày làm việc hợp lệ theo luật và tập quán thương mại/cơ khí SGM tại Việt Nam:
 * - Trừ ngày Chủ Nhật (Sunday = Skip)
 * - Trừ các ngày Lễ/Tết Việt Nam (Public Holidays = Skip)
 * - Nếu là ngày làm việc bù theo quyết định của Chính phủ (Compensatory Workday) -> Luôn là ngày làm việc!
 * - Thứ Bảy là ngày làm việc bình thường (includeSaturday = true, mặc định cho nhà máy SGM)
 */
export function isVietnamWorkingDay(
  date: Date,
  options: { includeSaturday?: boolean } = { includeSaturday: true }
): boolean {
  if (isVietnamSunday(date)) return false;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;

  // Nếu là ngày làm bù chính thức do Nhà nước công bố -> Luôn là ngày làm việc
  if (VIETNAM_COMPENSATORY_WORKDAYS_SET.has(dateKey)) {
    return true;
  }

  if (!options.includeSaturday && date.getDay() === 6) return false;
  if (isVietnamHoliday(date)) return false;
  return true;
}

/**
 * Cộng thêm N ngày làm việc Việt Nam:
 * Bắt đầu từ ngày mốc (startDate), mỗi bước cộng 1 ngày, nếu là ngày làm việc thì tăng số ngày tích lũy.
 */
export function addVietnamWorkingDays(
  startDate: string | Date,
  workingDays: number,
  options: { includeSaturday?: boolean } = { includeSaturday: true }
): Date | null {
  const start = parseSafeDate(startDate);
  if (!start) return null;
  if (workingDays <= 0) return start;

  let accumulated = 0;
  const runner = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (accumulated < workingDays) {
    runner.setDate(runner.getDate() + 1);
    if (isVietnamWorkingDay(runner, options)) {
      accumulated++;
    }
  }

  return runner;
}

/**
 * Đếm số ngày làm việc giữa 2 mốc ngày (không bao gồm startDate, bao gồm endDate nếu endDate là ngày làm việc).
 */
export function countVietnamWorkingDays(
  startDate: string | Date,
  endDate: string | Date,
  options: { includeSaturday?: boolean } = { includeSaturday: true }
): number {
  const start = parseSafeDate(startDate);
  const end = parseSafeDate(endDate);
  if (!start || !end) return 0;
  if (start.getTime() >= end.getTime()) return 0;

  let count = 0;
  const runner = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (runner.getTime() < end.getTime()) {
    runner.setDate(runner.getDate() + 1);
    if (isVietnamWorkingDay(runner, options)) {
      count++;
    }
  }

  return count;
}

/**
 * Trích xuất ngày thu Đợt 1 từ lịch sử thanh toán (Sổ cái multi-installment ledger).
 * Ưu tiên:
 * 1. Đợt thu có lanThu === 1 trong mảng `cacDotThu` (hoặc đợt có số tiền > 0 và ngày thu sớm nhất).
 * 2. Nếu không có `cacDotThu`, lấy `payment.ngayThanhToan` của phiếu thu đầu tiên có số tiền thực thu > 0.
 */
export function getFirstInstallment(
  payments?: any[]
): { ngayThu: string; lanThu: number; soTien: number; paymentId?: string } | null {
  if (!payments || !Array.isArray(payments) || payments.length === 0) return null;

  interface Candidate {
    ngayThu: string;
    lanThu: number;
    soTien: number;
    paymentId?: string;
  }

  const candidates: Candidate[] = [];

  for (const p of payments) {
    if (!p) continue;
    if (p.cacDotThu && Array.isArray(p.cacDotThu) && p.cacDotThu.length > 0) {
      for (const inst of p.cacDotThu) {
        if (inst && inst.ngayThu && (inst.soTien == null || Number(inst.soTien) > 0)) {
          candidates.push({
            ngayThu: String(inst.ngayThu),
            lanThu: Number(inst.lanThu) || 1,
            soTien: Number(inst.soTien) || 0,
            paymentId: p.paymentId || p.id,
          });
        }
      }
    } else if (p.soTien != null && Number(p.soTien) > 0 && p.ngayThanhToan) {
      candidates.push({
        ngayThu: String(p.ngayThanhToan),
        lanThu: 1,
        soTien: Number(p.soTien) || 0,
        paymentId: p.paymentId || p.id,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Ưu tiên đợt 1
  const dot1 = candidates.find((c) => c.lanThu === 1);
  if (dot1 && dot1.ngayThu) return dot1;

  // Nếu không có đánh số đợt 1, sắp xếp theo ngày thu sớm nhất
  candidates.sort((a, b) => {
    const da = parseSafeDate(a.ngayThu)?.getTime() || 0;
    const db = parseSafeDate(b.ngayThu)?.getTime() || 0;
    return da - db;
  });

  return candidates[0];
}

/**
 * Kiểm tra Ngưỡng Cọc Kích hoạt Sản xuất (Production Trigger Threshold Engine):
 * Trong ngành máy móc SGM, xưởng chỉ chính thức khởi động lệnh sản xuất và tính thời hạn khi:
 * 1. Khách hàng đã nộp đủ đợt 1, hoặc
 * 2. Tổng số tiền đã thanh toán >= Ngưỡng cọc quy định (mặc định 30% giá trị hợp đồng).
 */
/**
 * Chuẩn hóa mã tài liệu/chứng từ công nghiệp:
 * - Bỏ dấu '#' ở đầu (ví dụ: #11-KDDH2607-025 -> 11-KDDH2607-025)
 * - Loại bỏ khoảng trắng thừa, chuẩn hóa chữ hoa
 */
export function cleanDocCode(code?: string | null): string {
  if (!code) return '';
  return String(code).trim().replace(/^[#\s]+/, '').replace(/[\s]+$/, '').toUpperCase();
}

export interface ProductionTriggerResult {
  isTriggered: boolean;
  triggerDate: string | null;
  triggerType: 'FULL_INSTALLMENT_1' | 'PERCENT_THRESHOLD' | 'FIRST_PAYMENT' | 'CONTRACT_SIGNING' | 'POST_DELIVERY_SETTLEMENT';
  totalPaid: number;
  requiredThresholdAmount: number;
  thresholdPercent: number;
  statusLabel: string;
  triggerInstallmentNumber?: number;
  isPostDeliverySettlement?: boolean;
}

export function checkProductionTriggerThreshold(
  payments?: any[],
  contractAmount: number = 0,
  thresholdPercent: number = 30,
  options?: { deliveries?: any[]; isDacCachGiaoTruoc?: boolean }
): ProductionTriggerResult {
  const reqAmount = contractAmount > 0 ? Math.round(contractAmount * (thresholdPercent / 100)) : 0;

  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return {
      isTriggered: false,
      triggerDate: null,
      triggerType: 'CONTRACT_SIGNING',
      totalPaid: 0,
      requiredThresholdAmount: reqAmount,
      thresholdPercent,
      statusLabel: 'Chờ cọc khởi động',
    };
  }

  interface PaymentEntry {
    soTien: number;
    ngayThu: string;
    lanThu?: number;
  }

  const entries: PaymentEntry[] = [];
  for (const p of payments) {
    if (!p) continue;
    if (p.cacDotThu && Array.isArray(p.cacDotThu) && p.cacDotThu.length > 0) {
      for (const dot of p.cacDotThu) {
        if (dot && dot.ngayThu && (dot.soTien == null || Number(dot.soTien) > 0)) {
          entries.push({
            soTien: Number(dot.soTien) || 0,
            ngayThu: String(dot.ngayThu),
            lanThu: Number(dot.lanThu) || 1,
          });
        }
      }
    } else if (p.soTien != null && Number(p.soTien) > 0 && p.ngayThanhToan) {
      entries.push({
        soTien: Number(p.soTien) || 0,
        ngayThu: String(p.ngayThanhToan),
        lanThu: 1,
      });
    }
  }

  // Sắp xếp theo ngày thu tăng dần
  entries.sort((a, b) => {
    const da = parseSafeDate(a.ngayThu)?.getTime() || 0;
    const db = parseSafeDate(b.ngayThu)?.getTime() || 0;
    return da - db;
  });

  let runningSum = 0;
  let triggerDate: string | null = null;
  let triggerInstNumber = 1;

  for (const entry of entries) {
    runningSum += entry.soTien;
    if (!triggerDate) {
      if (reqAmount > 0 && runningSum >= reqAmount) {
        triggerDate = entry.ngayThu;
        triggerInstNumber = entry.lanThu || 1;
      } else if (reqAmount === 0 && runningSum > 0) {
        triggerDate = entry.ngayThu;
        triggerInstNumber = entry.lanThu || 1;
      }
    }
  }

  // Kiểm tra nghiệp vụ Giao hàng trước - Thanh toán sau (Post-Delivery Settlement) & Đặc cách
  let isPostDeliverySettlement = false;
  if (options?.isDacCachGiaoTruoc || payments.some(p => p?.dacCachGiaoTruoc || p?.isExempted)) {
    isPostDeliverySettlement = true;
  } else if (options?.deliveries && Array.isArray(options.deliveries) && options.deliveries.length > 0) {
    let earliestDeliveryTime = Infinity;
    for (const d of options.deliveries) {
      if (!d) continue;
      if (d.dacCachGiaoTruoc || d.isExempted || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU') {
        isPostDeliverySettlement = true;
        break;
      }
      const rawDate = d.ngayGiaoThucTe || d.ngayGiaoMay || d.ngayTaoPhieuXuat || d.ngayLapPgh;
      const parsed = parseSafeDate(rawDate);
      if (parsed && parsed.getTime() < earliestDeliveryTime) {
        earliestDeliveryTime = parsed.getTime();
      }
    }
    if (triggerDate && earliestDeliveryTime !== Infinity) {
      const triggerTime = parseSafeDate(triggerDate)?.getTime() || 0;
      if (earliestDeliveryTime <= triggerTime) {
        isPostDeliverySettlement = true;
      }
    }
  }

  const isTriggered = isPostDeliverySettlement || (reqAmount > 0 ? runningSum >= reqAmount : runningSum > 0);

  let triggerType: 'FULL_INSTALLMENT_1' | 'PERCENT_THRESHOLD' | 'FIRST_PAYMENT' | 'CONTRACT_SIGNING' | 'POST_DELIVERY_SETTLEMENT';
  let statusLabel: string;

  if (isPostDeliverySettlement) {
    triggerType = 'POST_DELIVERY_SETTLEMENT';
    statusLabel = 'Tất toán sau giao máy';
  } else if (isTriggered) {
    triggerType = triggerInstNumber === 1 ? 'FULL_INSTALLMENT_1' : 'PERCENT_THRESHOLD';
    statusLabel = 'Đã kích hoạt sản xuất';
  } else if (runningSum > 0) {
    triggerType = 'FIRST_PAYMENT';
    statusLabel = 'Chờ đủ cọc khởi động';
  } else {
    triggerType = 'CONTRACT_SIGNING';
    statusLabel = 'Chờ cọc khởi động';
  }

  return {
    isTriggered,
    triggerDate: isTriggered ? (triggerDate || entries[0]?.ngayThu || null) : (entries[0]?.ngayThu || null),
    triggerType,
    totalPaid: runningSum,
    requiredThresholdAmount: reqAmount,
    thresholdPercent,
    statusLabel,
    triggerInstallmentNumber: triggerInstNumber,
    isPostDeliverySettlement,
  };
}

/**
 * Kiểm tra nguy cơ giao hàng cuối tuần (Thứ Bảy / Chủ Nhật):
 * Cảnh báo điều phối nếu ngày hẹn giao hoặc ngày hoàn thành rơi vào cuối tuần
 * do khách hàng thường nghỉ làm việc, không có cẩu hạ máy.
 */
export function checkWeekendDeliveryRisk(targetDate: Date | null): {
  isRisk: boolean;
  dayOfWeek: number;
  notice?: string;
} {
  if (!targetDate) return { isRisk: false, dayOfWeek: -1 };
  const dow = targetDate.getDay();
  if (dow === 6) {
    return {
      isRisk: true,
      dayOfWeek: 6,
      notice: 'Hạn rơi vào Thứ 7: Cần xác nhận trước lịch cẩu hạ máy với khách hàng',
    };
  }
  if (dow === 0) {
    return {
      isRisk: true,
      dayOfWeek: 0,
      notice: 'Hạn rơi vào Chủ Nhật: Cần xác nhận trước lịch tiếp nhận với khách hàng',
    };
  }
  return { isRisk: false, dayOfWeek: dow };
}

export type ContractExecutionStage =
  | 'CHO_COC_KHOI_DONG'
  | 'DANG_CHE_TAO'
  | 'CHO_NGHIEM_THU_XUONG'
  | 'DANG_GIAO_LAP_DAT'
  | 'DA_NGHIEM_THU_BAN_GIAO';

export interface ContractCompletionTimeline {
  completionDate: Date | null;
  completionDateFormatted: string; // '29/10/2026' hoặc '---'
  baseDate: Date | null;
  baseDateFormatted: string; // '24/09/2026'
  baseDateType: 'DOT_1' | 'NGAY_KY' | 'CHUA_XAC_DINH';
  baseDateLabel: string; // 'Từ Ngày thu Đợt 1 (24/09/2026)' hoặc 'Từ Ngày ký HĐ (18/09/2026)'
  workingDaysTotal: number; // 30 (Hạn ban đầu)
  workingDaysElapsed: number; // 2
  workingDaysRemaining: number; // 28
  isDelayed: boolean;
  delayedWorkingDays: number;
  timeProgressPercent: number; // 7 (%)
  statusText: string;
  statusColor: string;
  // === MỞ RỘNG APEX SOVEREIGN (PHƯƠNG ÁN 10) ===
  productionTrigger?: ProductionTriggerResult;
  hasAddendumExtension?: boolean;
  extendedWorkingDays?: number;
  effectiveWorkingDays?: number;
  addendumReason?: string;
  originalCompletionDateFormatted?: string;
  originalCompletionDate?: Date | null;
  isWeekendDeliveryRisk?: boolean;
  weekendDeliveryWarning?: string;
  executionStage?: ContractExecutionStage;
  executionStageLabel?: string;
  executionStageColor?: string;
  isActuallyDelivered?: boolean;
  earlyDeliveryWorkingDays?: number;
}

/**
 * Động cơ Tính toán Toàn diện Tiến độ Hoàn thành Hợp đồng (SGM Apex Sovereign Chronos-Fabric 16.0):
 * 1. Phân tích Ngưỡng Cọc Kích hoạt Sản xuất (Production Trigger Threshold) & Nhận diện Giao trước Trả sau.
 * 2. Xác định mốc tính Base Date thông minh:
 *    - Nếu giao trước trả sau hoặc đặc cách xuất kho: Base Date = Ngày ký HĐ (ngayKy).
 *    - Nếu có cọc bình thường: Base Date = Ngày đạt ngưỡng cọc (ngayThu).
 * 3. Hỗ trợ Phụ lục Gia hạn tiến độ (Contract Addendum Extension) không bị phạt quá hạn oan.
 * 4. Khi ĐÃ GIAO HÀNG THỰC TẾ (ngayGiaoThucTe tồn tại):
 *    - Chốt SLA Hoàn thành Vận hành tại đúng ngày giao thực tế, tuyệt đối KHÔNG bị tính là trễ hạn HĐ!
 * 5. Phân tầng 5 Chặng Thực thi Vật lý (Execution State Machine).
 */
export function computeContractCompletionTimeline(
  contract: any,
  payments?: any[],
  currentDateInput?: Date | string,
  options: {
    includeSaturday?: boolean;
    deliveryPercentage?: number;
    deliveries?: any[];
  } = { includeSaturday: true }
): ContractCompletionTimeline {
  const defaultEmpty: ContractCompletionTimeline = {
    completionDate: null,
    completionDateFormatted: '---',
    baseDate: null,
    baseDateFormatted: '---',
    baseDateType: 'CHUA_XAC_DINH',
    baseDateLabel: 'Chưa xác định mốc tính',
    workingDaysTotal: 0,
    workingDaysElapsed: 0,
    workingDaysRemaining: 0,
    isDelayed: false,
    delayedWorkingDays: 0,
    timeProgressPercent: 0,
    statusText: 'Chưa xác định',
    statusColor: 'text-slate-500 bg-slate-50 border-slate-200',
    hasAddendumExtension: false,
    extendedWorkingDays: 0,
    effectiveWorkingDays: 0,
    isWeekendDeliveryRisk: false,
    executionStage: 'CHO_COC_KHOI_DONG',
    executionStageLabel: 'Chưa xác định',
    executionStageColor: 'text-blue-700 bg-blue-50 border-blue-200',
  };

  if (!contract) return defaultEmpty;

  const originalWorkingDays = Number(contract.soNgayDuKienHoanThanh || contract.soNgayThucHien || 30);
  const extendedWorkingDays = Math.max(0, Number(contract.soNgayGiaHan) || 0);
  const effectiveWorkingDays = originalWorkingDays + extendedWorkingDays;
  const hasAddendumExtension = extendedWorkingDays > 0;
  const addendumReason = contract.lyDoGiaHan || '';

  const contractAmount = Number(
    contract.giaTriSauThue || contract.tongTien || contract.giaTriHopDong || contract.giaTriSauVat || 0
  );
  const thresholdPercent = Number(contract.thresholdPercent) || 30;

  const isWaiver = Boolean(
    contract.dacCachGiaoTruoc ||
    contract.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU' ||
    (options.deliveries || []).some((d: any) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU')
  );

  // Kiểm tra ngưỡng cọc sản xuất kèm kiểm tra phân định giao trước trả sau
  const productionTrigger = checkProductionTriggerThreshold(payments, contractAmount, thresholdPercent, {
    deliveries: options.deliveries,
    isDacCachGiaoTruoc: isWaiver,
  });
  const dot1 = getFirstInstallment(payments);

  // Kiểm tra xem máy đã được giao thực tế hoặc xuất kho hay chưa
  const actualDelivery = (options.deliveries || []).find((d: any) => d.ngayGiaoThucTe);
  const actualDeliveryDate = actualDelivery?.ngayGiaoThucTe ? parseSafeDate(actualDelivery.ngayGiaoThucTe) : null;
  const hasScheduledDelivery = (options.deliveries || []).some((d: any) => d.ngayGiaoMay || d.soPhieuXuat || d.dacCachGiaoTruoc);

  let baseDate: Date | null = null;
  let baseDateType: 'DOT_1' | 'NGAY_KY' | 'CHUA_XAC_DINH' = 'CHUA_XAC_DINH';
  let baseDateLabel = 'Chưa xác định mốc tính';

  // NẾU là nghiệp vụ Giao hàng trước - Thanh toán sau (Post-Delivery Settlement hoặc Đặc cách giao trước):
  // Mốc tính Base Date sản xuất/giao hàng PHẢI lấy từ Ngày ký HĐ (vì nhà máy xuất hàng theo hợp đồng, không chờ cọc)!
  if (productionTrigger.isPostDeliverySettlement || isWaiver) {
    if (contract.ngayKy) {
      baseDate = parseSafeDate(contract.ngayKy);
      if (baseDate) {
        baseDateType = 'NGAY_KY';
        baseDateLabel = `Từ Ngày ký HĐ (${formatDate(contract.ngayKy)}) - Giao trước trả sau`;
      }
    }
  } else if (productionTrigger.isTriggered && productionTrigger.triggerDate) {
    baseDate = parseSafeDate(productionTrigger.triggerDate);
    if (baseDate) {
      baseDateType = 'DOT_1';
      baseDateLabel = `Từ Ngày thu Đợt 1 (${formatDate(productionTrigger.triggerDate)})`;
    }
  } else if (dot1 && dot1.ngayThu) {
    baseDate = parseSafeDate(dot1.ngayThu);
    if (baseDate) {
      baseDateType = 'DOT_1';
      baseDateLabel = `Từ Ngày thu Đợt 1 (${formatDate(dot1.ngayThu)})`;
    }
  }

  // Fallback về ngày ký hợp đồng nếu chưa thu đợt 1
  if (!baseDate && contract.ngayKy) {
    baseDate = parseSafeDate(contract.ngayKy);
    if (baseDate) {
      baseDateType = 'NGAY_KY';
      baseDateLabel = `Từ Ngày ký HĐ (${formatDate(contract.ngayKy)})`;
    }
  }

  if (!baseDate) {
    return {
      ...defaultEmpty,
      workingDaysTotal: originalWorkingDays,
      statusText: 'Chưa ký HĐ',
      productionTrigger,
    };
  }

  // Tính Ngày hoàn thành gốc (chưa gia hạn) và Ngày cam kết HĐ (đã tính gia hạn)
  const originalTargetDate = addVietnamWorkingDays(baseDate, originalWorkingDays, options);
  const originalCompletionDateFormatted = originalTargetDate ? formatDate(originalTargetDate) : '---';

  const scheduledCompletionDate = addVietnamWorkingDays(baseDate, effectiveWorkingDays, options);

  // NẾU ĐÃ GIAO THỰC TẾ (actualDeliveryDate tồn tại):
  // Ngày hoàn thành thực tế CHÍNH LÀ ngày giao máy thực tế!
  // Tuyệt đối không bị coi là trễ hạn (isDelayed = false, delayedWorkingDays = 0)
  const isActuallyDelivered = !!actualDeliveryDate;
  const completionDate = isActuallyDelivered ? actualDeliveryDate : scheduledCompletionDate;
  const completionDateFormatted = completionDate ? formatDate(completionDate) : '---';
  const baseDateFormatted = formatDate(baseDate);

  // Kiểm tra nguy cơ giao hàng cuối tuần
  const weekendRisk = checkWeekendDeliveryRisk(completionDate);

  // Tính toán thời gian thực tế đã qua và còn lại so với ngày hiện tại
  const now = currentDateInput ? (parseSafeDate(currentDateInput) || new Date()) : new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let workingDaysElapsed = 0;
  let workingDaysRemaining = 0;
  let isDelayed = false;
  let delayedWorkingDays = 0;
  let earlyDeliveryWorkingDays = 0;

  if (isActuallyDelivered) {
    // Đã giao hàng thực tế -> SLA vận hành hoàn tất 100%!
    workingDaysElapsed = countVietnamWorkingDays(baseDate, actualDeliveryDate, options);
    workingDaysRemaining = 0;
    isDelayed = false;
    delayedWorkingDays = 0;
    if (originalTargetDate && actualDeliveryDate.getTime() < originalTargetDate.getTime()) {
      earlyDeliveryWorkingDays = countVietnamWorkingDays(actualDeliveryDate, originalTargetDate, options);
    }
  } else if (todayOnly.getTime() <= baseDate.getTime()) {
    workingDaysElapsed = 0;
    workingDaysRemaining = effectiveWorkingDays;
  } else if (completionDate) {
    if (todayOnly.getTime() <= completionDate.getTime()) {
      workingDaysElapsed = countVietnamWorkingDays(baseDate, todayOnly, options);
      workingDaysRemaining = Math.max(0, countVietnamWorkingDays(todayOnly, completionDate, options));
    } else {
      workingDaysElapsed = effectiveWorkingDays;
      workingDaysRemaining = 0;
      isDelayed = true;
      delayedWorkingDays = countVietnamWorkingDays(completionDate, todayOnly, options);
    }
  }

  const timeProgressPercent = isActuallyDelivered ? 100 : (
    effectiveWorkingDays > 0 ? Math.min(100, Math.round((workingDaysElapsed / effectiveWorkingDays) * 100)) : 0
  );

  const dPct = isActuallyDelivered ? 100 : (options.deliveryPercentage ?? 0);
  let statusText = 'Đang triển khai';
  let statusColor = 'text-blue-700 bg-blue-50 border-blue-200';

  if (isActuallyDelivered) {
    const earlyNotice = earlyDeliveryWorkingDays > 0 ? ` (Sớm ${earlyDeliveryWorkingDays} ngày)` : '';
    statusText = `Đã giao máy${earlyNotice}`;
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (dPct >= 100) {
    statusText = 'Hoàn thành bàn giao';
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (isDelayed) {
    statusText = `Trễ tiến độ (${delayedWorkingDays} ngày)`;
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (hasAddendumExtension) {
    statusText = `Gia hạn +${extendedWorkingDays} ngày`;
    statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
  }

  // Xác định 5 Chặng Thực thi Vật lý (Execution Stage Machine) - TUYỆT ĐỐI KHÔNG DÙNG MÀU TÍM
  let executionStage: ContractExecutionStage = 'CHO_COC_KHOI_DONG';
  let executionStageLabel = 'Chờ cọc khởi động';
  let executionStageColor = 'text-blue-700 bg-blue-50 border-blue-200';

  if (contract.status === 'COMPLETED' || isActuallyDelivered || dPct >= 100) {
    executionStage = 'DA_NGHIEM_THU_BAN_GIAO';
    executionStageLabel = 'Đã bàn giao máy';
    executionStageColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (dPct > 0 || hasScheduledDelivery || isWaiver) {
    executionStage = 'DANG_GIAO_LAP_DAT';
    executionStageLabel = isWaiver ? 'Đặc cách xuất xưởng/Giao máy' : 'Đang giao & lắp đặt';
    executionStageColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
  } else if (timeProgressPercent >= 90) {
    executionStage = 'CHO_NGHIEM_THU_XUONG';
    executionStageLabel = 'Chờ nghiệm thu xưởng';
    executionStageColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (productionTrigger.isTriggered) {
    executionStage = 'DANG_CHE_TAO';
    executionStageLabel = 'Đang chế tạo máy';
    executionStageColor = 'text-blue-700 bg-blue-50 border-blue-200';
  } else {
    executionStage = 'CHO_COC_KHOI_DONG';
    executionStageLabel = 'Chờ cọc khởi động';
    executionStageColor = 'text-blue-700 bg-blue-50 border-blue-200';
  }

  return {
    completionDate,
    completionDateFormatted,
    baseDate,
    baseDateFormatted,
    baseDateType,
    baseDateLabel,
    workingDaysTotal: originalWorkingDays,
    workingDaysElapsed,
    workingDaysRemaining,
    isDelayed,
    delayedWorkingDays,
    timeProgressPercent,
    statusText,
    statusColor,
    // Apex Sovereign Chronos-Fabric extensions
    productionTrigger,
    hasAddendumExtension,
    extendedWorkingDays,
    effectiveWorkingDays,
    addendumReason,
    originalCompletionDate: originalTargetDate,
    originalCompletionDateFormatted,
    isWeekendDeliveryRisk: weekendRisk.isRisk,
    weekendDeliveryWarning: weekendRisk.notice,
    executionStage,
    executionStageLabel,
    executionStageColor,
    isActuallyDelivered,
    earlyDeliveryWorkingDays,
  };
}
