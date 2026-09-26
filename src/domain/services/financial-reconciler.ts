/**
 * SGM Enterprise Financial Reconciliation Kernel
 * Single Source of Truth for Contract Billing, Debt Accounting, and Payment Progress
 * Tuân thủ quy chuẩn kế toán Việt Nam (VAS / Thông tư 200 & Nghị định 123)
 */

import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import {
  normalizePaymentStatus,
  PaymentCanonicalStatus,
  isPaymentFullyPaid,
  isPaymentCancelled,
  hasActualCashCollected
} from '@/src/domain/enums/payment-status';

export interface ContractFinancialProgress {
  totalContractAmount: number;
  totalPaid: number;
  remainingDebt: number;
  paymentPercentage: number;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  paidCount: number;
}

export interface ContractStatsAggregation {
  totalValue: number;
  totalPaidValue: number;
  totalUnpaidValue: number;
  paidCount: number;
  unpaidCount: number;
}

export interface PaymentKpiReconciliation {
  collectedToday: number;
  collectedThisWeek: number;
  collectedThisMonth: number;
  collectedThisYear: number;
  totalDebt: number;
}

/**
 * Lấy các phiếu thanh toán liên kết hợp lệ của một hợp đồng
 */
export function getLinkedPaymentsForContract(
  contract: Contract,
  payments: Payment[]
): Payment[] {
  if (!contract || !payments || !Array.isArray(payments)) return [];
  const cId = contract.id;
  const cSoHD = contract.soHopDong;

  return payments.filter(p => {
    if (!p) return false;
    const pAny = p as any;
    if (pAny.deletedAt || pAny.deleted_at || pAny.isDeleted) return false;
    if (isPaymentCancelled(p.tinhTrangThanhToan)) return false;

    const pContractId = p.contractId;
    const pSoHopDong = p.soHopDong || pAny.contractCode;

    return (
      (pContractId && (pContractId === cId || pContractId === cSoHD)) ||
      (pSoHopDong && (pSoHopDong === cSoHD || pSoHopDong === cId))
    );
  });
}

/**
 * Tính toán tiến độ tài chính chi tiết của một hợp đồng
 */
export function reconcileContractFinancials(
  contract: Contract,
  payments: Payment[]
): ContractFinancialProgress {
  if (!contract) {
    return {
      totalContractAmount: 0,
      totalPaid: 0,
      remainingDebt: 0,
      paymentPercentage: 0,
      isFullyPaid: false,
      isPartiallyPaid: false,
      paidCount: 0
    };
  }

  const linkedPayments = getLinkedPaymentsForContract(contract, payments);

  const totalContractAmount =
    contract.totalAmount ||
    contract.products?.reduce((s, p) => s + (p.total || 0), 0) ||
    0;

  // Tổng số tiền đã thanh toán: Mọi khoản thực thu phát sinh (không hủy, không chưa thanh toán)
  const totalPaid = linkedPayments
    .filter(p => hasActualCashCollected(p.tinhTrangThanhToan))
    .reduce((sum, p) => sum + (Number(p.soTien) || 0), 0);

  // Có bất kỳ phiếu nào ghi nhận hoàn thành 100% (Tất toán / Miễn phí)
  const hasFullStatus = linkedPayments.some(p => isPaymentFullyPaid(p.tinhTrangThanhToan));

  const isFullyPaid = hasFullStatus || (totalContractAmount > 0 && totalPaid >= totalContractAmount);
  const remainingDebt = isFullyPaid ? 0 : Math.max(0, totalContractAmount - totalPaid);
  const paymentPercentage = isFullyPaid
    ? 100
    : totalContractAmount > 0
    ? Math.min(100, Math.round((totalPaid / totalContractAmount) * 100))
    : 0;

  return {
    totalContractAmount,
    totalPaid,
    remainingDebt,
    paymentPercentage,
    isFullyPaid,
    isPartiallyPaid: totalPaid > 0 && !isFullyPaid,
    paidCount: linkedPayments.length
  };
}

/**
 * Tính toán thống kê toàn bộ danh sách hợp đồng cho KPI Card
 * Đảm bảo Bất Biến: totalValue = totalPaidValue + totalUnpaidValue
 */
export function reconcileContractStats(
  contracts: Contract[],
  payments: Payment[]
): ContractStatsAggregation {
  let totalValue = 0;
  let totalPaidValue = 0;
  let totalUnpaidValue = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  (contracts || []).forEach(c => {
    const prog = reconcileContractFinancials(c, payments);
    totalValue += prog.totalContractAmount;
    totalPaidValue += prog.totalPaid;
    totalUnpaidValue += prog.remainingDebt;

    if (prog.totalPaid > 0 || prog.isFullyPaid) {
      paidCount++;
    }
    if (!prog.isFullyPaid && (prog.remainingDebt > 0 || prog.totalPaid === 0)) {
      unpaidCount++;
    }
  });

  return {
    totalValue,
    totalPaidValue,
    totalUnpaidValue,
    paidCount,
    unpaidCount
  };
}

