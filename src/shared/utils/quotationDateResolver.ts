import { formatDate } from './formatDate';

export interface QuotationChronoMeta {
  issueDate: string;           // Ngày lập chính thức (YYYY-MM-DD hoặc ISO)
  issueDateFormatted: string;  // DD/MM/YYYY
  expireDate: string;          // Ngày hết hạn (YYYY-MM-DD)
  expireDateFormatted: string; // DD/MM/YYYY
  validityDays: number;        // Số ngày hiệu lực (default 30)
  daysRemaining: number;       // Số ngày còn lại (âm nếu đã quá hạn)
  isExpired: boolean;
  isExpiringSoon: boolean;
  statusBadge: {
    label: string;
    text: string;              // alias for label
    colorClass: string;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
}

/**
 * Trích xuất ngày lập thông minh từ mã số phiếu báo giá (ví dụ: 11-BG2601-017 -> 2026-01-01)
 */
export function extractDateFromQuotationCode(code?: string): string | null {
  if (!code) return null;
  // Khớp định dạng: ...BG(YY)(MM)-... ví dụ BG2601-017 hoặc BG2610-001
  const match = code.match(/BG(\d{2})(\d{2})/i);
  if (match) {
    const year = 2000 + parseInt(match[1], 10);
    const month = match[2];
    if (year >= 2020 && year <= 2099 && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      return `${year}-${month}-01`;
    }
  }
  return null;
}

/**
 * Tính số ngày chênh lệch giữa ngày tương lai và ngày hiện tại (múi giờ địa phương)
 */
export function calculateDaysRemaining(futureDateStr: string, baseDate: Date = new Date()): number {
  if (!futureDateStr) return 0;
  try {
    const future = new Date(futureDateStr);
    const base = new Date(baseDate);
    // Reset về 0h để so sánh chính xác theo ngày
    future.setHours(0, 0, 0, 0);
    base.setHours(0, 0, 0, 0);
    const diffMs = future.getTime() - base.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Tính ngày hết hạn từ ngày lập và số ngày hiệu lực
 */
export function calculateExpirationDate(startDateStr: string, validityDays: number): string {
  try {
    const date = new Date(startDateStr);
    date.setDate(date.getDate() + validityDays);
    return date.toISOString().split('T')[0];
  } catch {
    const now = new Date();
    now.setDate(now.getDate() + validityDays);
    return now.toISOString().split('T')[0];
  }
}

/**
 * Phân giải toàn diện thông tin ngày lập, hiệu lực và trạng thái của báo giá
 */
export function resolveQuotationChronoMeta(quote?: any, refDate: Date = new Date()): QuotationChronoMeta {
  if (!quote) {
    const today = refDate.toISOString().split('T')[0];
    return {
      issueDate: today,
      issueDateFormatted: formatDate(today),
      expireDate: today,
      expireDateFormatted: formatDate(today),
      validityDays: 30,
      daysRemaining: 0,
      isExpired: false,
      isExpiringSoon: false,
      statusBadge: {
        label: 'Không xác định',
        text: 'Không xác định',
        colorClass: 'bg-slate-100 text-slate-600 border-slate-200',
        isExpired: false,
        isExpiringSoon: false
      }
    };
  }

  // 1. Phân cấp ưu tiên xác định Ngày Lập (Domain Date):
  // Ưu tiên 1: ngayBaoGia do nghiệp vụ / ERP cung cấp
  // Ưu tiên 2: Trích xuất từ mã số phiếu (VD: 11-BG2601-017 -> 2026-01-01)
  // Ưu tiên 3: createdAt (chỉ khi hoàn toàn thiếu ngày)
  // TUYỆT ĐỐI KHÔNG dùng ngayCapNhat (thời điểm edit/sync DB)
  let rawIssueDate = quote.ngayBaoGia;
  if (!rawIssueDate && quote.soPhieuBaoGia) {
    rawIssueDate = extractDateFromQuotationCode(quote.soPhieuBaoGia);
  }
  if (!rawIssueDate && quote.createdAt) {
    rawIssueDate = quote.createdAt;
  }
  if (!rawIssueDate) {
    rawIssueDate = refDate.toISOString().split('T')[0];
  }

  const issueDate = String(rawIssueDate).includes('T') 
    ? String(rawIssueDate).split('T')[0] 
    : String(rawIssueDate).substring(0, 10);
  const issueDateFormatted = formatDate(issueDate);

  // 2. Xác định Thời Hạn Hiệu Lực:
  const rawHieuLucStr = String(quote.hieuLuc || quote.thoiHanBaoGia || '30');
  const parsedHieuLuc = parseInt(rawHieuLucStr.replace(/\D/g, ''), 10);
  const validityDays = parsedHieuLuc > 0 ? parsedHieuLuc : 30;

  // 3. Xác định Ngày Hết Hạn:
  let expireDate = quote.ngayHetHan;
  if (!expireDate) {
    expireDate = calculateExpirationDate(issueDate, validityDays);
  } else if (String(expireDate).includes('T')) {
    expireDate = String(expireDate).split('T')[0];
  }
  const expireDateFormatted = formatDate(expireDate);

  // 4. Tính toán số ngày còn lại:
  const daysRemaining = calculateDaysRemaining(expireDate, refDate);
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 7;

  // 5. Xác định Badge Trạng Thái Hiệu Lực đồng bộ:
  let label: string;
  let colorClass: string;

  if (isExpired) {
    const overdue = Math.abs(daysRemaining);
    label = overdue > 0 ? `Hết hạn (${overdue}N trước)` : 'Hết hạn hôm nay';
    colorClass = 'bg-red-50 text-red-700 border-red-200';
  } else if (isExpiringSoon) {
    label = `Sắp hết (Còn ${daysRemaining}N)`;
    colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else {
    label = `Còn hiệu lực (${daysRemaining}N)`;
    colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }

  return {
    issueDate,
    issueDateFormatted,
    expireDate,
    expireDateFormatted,
    validityDays,
    daysRemaining,
    isExpired,
    isExpiringSoon,
    statusBadge: {
      label,
      text: label,
      colorClass,
      isExpired,
      isExpiringSoon
    }
  };
}
