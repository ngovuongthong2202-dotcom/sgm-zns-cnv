import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveDeliverySourceDocument } from './deliverySourceResolver';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { repositoryFactory } from '@/src/data/repositories/factory';

describe('deliverySourceResolver (Sovereign Hybrid Multi-Tier Lineage Engine)', () => {
  beforeEach(() => {
    entityCachePool.clear();
    vi.restoreAllMocks();
  });

  it('returns null when input is null, undefined, or empty', async () => {
    expect(await resolveDeliverySourceDocument(null)).toBeNull();
    expect(await resolveDeliverySourceDocument(undefined)).toBeNull();
    expect(await resolveDeliverySourceDocument({})).toBeNull();
  });

  describe('Tier 1: Contract Resolution & Self-Healing', () => {
    it('resolves Contract directly from passed options.contracts', async () => {
      const mockContract = { id: 'CTR-001', soHopDong: 'HD-2026/01', loaiBaoGia: 'BG Máy' };
      const res = await resolveDeliverySourceDocument(
        { contractId: 'CTR-001' },
        { contracts: [mockContract] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('contracts');
      expect(res?.sourceId).toBe('CTR-001');
      expect(res?.source.soHopDong).toBe('HD-2026/01');
    });

    it('resolves Contract from entityCachePool if not in options', async () => {
      const mockContract = { id: 'CTR-002', soHopDong: 'HD-2026/02' };
      entityCachePool.set('contracts', mockContract);

      const res = await resolveDeliverySourceDocument({ contractId: 'CTR-002' });
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('contracts');
      expect(res?.sourceId).toBe('CTR-002');
    });

    it('Self-Healing: successfully resolves Quotation when contractId was polluted with a Quotation ID', async () => {
      const mockQuotation = { id: 'QUO-VT-001', soPhieuBaoGia: 'BGVT-001', loaiBaoGia: 'BG Vật Tư' };
      // User created delivery where contractId = 'QUO-VT-001' by mistake
      const res = await resolveDeliverySourceDocument(
        { contractId: 'QUO-VT-001' },
        { quotations: [mockQuotation] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-VT-001');
      expect(res?.source.loaiBaoGia).toBe('BG Vật Tư');
    });
  });

  describe('Tier 2: Quotation Resolution & Self-Healing', () => {
    it('resolves Quotation directly from options.quotations', async () => {
      const mockQuotation = { id: 'QUO-DV-001', soPhieuBaoGia: 'BGDV-001', loaiBaoGia: 'BG Dịch Vụ' };
      const res = await resolveDeliverySourceDocument(
        { quotationId: 'QUO-DV-001' },
        { quotations: [mockQuotation] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-DV-001');
      expect(res?.source.soPhieuBaoGia).toBe('BGDV-001');
    });

    it('resolves Quotation from entityCachePool', async () => {
      const mockQuotation = { id: 'QUO-VT-002', soPhieuBaoGia: 'BGVT-002' };
      entityCachePool.set('quotations', mockQuotation);

      const res = await resolveDeliverySourceDocument({ quotationId: 'QUO-VT-002' });
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-VT-002');
    });

    it('Self-Healing: resolves Contract when quotationId actually references a Contract', async () => {
      const mockContract = { id: 'CTR-003', soHopDong: 'HD-2026/03' };
      const res = await resolveDeliverySourceDocument(
        { quotationId: 'CTR-003' },
        { contracts: [mockContract] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('contracts');
      expect(res?.sourceId).toBe('CTR-003');
    });
  });

  describe('Tier 3: Payment Linkage Fallback (Phiếu Thu -> Báo Giá / Hợp Đồng)', () => {
    it('resolves Quotation via paymentId when payment links to quotationId', async () => {
      const mockPayment = { id: 'PT-001', quotationId: 'QUO-VT-100', contractId: '' };
      const mockQuotation = { id: 'QUO-VT-100', soPhieuBaoGia: 'BGVT-100', loaiBaoGia: 'BG Vật Tư' };

      const res = await resolveDeliverySourceDocument(
        { paymentId: 'PT-001' },
        { payments: [mockPayment], quotations: [mockQuotation] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-VT-100');
    });

    it('resolves Contract via paymentId when payment links to contractId', async () => {
      const mockPayment = { id: 'PT-002', contractId: 'CTR-200' };
      const mockContract = { id: 'CTR-200', soHopDong: 'HD-2026/200' };

      const res = await resolveDeliverySourceDocument(
        { paymentId: 'PT-002' },
        { payments: [mockPayment], contracts: [mockContract] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('contracts');
      expect(res?.sourceId).toBe('CTR-200');
    });

    it('resolves standalone Payment document when payment has products array', async () => {
      const mockPayment = {
        id: 'PT-003',
        quotationId: '',
        contractId: '',
        products: [{ tenSanPham: 'Vật tư test', soLuong: 5 }]
      };

      const res = await resolveDeliverySourceDocument(
        { paymentId: 'PT-003' },
        { payments: [mockPayment] }
      );
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('PT-003');
      expect(res?.source.products).toHaveLength(1);
    });
  });

  describe('Tier 4: Code Matching Fallback', () => {
    it('resolves Contract by soHopDong in entityCachePool', async () => {
      const mockContract = { id: 'CTR-999', soHopDong: 'HD-CODE-999' };
      entityCachePool.set('contracts', mockContract);

      const res = await resolveDeliverySourceDocument({ soHopDong: 'HD-CODE-999' });
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('contracts');
      expect(res?.sourceId).toBe('CTR-999');
    });

    it('resolves Quotation by soPhieuBaoGia in entityCachePool', async () => {
      const mockQuotation = { id: 'QUO-888', soPhieuBaoGia: 'BG-CODE-888' };
      entityCachePool.set('quotations', mockQuotation);

      const res = await resolveDeliverySourceDocument({ soPhieuBaoGia: 'BG-CODE-888' });
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-888');
    });
  });

  describe('Fallback to Repository', () => {
    it('fetches from repository if not in memory/cache', async () => {
      const mockRepoQuotation = { id: 'QUO-REPO-01', soPhieuBaoGia: 'BG-REPO-01' };
      const getByIdMock = vi.fn().mockResolvedValue(mockRepoQuotation);
      vi.spyOn(repositoryFactory, 'get').mockReturnValue({
        getById: getByIdMock
      } as any);

      const res = await resolveDeliverySourceDocument({ quotationId: 'QUO-REPO-01' });
      expect(getByIdMock).toHaveBeenCalledWith('QUO-REPO-01');
      expect(res).not.toBeNull();
      expect(res?.sourceType).toBe('quotations');
      expect(res?.sourceId).toBe('QUO-REPO-01');
    });
  });
});
