/**
 * Đợt 0A (TT01; thiết kế cổng §9 dòng 11, §4.7.1): một cách tính "đã thu" và một câu ghi chú cho tin xác nhận thanh toán 646935,
 * dùng chung cho ba nơi gửi ở trình duyệt và cho chốt máy chủ (POST /api/zns/send).
 * - Không bao giờ dựng "Tất toán …"; không bao giờ đọc ghi chú nội bộ (payment.ghiChu, cacDotThu[].ghiChu, note).
 * - "Đã thu" tính từ đợt thu có tiền; phiếu không có đợt thu chỉ tính soTien đầu phiếu khi trạng thái thuộc nhóm có thực thu.
 * - Import tương đối (không alias) để máy chủ nhập được.
 */
import { hasActualCashCollected, isPaymentCancelled } from '../../../domain/enums/payment-status';

export const PAYMENT_ZNS_NOTE_MAX = 30;

const LEGACY_AUTO_SETTLED_PREFIX = 'tất toán 100% hợp đồng';

export interface PaymentLedgerEntry {
  index: number;
  lanThu: number;
  soTien: number;
  ngayThu: string;
}

export interface PaymentLedger {
  collected: number;
  entries: PaymentLedgerEntry[];
  cancelled: boolean;
  deleted: boolean;
}

export type PaymentLike = Record<string, unknown>;

export type PaymentZnsNoteResult =
  | { ok: true; ghiChu: string; installmentIndex: number | null; installmentNumber: number; collected: number }
  | { ok: false; code: 'PAYMENT_NOT_COLLECTED' | 'INVALID_INSTALLMENT'; reason: string };

export const PAYMENT_NOT_COLLECTED_REASON = 'Phiếu thu chưa ghi nhận khoản thu nào nên không gửi được tin xác nhận thanh toán. Ghi nhận đợt thu trước.';
export const INVALID_INSTALLMENT_REASON = 'Đợt thu được chọn không có trong phiếu. Mở lại phiếu và chọn đúng đợt.';
export const PAYMENT_NOTE_REJECTED_REASON = 'Nội dung "Tất toán" chỉ gửi được khi phiếu đã thu đủ. Sửa ô Ghi chú thành câu phù hợp (ví dụ "Thanh toán đợt 2").';

const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function collectPaymentLedger(payment: PaymentLike | null | undefined): PaymentLedger {
  const p: PaymentLike = payment || {};
  const deleted = Boolean(p.deletedAt || p.deleted_at || p.isDeleted);
  const cancelled = isPaymentCancelled(p.tinhTrangThanhToan);
  const raw = Array.isArray(p.cacDotThu) ? (p.cacDotThu as unknown[]) : [];
  const entries: PaymentLedgerEntry[] = raw
    .map((d, index) => {
      const row = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
      return {
        index,
        lanThu: toNumber(row.lanThu) > 0 ? toNumber(row.lanThu) : index + 1,
        soTien: toNumber(row.soTien),
        ngayThu: typeof row.ngayThu === 'string' ? row.ngayThu : '',
      };
    })
    .filter(e => e.soTien > 0)
    .sort((a, b) => a.lanThu - b.lanThu || a.index - b.index);

  let collected = entries.reduce((sum, e) => sum + e.soTien, 0);
  if (entries.length === 0 && hasActualCashCollected(p.tinhTrangThanhToan)) {
    collected = Math.max(0, toNumber(p.soTien));
  }
  if (deleted || cancelled) collected = 0;
  return { collected, entries, cancelled, deleted };
}

export function buildPaymentZnsNote(payment: PaymentLike | null | undefined, installmentIndex?: number | null): PaymentZnsNoteResult {
  const ledger = collectPaymentLedger(payment);
  if (ledger.deleted || ledger.cancelled || ledger.collected <= 0) {
    return { ok: false, code: 'PAYMENT_NOT_COLLECTED', reason: PAYMENT_NOT_COLLECTED_REASON };
  }

  let resolvedIndex: number | null;
  let installmentNumber: number;
  // Phiếu chưa có đợt thu nào có tiền (thường gặp: phiếu lập từ biểu mẫu): PaymentDetailDrawer tự dựng dòng "Đợt 1" (DOT-1-INIT) từ số tiền đầu phiếu,
  // nút "Gửi ZNS" của dòng đó gửi chỉ số 0. Khoản đã thu lúc này chính là số tiền đầu phiếu nên chỉ số 0 = "Đợt 1" đó (installmentIndex null); chỉ số khác vẫn INVALID_INSTALLMENT.
  const headOnly = ledger.entries.length === 0;
  if (installmentIndex === undefined || installmentIndex === null || (headOnly && installmentIndex === 0)) {
    if (ledger.entries.length > 0) {
      const latest = ledger.entries[ledger.entries.length - 1];
      resolvedIndex = latest.index;
      installmentNumber = latest.lanThu;
    } else {
      resolvedIndex = null;
      installmentNumber = 1;
    }
  } else {
    const entry = Number.isInteger(installmentIndex) ? ledger.entries.find(e => e.index === installmentIndex) : undefined;
    if (!entry) {
      return { ok: false, code: 'INVALID_INSTALLMENT', reason: INVALID_INSTALLMENT_REASON };
    }
    resolvedIndex = entry.index;
    installmentNumber = entry.lanThu;
  }

  const ghiChu = `Thanh toán đợt ${installmentNumber}`.slice(0, PAYMENT_ZNS_NOTE_MAX);
  return { ok: true, ghiChu, installmentIndex: resolvedIndex, installmentNumber, collected: ledger.collected };
}

export function isLegacyAutoSettledNote(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  return text.trim().toLowerCase().replace(/\s+/g, ' ').startsWith(LEGACY_AUTO_SETTLED_PREFIX);
}

// Cụm "tat toan" trọn từ (sau khi bỏ dấu), 0..n khoảng trắng ở giữa; nhóm 2 bắt "chua" đứng ngay trước. Không dùng lookbehind (Safari cũ báo lỗi cú pháp).
const SETTLEMENT_PHRASE = /(^|[^a-z])(chua\s*)?tat\s*toan(?![a-z])/g;

/**
 * Đợt 0A (TT01, rà soát cuối): câu có "tất toán" là lời báo "đã thu đủ" — kể cả câu nhân viên tự gõ ("Đã tất toán HĐ", "Tất toán đợt cuối"),
 * không chỉ câu tự điền cũ. Không phân biệt dấu, hoa/thường, viết liền hay cách; không tính khi đứng ngay sau "chưa" ("Chưa tất toán").
 * Phiếu chưa thu đủ thì chốt máy chủ từ chối câu này như câu tự điền cũ.
 */
export function isSettlementClaim(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const folded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  for (const match of folded.matchAll(SETTLEMENT_PHRASE)) {
    if (!match[2]) return true;
  }
  return false;
}