/**
 * Tính toán số dư công nợ còn lại của một phiếu thanh toán
 */
export function getPaymentRemainingBalance(p: Payment): number {
  if (!p) return 0;
  const pAny = p as any;
  if (pAny.deletedAt || pAny.deleted_at || pAny.isDeleted) return 0;

  const status = normalizePaymentStatus(p.tinhTrangThanhToan);
  if (status === PaymentCanonicalStatus.PAID_FULL || status === PaymentCanonicalStatus.CANCELLED) {
    return 0;
  }

  const fullAmount = Number(
    p.totalAmount !== undefined && p.totalAmount !== null
      ? p.totalAmount
      : (pAny.tongTienThanhToan !== undefined && pAny.tongTienThanhToan !== null
      ? pAny.tongTienThanhToan
      : p.soTien || 0)
  );

  const collected = Number(p.soTien || 0);

  if (status === PaymentCanonicalStatus.UNPAID) {
    return Math.max(0, fullAmount);
  }

  // PAID_PARTIAL (Công nợ): Nợ còn lại = Tổng giá trị - Số tiền thực thu đợt này
  return Math.max(0, fullAmount - collected);
}

/**
 * Đối soát KPI toàn diện cho Module Thanh Toán (Billing)
 */
export function reconcilePaymentKpis(
  payments: Payment[],
  nowDate: Date = new Date()
): PaymentKpiReconciliation {
  const todayStr = nowDate.toISOString().slice(0, 10);

  // Tính đầu tuần (Thứ 2)
  const d = new Date(nowDate);
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Đầu tháng
  const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  // Đầu năm
  const startOfYear = new Date(nowDate.getFullYear(), 0, 1);

  let collectedToday = 0;
  let collectedThisWeek = 0;
  let collectedThisMonth = 0;
  let collectedThisYear = 0;
  let totalDebt = 0;

  (payments || []).forEach(p => {
    if (!p) return false;
    const pAny = p as any;
    if (pAny.deletedAt || pAny.deleted_at || pAny.isDeleted) return;
    if (isPaymentCancelled(p.tinhTrangThanhToan)) return;

    // 1. Tính công nợ thực tế
    totalDebt += getPaymentRemainingBalance(p);

    // 2. Tính tiền thực thu dòng tiền (Mọi khoản thu có tiền > 0)
    const collectedAmt = Number(p.soTien || 0);
    if (collectedAmt > 0 && hasActualCashCollected(p.tinhTrangThanhToan)) {
      const dateStr = p.ngayThanhToan || pAny.paymentDate || pAny.createdAt;
      if (dateStr) {
        try {
          const pDate = new Date(dateStr);
          if (!isNaN(pDate.getTime())) {
            const pDateStr = pDate.toISOString().slice(0, 10);
            if (pDateStr === todayStr) {
              collectedToday += collectedAmt;
            }
            if (pDate >= startOfWeek) {
              collectedThisWeek += collectedAmt;
            }
            if (pDate >= startOfMonth) {
              collectedThisMonth += collectedAmt;
            }
            if (pDate >= startOfYear) {
              collectedThisYear += collectedAmt;
            }
          }
        } catch {
          // ignore invalid date parse
        }
      }
    }
  });

  return {
    collectedToday,
    collectedThisWeek,
    collectedThisMonth,
    collectedThisYear,
    totalDebt
  };
}

/**
 * Tính tổng số tiền đã thanh toán ở các đợt trước cho việc tạo phiếu thanh toán nhiều đợt
 */
export function calculateOtherPaidMultiMilestone(
  currentPaymentId: string | undefined,
  payments: Payment[],
  sourceValue: string | undefined
): number {
  if (!sourceValue || !payments || !Array.isArray(payments)) return 0;
  const isContract = sourceValue.startsWith('CONTRACT:');
  const targetId = sourceValue.replace(/^(CONTRACT|QUOTATION):/, '');

  return payments
    .filter(p => {
      if (!p) return false;
      const pAny = p as any;
      if (p.id === currentPaymentId || p.paymentId === currentPaymentId) return false;
      if (pAny.deletedAt || pAny.deleted_at || pAny.isDeleted) return false;
      if (isPaymentCancelled(p.tinhTrangThanhToan)) return false;

      // Phải có thực thu
      if (!hasActualCashCollected(p.tinhTrangThanhToan) || (Number(p.soTien) || 0) <= 0) {
        return false;
      }

      if (isContract) {
        return (
          p.contractId === targetId ||
          p.soHopDong === targetId ||
          pAny.contractCode === targetId
        );
      } else {
        return p.quotationId === targetId || p.soPhieuBaoGia === targetId;
      }
    })
    .reduce((sum, p) => sum + (Number(p.soTien) || 0), 0);
}
