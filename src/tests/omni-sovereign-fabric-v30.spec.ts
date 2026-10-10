import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CORE_HARD_CAP } from '../platform/data/list-limits';
import { validateDeliveryBusinessRules, normalizeDeliveryFormValues } from '../modules/fulfillment/ui/components/DeliveryFormHelpers';
import { 
  calculateActualMachineCount, 
  smartAllocateSerials, 
} from '../widgets/product-list-input/useProductItemSemantic';
import { 
  analyzeProductTypeImpact, 
  syncProductTypeCascading 
} from '../modules/sales/domain/services/productTypeCascadingSyncService';
import { repositoryFactory } from '../data/repositories/factory';
import { entityCachePool } from '../platform/data/entity-cache-pool';
import { auditLogsRepo } from '../data/repositories/system.repo';
import { QUOTATION_LOAI } from '../domain/enums/quotation-loai';

describe('SGM Omni-Sovereign Fabric v30: End-to-End Business Logic & Integrity Specification', () => {

  describe('Pillar 1: Delivery Business Rule Validation for MATERIAL vs MACHINE', () => {
    const baseDeliveryData = {
      soPhieuXuat: 'PXK-2026-001',
      donViVanChuyen: 'Chành xe Phương Trang',
      slMay: 0,
      loai: 'VẬT TƯ'
    };

    it('allows MATERIAL item with quantity 5 and 0 serials (must never block submission)', () => {
      const data = {
        ...baseDeliveryData,
        products: [
          {
            productId: 'VT-001',
            productName: 'Lưỡi dao cắt tôn Cr12MoV',
            quantity: 5,
            itemType: 'MATERIAL',
            unit: 'Bộ',
            danhSachMaMay: []
          }
        ]
      };

      const result = validateDeliveryBusinessRules(data, [], {}, null);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows MATERIAL item with quantity 5 and 1 lot/batch code (partial/single serial is valid)', () => {
      const data = {
        ...baseDeliveryData,
        products: [
          {
            productId: 'VT-001',
            productName: 'Lưỡi dao cắt tôn',
            quantity: 5,
            itemType: 'MATERIAL',
            unit: 'Bộ',
            danhSachMaMay: ['LOT-2026-CR12']
          }
        ]
      };

      const result = validateDeliveryBusinessRules(data, [], {}, null);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('reproduces and resolves the user bug: "Con đếm AUTONICS..." with type MATERIAL and 0 serials passes validation', () => {
      const data = {
        ...baseDeliveryData,
        products: [
          {
            productId: 'VT-AUTONICS',
            productName: 'Con đếm AUTONICS FS4-1P4',
            quantity: 1,
            itemType: 'MATERIAL',
            unit: 'Cái',
            danhSachMaMay: []
          }
        ]
      };

      const result = validateDeliveryBusinessRules(data, [], {}, null);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('strictly enforces serial quota ONLY for MACHINE items', () => {
      const invalidMachineData = {
        ...baseDeliveryData,
        loai: 'MÁY',
        slMay: 2,
        products: [
          {
            productId: 'MAY-001',
            productName: 'Máy cán tôn sóng vuông',
            quantity: 2,
            itemType: 'MACHINE',
            unit: 'Bộ',
            danhSachMaMay: ['SN-001'] // Only 1 serial while quantity is 2
          }
        ]
      };

      const invalidResult = validateDeliveryBusinessRules(invalidMachineData, [], {}, null);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('đang giao 2 máy nhưng chỉ có 1 mã serial. Vui lòng nhập đủ 2 serial máy');

      const validMachineData = {
        ...baseDeliveryData,
        loai: 'MÁY',
        slMay: 2,
        danhSachMaMay: ['SN-001', 'SN-002'],
        products: [
          {
            productId: 'MAY-001',
            productName: 'Máy cán tôn sóng vuông',
            quantity: 2,
            itemType: 'MACHINE',
            unit: 'Bộ',
            danhSachMaMay: ['SN-001', 'SN-002']
          }
        ]
      };

      const validResult = validateDeliveryBusinessRules(validMachineData, [], {}, null);
      expect(validResult.valid).toBe(true);
    });

    it('rejects delivery if required ERP voucher number or carrier is missing', () => {
      const missingVoucher = { ...baseDeliveryData, soPhieuXuat: '' };
      expect(validateDeliveryBusinessRules(missingVoucher, [], {}, null).valid).toBe(false);

      const missingCarrier = { ...baseDeliveryData, donViVanChuyen: '' };
      expect(validateDeliveryBusinessRules(missingCarrier, [], {}, null).valid).toBe(false);
    });
  });

  describe('Pillar 2: Actual Machine Count & Smart Allocation Semantic Kernel', () => {
    it('accurately counts only MACHINE items and ignores MATERIAL and SERVICE rows in slMay calculation', () => {
      const mixedProducts = [
        { productName: 'Máy cán xà gồ C/Z', quantity: 2, itemType: 'MACHINE' },
        { productName: 'Ốc vít bu lông M12', quantity: 50, itemType: 'MATERIAL' },
        { productName: 'Lưỡi dao cắt hợp kim', quantity: 4, itemType: 'MATERIAL' },
        { productName: 'Dịch vụ chuyển giao công nghệ', quantity: 1, itemType: 'SERVICE' },
        { productName: 'Máy dập vòm thuỷ lực K1200', quantity: 1, itemType: 'MACHINE' }
      ];

      const count = calculateActualMachineCount(mixedProducts);
      expect(count).toBe(3); // 2 + 1 = 3 machines
    });

    it('preserves existing serials on MATERIAL items during smartAllocateSerials', () => {
      const rootContractSerials = ['SN-M01', 'SN-M02'];
      const products = [
        {
          productName: 'Máy cán tôn 2 tầng',
          quantity: 2,
          itemType: 'MACHINE',
          danhSachMaMay: []
        },
        {
          productName: 'Linh kiện cảm biến quang',
          quantity: 2,
          itemType: 'MATERIAL',
          danhSachMaMay: ['LOT-CB-99'] // Pre-existing lot code
        }
      ];

      const allocated = smartAllocateSerials(products as any, rootContractSerials);
      expect(allocated[0].danhSachMaMay).toEqual(['SN-M01', 'SN-M02']);
      expect(allocated[1].danhSachMaMay).toEqual(['LOT-CB-99']); // Must NOT be wiped
    });
  });

  describe('Pillar 3: Product Type Cascading Synchronization Service', () => {
    const mockQuotation = {
      id: 'quote-100',
      soPhieuBaoGia: 'BG-2026-0010',
      loai: 'MÁY',
      slMay: 1,
      products: [
        {
          productId: 'P-001',
          productName: 'Con đếm AUTONICS FS4-1P4',
          quantity: 1,
          unit: 'Cái',
          itemType: 'MACHINE' // Initially incorrectly marked as MACHINE
        }
      ]
    };

    const mockContract = {
      id: 'contract-100',
      soHopDong: 'HD-2026-0010',
      quotationId: 'quote-100',
      soPhieuBaoGia: 'BG-2026-0010',
      slMay: 1,
      products: [
        {
          productId: 'P-001',
          productName: 'Con đếm AUTONICS FS4-1P4',
          quantity: 1,
          unit: 'Cái',
          itemType: 'MACHINE'
        }
      ]
    };

    const mockPayment = {
      id: 'pay-100',
      soPhieuThu: 'PT-2026-0010',
      quotationId: 'quote-100',
      contractId: 'contract-100',
      slMay: 1,
      products: [
        {
          productId: 'P-001',
          productName: 'Con đếm AUTONICS FS4-1P4',
          quantity: 1,
          unit: 'Cái',
          itemType: 'MACHINE'
        }
      ]
    };

    const mockDelivery = {
      id: 'del-100',
      deliveryId: 'PGH-2026-0010',
      quotationId: 'quote-100',
      contractId: 'contract-100',
      paymentId: 'pay-100',
      slMay: 1,
      products: [
        {
          productId: 'P-001',
          productName: 'Con đếm AUTONICS FS4-1P4',
          quantity: 1,
          unit: 'Cái',
          itemType: 'MACHINE',
          danhSachMaMay: []
        }
      ]
    };

    beforeEach(() => {
      // Mock repository methods
      const mockQuoteRepo = {
        list: vi.fn().mockResolvedValue([mockQuotation]),
        listAll: vi.fn().mockResolvedValue({ items: [mockQuotation], total: 1, capped: false }),
        get: vi.fn().mockResolvedValue(mockQuotation),
        update: vi.fn().mockResolvedValue(true)
      };
      const mockContractRepo = {
        list: vi.fn().mockResolvedValue([mockContract]),
        listAll: vi.fn().mockResolvedValue({ items: [mockContract], total: 1, capped: false }),
        get: vi.fn().mockResolvedValue(mockContract),
        update: vi.fn().mockResolvedValue(true)
      };
      const mockPaymentRepo = {
        list: vi.fn().mockResolvedValue([mockPayment]),
        listAll: vi.fn().mockResolvedValue({ items: [mockPayment], total: 1, capped: false }),
        get: vi.fn().mockResolvedValue(mockPayment),
        update: vi.fn().mockResolvedValue(true)
      };
      const mockDeliveryRepo = {
        list: vi.fn().mockResolvedValue([mockDelivery]),
        listAll: vi.fn().mockResolvedValue({ items: [mockDelivery], total: 1, capped: false }),
        get: vi.fn().mockResolvedValue(mockDelivery),
        update: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(repositoryFactory, 'get').mockImplementation((repoName: string): any => {
        if (repoName === 'quotations') return mockQuoteRepo;
        if (repoName === 'contracts') return mockContractRepo;
        if (repoName === 'payments') return mockPaymentRepo;
        if (repoName === 'deliveries') return mockDeliveryRepo;
        return { list: vi.fn().mockResolvedValue([]), listAll: vi.fn().mockResolvedValue({ items: [], total: 0, capped: false }), update: vi.fn().mockResolvedValue(true) };
      });

      vi.spyOn(auditLogsRepo, 'create').mockResolvedValue('audit-1' as any);
      vi.spyOn(entityCachePool, 'set').mockImplementation(() => {});
    });

    it('pre-evaluates downstream impact across linked contracts, payments, and deliveries', async () => {
      const impact = await analyzeProductTypeImpact(mockQuotation as any, 0, 'MATERIAL');

      expect(impact.quotationId).toBe('quote-100');
      expect(impact.itemIndex).toBe(0);
      expect(impact.oldType).toBe('MACHINE');
      expect(impact.newType).toBe('MATERIAL');
      expect(impact.linkedContracts.length).toBe(1);
      expect(impact.linkedPayments.length).toBe(1);
      expect(impact.linkedDeliveries.length).toBe(1);
    });

    it('quét chứng từ liên kết bằng listAll tới trần CORE_HARD_CAP thay vì list({ limit: 500 }) (Đợt 0A DL01)', async () => {
      await analyzeProductTypeImpact(mockQuotation as any, 0, 'MATERIAL');
      const contractRepo = (repositoryFactory.get as any)('contracts');
      expect(contractRepo.listAll).toHaveBeenCalledWith({}, { maxRows: CORE_HARD_CAP });
      expect(contractRepo.list).not.toHaveBeenCalledWith({ limit: 500 });
    });

    it('executes atomic cascading sync, recomputing slMay and adapting document category', async () => {
      const result = await syncProductTypeCascading(
        mockQuotation as any,
        0,
        'MATERIAL',
        { email: 'admin@saigonmachine.vn', displayName: 'Admin SGM' }
      );

      expect(result.success).toBe(true);
      expect(result.syncedContractsCount).toBe(1);
      expect(result.syncedPaymentsCount).toBe(1);
      expect(result.syncedDeliveriesCount).toBe(1);
      expect(result.recalculatedSlMay).toBe(0); // 0 machines now
      expect(result.updatedQuotation.products[0].itemType).toBe('MATERIAL');
      expect(result.updatedQuotation.loai).toBe(QUOTATION_LOAI.VAT_TU); // Automatically flipped from MÁY to VẬT TƯ ('BG Vật tư')
    });
  });

  describe('Pillar 4: Form Normalization & Data Cleansing', () => {
    it('sanitizes codes, trims strings and automatically aggregates line serials to delivery header', () => {
      const rawForm = {
        deliveryId: '  PGH-2026-0099  ',
        soPhieuXuat: ' 11-PXBHDH2604-099 ',
        donViVanChuyen: ' Chành xe Tô Châu ',
        products: [
          {
            productId: ' MAY-1 ',
            productName: '  Máy dập tôn  ',
            quantity: 1,
            unit: ' Máy ',
            soNgayBaoHanh: '365',
            danhSachMaMay: ['  SN-A101  ']
          }
        ]
      };

      const normalized = normalizeDeliveryFormValues(rawForm);
      expect(normalized.deliveryId).toBe('PGH-2026-0099');
      expect(normalized.soPhieuXuat).toBe('11-PXBHDH2604-099');
      expect(normalized.donViVanChuyen).toBe('Chành xe Tô Châu');
      expect(normalized.products[0].danhSachMaMay).toEqual(['SN-A101']);
      expect(normalized.danhSachMaMay).toEqual(['SN-A101']);
      expect(normalized.products[0].soNgayBaoHanh).toBe(365);
    });
  });
});
