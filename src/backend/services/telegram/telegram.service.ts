import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

export interface TelegramChat {
  chatId: string;
  label: string;
  enabled: boolean;
  receiveDigest: boolean;
  receiveAlerts: boolean;
  receiveManualReports: boolean;
}

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  chats: TelegramChat[];
  digestSchedule: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
  alertThresholds: {
    dlqHigh: number;
    successRateLow: number;
    overduePayments: number;
    contractsExpiring: number;
  };
  templates: {
    digest: string;
    alertDlq: string;
    alertContract: string;
    alertPayment: string;
    manualReport: string;
  };
  updatedAt: string;
  updatedBy: string;
}

export class TelegramService {
  private static instance: TelegramService;

  private constructor() {}

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  public async getConfig(): Promise<TelegramConfig | null> {
    const doc = await adminDb.collection('settings').doc('telegram_config').get();
    if (!doc.exists) {
       // Seed default config automatically if it doesn't exist
       const defaultConfig: TelegramConfig = {
          botToken: '',
          enabled: false,
          chats: [],
          digestSchedule: {
             enabled: false,
             cronExpression: '0 8 * * *',
             timezone: 'Asia/Ho_Chi_Minh'
          },
          alertThresholds: {
             dlqHigh: 10,
             successRateLow: 80,
             overduePayments: 5,
             contractsExpiring: 3
          },
          templates: {
             digest: `📊 *Báo cáo SGM ngày {{date}}*\n\n👥 *Khách hàng*: {{newCustomersToday}} mới ({{customerDelta}} vs hôm qua)\n💼 *Báo giá*: {{newQuotations}} phát hành, {{closedQuotations}} đã chốt\n📑 *Hợp đồng*: {{newContracts}} ký mới\n💰 *Doanh thu*: {{revenueToday}} ₫ (thu trong ngày)\n📦 *Giao hàng*: {{newDeliveries}} phiếu mới, {{completedDeliveries}} đã giao\n📨 *ZNS*: {{znsSent}} gửi, {{znsSuccess}} thành công ({{znsSuccessRate}}%)\n\n{{#hasUrgent}}\n⚠️ *Việc cần xử lý*:\n{{urgentItems}}\n{{/hasUrgent}}`,
             alertDlq: `🚨 *Cảnh báo ZNS DLQ cao*\nSố lượng tin nhắn lỗi (DLQ): {{count}} tin/giờ.`,
             alertContract: `⚠️ *Hợp đồng sắp hết hạn*\nMã HĐ: {{id}} - Tên: {{name}} sắp hết hạn vào ngày {{endDate}}.`,
             alertPayment: `⚠️ *Phiếu thanh toán quá hạn*\nMã: {{id}} - Số tiền: {{amount}} ₫ quá hạn từ ngày {{dueDate}}.`,
             manualReport: `📊 *Báo cáo tùy chọn*\n\n[Đang tự động thu thập và gửi...]`
          },
          updatedAt: new Date().toISOString(),
          updatedBy: 'system'
       };
       try {
          await adminDb.collection('settings').doc('telegram_config').set(defaultConfig as unknown as Record<string, unknown>);
       } catch (e: unknown) {
          logger.error({ error: e instanceof Error ? e.message : String(e) }, 'Failed to auto-seed telegram config');
       }
       return defaultConfig;
    }
    return doc.data() as TelegramConfig;
  }

  private async getToken(): Promise<string> {
    const config = await this.getConfig();
    if (!config?.enabled || !config?.botToken) {
      throw new Error('Telegram is not enabled or bot token is missing');
    }
    return config.botToken;
  }

  public async sendMessage(chatId: string, text: string, opts?: { parseMode?: 'Markdown' | 'HTML', disableNotification?: boolean }): Promise<{ messageId: number; ok: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text,
      };
      
      if (opts?.parseMode) {
        payload.parse_mode = opts.parseMode;
      }
      if (opts?.disableNotification) {
        payload.disable_notification = true;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.description || 'Failed to send telegram message');
      }

      return {
        ok: true,
        messageId: data.result.message_id
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, chatId }, 'Failed to send Telegram message');
      return { ok: false, messageId: 0, error: errorMsg };
    }
  }

  public async sendToAllEnabled(text: string, filter: 'digest' | 'alert' | 'manual', parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<{ sent: number, failed: number }> {
    const config = await this.getConfig();
    if (!config?.enabled || !config.botToken) return { sent: 0, failed: 0 };

    let targetChats = config.chats.filter(c => c.enabled);
    if (filter === 'digest') targetChats = targetChats.filter(c => c.receiveDigest);
    if (filter === 'alert') targetChats = targetChats.filter(c => c.receiveAlerts);
    if (filter === 'manual') targetChats = targetChats.filter(c => c.receiveManualReports);

    let sent = 0;
    let failed = 0;

    for (const chat of targetChats) {
      const res = await this.sendMessage(chat.chatId, text, { parseMode });
      if (res.ok) {
        sent++;
      } else {
        failed++;
      }
      // Simple rate limit helper
      await new Promise(r => setTimeout(r, 50)); 
    }

    return { sent, failed };
  }

  public async testBot(token: string, chatId?: string): Promise<{ ok: boolean, error?: string }> {
    try {
      // If we only have token, test GetMe. If we have both, test sendMessage.
      if (chatId) {
         const url = `https://api.telegram.org/bot${token}/sendMessage`;
         const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '✅ Kết nối thành công bot Telegram nội bộ!' })
         });
         const data = await response.json();
         if (!response.ok || !data.ok) return { ok: false, error: data.description };
         return { ok: true };
      } else {
         const url = `https://api.telegram.org/bot${token}/getMe`;
         const response = await fetch(url, { method: 'POST' });
         const data = await response.json();
         if (!response.ok || !data.ok) return { ok: false, error: data.description };
         return { ok: true };
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      return { ok: false, error: errorMsg };
    }
  }

  public async logSentMessage(chatId: string, messageType: 'DIGEST' | 'ALERT' | 'MANUAL', content: string, status: 'SUCCESS' | 'FAILED', errorMessage?: string): Promise<void> {
    try {
       await adminDb.collection('telegramSentLog').add({
          chatId,
          messageType,
          content,
          status,
          errorMessage: errorMessage || null,
          sentAt: new Date().toISOString()
       });
    } catch(e: unknown) {
       logger.error({ error: e instanceof Error ? e.message : String(e) }, 'Failed to log telegram message');
    }
  }
}

export const telegramService = TelegramService.getInstance();
