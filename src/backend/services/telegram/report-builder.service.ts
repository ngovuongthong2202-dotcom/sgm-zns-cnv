import { format } from 'date-fns';
import { z } from 'zod';
import { adminDb } from '../../config/supabase.admin';
import { telegramService } from './telegram.service';

export const AlertContractSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  endDate: z.string(),
});
export type AlertContractData = z.infer<typeof AlertContractSchema>;

export const AlertPaymentSchema = z.object({
  id: z.string(),
  amount: z.number().optional(),
  dueDate: z.string(),
});
export type AlertPaymentData = z.infer<typeof AlertPaymentSchema>;
export const ManualReportFiltersSchema = z.record(z.string(), z.any()).optional();

export class ReportBuilderService {
  private static instance: ReportBuilderService;

  private constructor() {}

  public static getInstance(): ReportBuilderService {
    if (!ReportBuilderService.instance) {
      ReportBuilderService.instance = new ReportBuilderService();
    }
    return ReportBuilderService.instance;
  }

  // A generic templater, simple replace {{key}} with value
  private renderTemplate(template: string, data: Record<string, unknown>): string {
    let result = template;
    // VERY simple Handlebars-style boolean logic e.g., {{#hasUrgent}}...{{/hasUrgent}}
    result = result.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, p1, p2) => {
      return data[p1] ? p2 : '';
    });
    for (const key in data) {
       result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key] !== undefined && data[key] !== null ? String(data[key]) : '');
    }
    return result;
  }

  public async buildDailyDigest(date: Date): Promise<string> {
    const todayStr = format(date, 'yyyy-MM-dd');
    const yesterdayDate = new Date(date);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

    const [todayCountCustomers, yesterdayCountCustomers, todayQuotes, yesterdayQuotes, todayContracts, todayDeliveries, znsStatsRes] = await Promise.all([
       adminDb.collection('customers').where('deletedAt', '==', null).where('createdAt', '>=', todayStr + 'T00:00:00.000Z').where('createdAt', '<=', todayStr + 'T23:59:59.999Z').count().get(),
       adminDb.collection('customers').where('deletedAt', '==', null).where('createdAt', '>=', yesterdayStr + 'T00:00:00.000Z').where('createdAt', '<=', yesterdayStr + 'T23:59:59.999Z').count().get(),
       adminDb.collection('quotations').where('deletedAt', '==', null).where('createdAt', '>=', todayStr + 'T00:00:00.000Z').where('createdAt', '<=', todayStr + 'T23:59:59.999Z').get(),
       adminDb.collection('quotations').where('deletedAt', '==', null).where('createdAt', '>=', yesterdayStr + 'T00:00:00.000Z').where('createdAt', '<=', yesterdayStr + 'T23:59:59.999Z').get(),
       adminDb.collection('contracts').where('deletedAt', '==', null).where('createdAt', '>=', todayStr + 'T00:00:00.000Z').where('createdAt', '<=', todayStr + 'T23:59:59.999Z').count().get(),
       adminDb.collection('deliveries').where('deletedAt', '==', null).where('createdAt', '>=', todayStr + 'T00:00:00.000Z').where('createdAt', '<=', todayStr + 'T23:59:59.999Z').get(),
       adminDb.collection('metricsRollup').doc('zns:monthly').get() // simplified, just an example 
    ]);

    const newCustomersToday = todayCountCustomers.data().count;
    const customerDelta = newCustomersToday - yesterdayCountCustomers.data().count;
    const newQuotations = todayQuotes.size;
    const closedQuotations = todayQuotes.docs.filter(d => d.data().status === 'APPROVED').length;
    const newContracts = todayContracts.data().count;
    
    // Payments today - this is simplified, sum payments
    const paymentsTodaySnap = await adminDb.collection('payments').where('deletedAt', '==', null).where('paidAt', '>=', todayStr + 'T00:00:00.000Z').where('paidAt', '<=', todayStr + 'T23:59:59.999Z').get();
    const revenueToday = paymentsTodaySnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

    const newDeliveries = todayDeliveries.size;
    const completedDeliveries = todayDeliveries.docs.filter(d => d.data().status === 'DELIVERED').length;

    const znsSent = 35; // mock or fetch from actual metrics
    const znsSuccess = 32;
    const znsSuccessRate = Math.round((znsSuccess / (znsSent || 1)) * 100);

    // Urgent items
    const overduePaymentsSnap = await adminDb.collection('payments').where('deletedAt', '==', null).where('status', '==', 'PENDING').where('dueDate', '<', new Date().toISOString()).limit(5).get();
    const urgentItems = overduePaymentsSnap.empty ? '' : `- ${overduePaymentsSnap.size} HĐ quá hạn thanh toán`;
    const hasUrgent = !overduePaymentsSnap.empty;

    const data = {
        date: format(date, 'dd/MM/yyyy'),
        newCustomersToday,
        customerDelta: customerDelta > 0 ? `+${customerDelta}` : customerDelta.toString(),
        newQuotations,
        closedQuotations,
        newContracts,
        revenueToday: revenueToday.toLocaleString('vi-VN'),
        newDeliveries,
        completedDeliveries,
        znsSent,
        znsSuccess,
        znsSuccessRate,
        hasUrgent,
        urgentItems
    };

    const config = await telegramService.getConfig();
    const template = config?.templates?.digest || `📊 *Báo cáo SGM ngày {{date}}*
    
👥 *Khách hàng*: {{newCustomersToday}} mới ({{customerDelta}} vs hôm qua)
💼 *Báo giá*: {{newQuotations}} phát hành, {{closedQuotations}} đã chốt
📑 *Hợp đồng*: {{newContracts}} ký mới
💰 *Doanh thu*: {{revenueToday}} ₫ (thu trong ngày)
📦 *Giao hàng*: {{newDeliveries}} phiếu mới, {{completedDeliveries}} đã giao
📨 *ZNS*: {{znsSent}} gửi, {{znsSuccess}} thành công ({{znsSuccessRate}}%)

{{#hasUrgent}}
⚠️ *Việc cần xử lý*:
{{urgentItems}}
{{/hasUrgent}}`;

    return this.renderTemplate(template, data);
  }

  public async buildAlertDlq(count: number): Promise<string> {
     const config = await telegramService.getConfig();
     const tpl = config?.templates?.alertDlq || `🚨 *Cảnh báo ZNS DLQ cao*
Số lượng tin nhắn lỗi (DLQ): {{count}} tin/giờ.`;
     return this.renderTemplate(tpl, { count });
  }

  public async buildAlertContract(contractData: Record<string, unknown>): Promise<string> {
     const contract = AlertContractSchema.parse(contractData);
     const config = await telegramService.getConfig();
     const tpl = config?.templates?.alertContract || `⚠️ *Hợp đồng sắp hết hạn*
Mã HĐ: {{id}} - Tên: {{name}} sắp hết hạn vào ngày {{endDate}}.`;
     return this.renderTemplate(tpl, { id: contract.id, name: contract.name || 'N/A', endDate: contract.endDate });
  }

  public async buildAlertPayment(paymentData: Record<string, unknown>): Promise<string> {
     const payment = AlertPaymentSchema.parse(paymentData);
     const config = await telegramService.getConfig();
     const tpl = config?.templates?.alertPayment || `⚠️ *Phiếu thanh toán quá hạn*
Mã: {{id}} - Số tiền: {{amount}} ₫ quá hạn từ ngày {{dueDate}}.`;
     return this.renderTemplate(tpl, { id: payment.id, amount: (payment.amount || 0).toLocaleString('vi-VN'), dueDate: payment.dueDate });
  }

  public async buildManualReport(period: 'day' | 'week' | 'month', filtersData?: Record<string, unknown>): Promise<string> {
      const filters = ManualReportFiltersSchema.parse(filtersData || {});
      const config = await telegramService.getConfig();
      const tpl = config?.templates?.manualReport || `📊 *Báo cáo tùy chọn (${period})*\n\n[Dữ liệu tự động xây dựng theo chu kỳ...]`;
      // Here you would do the same aggregation but bounded by period 
      return this.renderTemplate(tpl, { period });
  }
}

export const reportBuilderService = ReportBuilderService.getInstance();
