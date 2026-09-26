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
 * - Thứ Bảy là ngày làm việc bình thường (includeSaturday = true, mặc định cho nhà máy SGM)
 */
export function isVietnamWorkingDay(
  date: Date,
  options: { includeSaturday?: boolean } = { includeSaturday: true }
): boolean {
  if (isVietnamSunday(date)) return false;
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

export interface ContractCompletionTimeline {
  completionDate: Date | null;
  completionDateFormatted: string; // '29/10/2026' hoặc '---'
  baseDate: Date | null;
  baseDateFormatted: string; // '24/09/2026'
  baseDateType: 'DOT_1' | 'NGAY_KY' | 'CHUA_XAC_DINH';
  baseDateLabel: string; // 'Từ Ngày thu Đợt 1 (24/09/2026)' hoặc 'Từ Ngày ký HĐ (18/09/2026)'
  workingDaysTotal: number; // 30
  workingDaysElapsed: number; // 2
  workingDaysRemaining: number; // 28
  isDelayed: boolean;
  delayedWorkingDays: number;
  timeProgressPercent: number; // 7 (%)
  statusText: string;
  statusColor: string;
}

/**
 * Động cơ Tính toán Toàn diện Tiến độ Hoàn thành Hợp đồng (Omni-Nexus Timeline Engine):
 * - Xác định mốc tính Base Date: Ngày thu Đợt 1 > Ngày ký HĐ.
 * - Cộng số ngày làm việc (trừ CN và Lễ/Tết).
 * - Tính toán ngày còn lại, ngày trễ, tiến độ % đối chiếu với ngày hiện tại (currentDate).
 */
export function computeContractCompletionTimeline(
  contract: any,
  payments?: any[],
  currentDateInput?: Date | string,
  options: { includeSaturday?: boolean; deliveryPercentage?: number } = { includeSaturday: true }
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
  };

  if (!contract) return defaultEmpty;

  const workingDaysTotal = Number(contract.soNgayDuKienHoanThanh || contract.soNgayThucHien || 30);
  const dot1 = getFirstInstallment(payments);

  let baseDate: Date | null = null;
  let baseDateType: 'DOT_1' | 'NGAY_KY' | 'CHUA_XAC_DINH' = 'CHUA_XAC_DINH';
  let baseDateLabel = 'Chưa xác định mốc tính';

  if (dot1 && dot1.ngayThu) {
    baseDate = parseSafeDate(dot1.ngayThu);
    if (baseDate) {
      baseDateType = 'DOT_1';
      baseDateLabel = `Từ Ngày thu Đợt 1 (${formatDate(dot1.ngayThu)})`;
    }
  }

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
      workingDaysTotal,
      statusText: 'Chưa ký HĐ',
    };
  }

  // Tính Ngày dự kiến hoàn thành
  const completionDate = addVietnamWorkingDays(baseDate, workingDaysTotal, options);
  const completionDateFormatted = completionDate ? formatDate(completionDate) : '---';
  const baseDateFormatted = formatDate(baseDate);

  // Tính toán thời gian thực tế đã qua và còn lại so với ngày hiện tại
  const now = currentDateInput ? (parseSafeDate(currentDateInput) || new Date()) : new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let workingDaysElapsed = 0;
  let workingDaysRemaining = 0;
  let isDelayed = false;
  let delayedWorkingDays = 0;

  if (todayOnly.getTime() <= baseDate.getTime()) {
    workingDaysElapsed = 0;
    workingDaysRemaining = workingDaysTotal;
  } else if (completionDate) {
    if (todayOnly.getTime() <= completionDate.getTime()) {
      workingDaysElapsed = countVietnamWorkingDays(baseDate, todayOnly, options);
      workingDaysRemaining = Math.max(0, countVietnamWorkingDays(todayOnly, completionDate, options));
    } else {
      workingDaysElapsed = workingDaysTotal;
      workingDaysRemaining = 0;
      isDelayed = true;
      delayedWorkingDays = countVietnamWorkingDays(completionDate, todayOnly, options);
    }
  }

  const timeProgressPercent =
    workingDaysTotal > 0 ? Math.min(100, Math.round((workingDaysElapsed / workingDaysTotal) * 100)) : 0;

  const dPct = options.deliveryPercentage ?? 0;
  let statusText = 'Đang triển khai';
  let statusColor = 'text-blue-700 bg-blue-50 border-blue-200';

  if (dPct >= 100) {
    statusText = 'Hoàn thành bàn giao';
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (isDelayed) {
    statusText = `Trễ tiến độ (${delayedWorkingDays} ngày)`;
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
  }

  return {
    completionDate,
    completionDateFormatted,
    baseDate,
    baseDateFormatted,
    baseDateType,
    baseDateLabel,
    workingDaysTotal,
    workingDaysElapsed,
    workingDaysRemaining,
    isDelayed,
    delayedWorkingDays,
    timeProgressPercent,
    statusText,
    statusColor,
  };
}
