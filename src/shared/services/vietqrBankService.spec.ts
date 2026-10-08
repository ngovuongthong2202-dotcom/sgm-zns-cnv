import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchVietQRBankList,
  lookupAccountNumber,
  getCompanyBankingConfig,
  saveCompanyBankingConfig,
  subscribeCompanyBankingConfig,
  DEFAULT_COMPANY_BANKING,
  FALLBACK_VIETNAM_BANKS,
  _resetBankMemoryCacheForTesting,
} from './vietqrBankService';
import { settingsRepo } from '@/src/data/repositories/settings.repo';

describe('vietqrBankService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetBankMemoryCacheForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchVietQRBankList', () => {
    it('returns banks from API when API succeeds', async () => {
      const mockBanks = [
        { id: 1, name: 'Ngân hàng ACB', code: 'ACB', bin: '970416', shortName: 'ACB', logo: 'acb.png' },
      ];
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: '00', desc: 'success', data: mockBanks }),
      } as any);

      const result = await fetchVietQRBankList();
      expect(result).toHaveLength(1);
      expect(result[0].shortName).toBe('ACB');
    });

    it('falls back to default banks when API fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      // Clean in-memory cache by forcing fallback
      const result = await fetchVietQRBankList();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((b) => b.code === 'VCB')).toBe(true);
    });
  });

  describe('lookupAccountNumber', () => {
    it('fails when bin or accountNumber is empty', async () => {
      const res = await lookupAccountNumber('', '');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Vui lòng cung cấp');
    });

    it('returns accountName on successful lookup', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: '00',
          desc: 'success',
          data: { accountName: 'CONG TY CO KHI SGM' },
        }),
      } as any);

      const res = await lookupAccountNumber('970436', '0302636521001');
      expect(res.success).toBe(true);
      expect(res.accountName).toBe('CONG TY CO KHI SGM');
    });

    it('returns helpful error message when 401 code is returned', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: '401',
          desc: 'Missing API Key & Client Key',
        }),
      } as any);

      const res = await lookupAccountNumber('970436', '0302636521001');
      expect(res.success).toBe(false);
      expect(res.message).toContain('VietQR Client ID & API Key');
    });
  });

  describe('getCompanyBankingConfig & saveCompanyBankingConfig', () => {
    it('returns default config when no config saved in settingsRepo', async () => {
      vi.spyOn(settingsRepo, 'getSettings').mockResolvedValueOnce(null);
      const config = await getCompanyBankingConfig();
      expect(config.accountNumber).toBe(DEFAULT_COMPANY_BANKING.accountNumber);
      expect(config.bankShortName).toBe('Vietcombank');
    });

    it('saves and updates company banking config correctly', async () => {
      const setSpy = vi.spyOn(settingsRepo, 'setSettings').mockResolvedValueOnce(undefined as any);
      vi.spyOn(settingsRepo, 'getSettings').mockResolvedValueOnce(DEFAULT_COMPANY_BANKING as any);

      await saveCompanyBankingConfig({
        accountNumber: '999888777',
        bankShortName: 'MBBank',
        bankBin: '970422',
      });

      expect(setSpy).toHaveBeenCalledWith(
        'company_banking',
        expect.objectContaining({
          accountNumber: '999888777',
          bankShortName: 'MBBank',
          bankBin: '970422',
        }),
        true
      );
    });

    it('supports subscription for realtime banking changes', () => {
      let registeredCb: any = null;
      vi.spyOn(settingsRepo, 'subscribeSettings').mockImplementationOnce((_id, cb) => {
        registeredCb = cb;
        return () => {};
      });

      const subscriber = vi.fn();
      subscribeCompanyBankingConfig(subscriber);

      expect(registeredCb).toBeDefined();
      registeredCb({
        bankBin: '970415',
        bankCode: 'ICB',
        bankName: 'VietinBank',
        bankShortName: 'VietinBank',
        accountNumber: '11223344',
        accountHolder: 'CONG TY SGM',
        branch: 'Chi nhanh Binh Tan',
      });

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '11223344',
          bankShortName: 'VietinBank',
        })
      );
    });
  });
});
