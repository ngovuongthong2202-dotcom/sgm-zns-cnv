import { Customer } from '@/src/domain/schema/customer.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Payment } from '@/src/domain/schema/payment.schema';

export interface HealthScore {
  score: number; // 0 - 100
  label: 'Healthy' | 'Warning' | 'At Risk';
  color: 'emerald' | 'amber' | 'red';
  reasons: string[];
  actionPlan: string[];
}

export function calculateHealthScore(
  customer: Customer,
  quotations: Quotation[],
  contracts: Contract[],
  payments: Payment[]
): HealthScore {
  let score = 100;
  const reasons: string[] = [];
  const actionPlan: string[] = [];

  const cusQuotations = quotations.filter(q => q.customerId === customer.id);
  const cusContracts = contracts.filter(c => c.customerId === customer.id);
  const cusPayments = payments.filter(p => p.customerId === customer.id);

  // 1. Tỷ lệ chốt HĐ (Conversion Rate) - Weight: 30%
  if (cusQuotations.length > 0) {
    const conversion = cusContracts.length / cusQuotations.length;
    if (conversion === 0) {
      score -= 20;
      reasons.push('Tỷ lệ chốt hợp đồng thấp (0%)');
      actionPlan.push('Gọi điện tìm hiểu trở ngại khiến khách chưa chốt báo giá');
    } else if (conversion < 0.3) {
      score -= 10;
      reasons.push(`Tỷ lệ chốt hợp đồng cần cải thiện (${Math.round(conversion * 100)}%)`);
      actionPlan.push('Xem xét điều chỉnh chính sách giá hoặc ưu đãi để xúc tiến');
    } else {
      reasons.push(`Tỷ lệ chốt hợp đồng tốt (${Math.round(conversion * 100)}%)`);
      actionPlan.push('Duy trì chất lượng tư vấn, đề xuất cross-sell/up-sell');
    }
  } else if (cusContracts.length === 0) {
    score -= 10;
    reasons.push('Chưa có báo giá hay hợp đồng nào');
    actionPlan.push('Gửi profile năng lực và hẹn lịch tư vấn giải pháp');
  }

  // 2. Tuổi nợ (Overdue Payments) - Weight: 40%
  const overduePayments = cusPayments.filter(p => {
    if (p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN') return false;
    if (!p.ngayDenHan) return false;
    return new Date(p.ngayDenHan).getTime() < Date.now();
  });

  if (overduePayments.length > 0) {
    score -= Math.min(40, overduePayments.length * 15);
    reasons.push(`Có ${overduePayments.length} khoản thanh toán quá hạn`);
    actionPlan.push('Gửi nhắc nhở thanh toán tự động qua Zalo ZNS hoặc gọi điện trực tiếp');
    actionPlan.push('Tạm ngưng giao hàng hoặc dịch vụ cho đến khi công nợ được xử lý');
  }

  // 3. Tương tác gần đây (Recent interactions in 90 days) - Weight: 30%
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  
  const allDates = [
    ...cusQuotations.map(q => q.ngayBaoGia ? new Date(q.ngayBaoGia).getTime() : 0),
    ...cusContracts.map(c => c.ngayKy ? new Date(c.ngayKy).getTime() : 0),
    ...cusPayments.map(p => p.ngayThanhToan ? new Date(p.ngayThanhToan).getTime() : 0)
  ].filter(d => d > 0);

  if (allDates.length > 0) {
    const lastInteraction = Math.max(...allDates);
    if (lastInteraction < ninetyDaysAgo) {
      score -= 20;
      reasons.push('Không có tương tác (BG/HĐ/TT) trong 90 ngày qua');
      actionPlan.push('Gửi ZNS chương trình khuyến mãi/bảo dưỡng định kỳ để "hâm nóng"');
    } else {
      reasons.push('Tương tác ổn định thời gian gần đây');
    }
  } else {
      score -= 10;
      reasons.push('Chưa có dữ liệu tương tác lịch sử');
  }

  // Cap the score
  score = Math.max(0, Math.min(100, score));

  let label: HealthScore['label'] = 'Healthy';
  let color: HealthScore['color'] = 'emerald';

  if (score < 50) {
    label = 'At Risk';
    color = 'red';
  } else if (score < 80) {
    label = 'Warning';
    color = 'amber';
  }

  return { score, label, color, reasons, actionPlan };
}
