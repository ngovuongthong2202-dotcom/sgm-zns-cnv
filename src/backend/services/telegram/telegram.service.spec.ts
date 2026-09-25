import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService, TelegramConfig } from './telegram.service';
import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

// Mock dependencies
vi.mock('../../config/supabase.admin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    set: vi.fn(),
    add: vi.fn(),
  }
}));
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  }
}));
global.fetch = vi.fn() as any;
describe('TelegramService', () => {
  let service: TelegramService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = TelegramService.getInstance();
  });
  describe('getConfig', () => {
    it('should return existing config if document exists', async () => {
      const mockConfig: Partial<TelegramConfig> = { botToken: 'mock-token', enabled: true };
      (adminDb.collection('settings').doc('telegram_config').get as any).mockResolvedValueOnce({
        exists: true,
        data: () => mockConfig
      });

      const result = await service.getConfig();
      expect(result).toEqual(mockConfig);
    });
    it('should seed and return default config if document does not exist', async () => {
      (adminDb.collection('settings').doc('telegram_config').get as any).mockResolvedValueOnce({
        exists: false,
      });

      const result = await service.getConfig();
      expect(result).toBeDefined();
      expect(result?.botToken).toBe('');
      expect(adminDb.collection('settings').doc('telegram_config').set).toHaveBeenCalled();
    });
  });
  describe('sendMessage', () => {
    it('should fail if token is missing or disabled', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValueOnce({ enabled: false, botToken: '' } as any);
      const result = await service.sendMessage('chat-123', 'Hello');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Telegram is not enabled');
    });
    it('should send message successfully', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValueOnce({ enabled: true, botToken: 'valid-token' } as any);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 42 } })
      });

      const result = await service.sendMessage('chat-123', 'Hello');
      expect(result.ok).toBe(true);
      expect(result.messageId).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botvalid-token/sendMessage',
        expect.any(Object)
      );
    });
    it('should handle API errors gracefully', async () => {
      vi.spyOn(service, 'getConfig').mockResolvedValueOnce({ enabled: true, botToken: 'valid-token' } as any);
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, description: 'Bad Request' })
      });

      const result = await service.sendMessage('chat-123', 'Hello');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Bad Request');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
