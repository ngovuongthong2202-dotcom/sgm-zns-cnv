import { describe, it, expect, vi } from 'vitest';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { normalizeDeliveryFormValues } from '@/src/modules/fulfillment/ui/components/DeliveryFormHelpers';
import { sanitizeErpUrl, DEFAULT_ERP_CONFIG } from '@/src/backend/services/erp/erp.config';
import { resolveSalesOrderByContractNumber } from '@/src/modules/sales/domain/services/salesOrderErpBridgeService';

describe('Omni-Sovereign Nexus Master Fabric v36 Test Suite', () => {

  describe('1. Deterministic Zero-VAT Kernel (Lỗi VAT 0% không bị phục hồi)', () => {
    it('should strictly preserve 0% VAT when line item is updated from 10% to 0%', () => {
      // Báo giá ban đầu với VAT 10%
      const initialItem = computeLineItem({
        id: 'item-1',
        productId: 'VT-001',
        productName: 'Mực in CIJ đen',
        quantity: 2,
        price: 700000,
        vatPct: 10
      });

      expect(initialItem.subtotalBeforeTax).toBe(1400000);
      expect(initialItem.vatAmount).toBe(140000);
      expect(initialItem.subtotalAfterTax).toBe(1540000);

      // Người dùng sửa lại VAT 0% trên cùng object (mang theo taxAmount / vatAmount cũ 140000)
      const updatedItem = computeLineItem({
        ...initialItem,
        vatPct: 0 // explicit 0%
      });

      // Kiểm tra: Thuế VAT phải là 0, không được hồi sinh 140.000 ₫
      expect(updatedItem.vatPct).toBe(0);
      expect(updatedItem.vatAmount).toBe(0);
      expect(updatedItem.taxAmount).toBe(0);
      expect(updatedItem.subtotalBeforeTax).toBe(1400000);
      expect(updatedItem.subtotalAfterTax).toBe(1400000);
      expect(updatedItem.total).toBe(1400000);

      // Khi tổng hợp toàn bộ báo giá
      const aggs = aggregateProducts([updatedItem]);
      expect(aggs.totalBeforeTax).toBe(1400000);
      expect(aggs.totalVat).toBe(0);
      expect(aggs.totalAfterTax).toBe(1400000);
    });

    it('should correctly handle mixed VAT rates including 0% alongside other items', () => {
      const item1 = computeLineItem({
        id: '1',
        productName: 'Vật tư chịu thuế 0%',
        quantity: 1,
        price: 1000000,
        vatPct: 0,
        taxAmount: 100000 // stale tax amount
      });

      const item2 = computeLineItem({
        id: '2',
        productName: 'Vật tư chịu thuế 8%',
        quantity: 1,
        price: 2000000,
        vatPct: 8
      });

      expect(item1.vatAmount).toBe(0);
      expect(item1.subtotalAfterTax).toBe(1000000);

      expect(item2.vatAmount).toBe(160000);
      expect(item2.subtotalAfterTax).toBe(2160000);

      const aggs = aggregateProducts([item1, item2]);
      expect(aggs.totalBeforeTax).toBe(3000000);
      expect(aggs.totalVat).toBe(160000);
      expect(aggs.totalAfterTax).toBe(3160000);
    });
  });

  describe('2. Omnidirectional Foreign Key Shield (Tránh lỗi FK deliveries_contract_id_fkey)', () => {
    it('should sanitize non-UUID contractId into null while strictly preserving soHopDong', () => {
      const rawDeliveryPayload = {
        deliveryId: 'PGH2026-0099',
        soPhieuXuat: 'PXK-ERP-01',
        donViVanChuyen: 'Viettel Post',
        // User entered contract code string instead of PostgreSQL UUID
        contractId: '217/VT-SGM/2026',
        soHopDong: '217/VT-SGM/2026',
        slMay: 0,
        products: [
          { productName: 'Lõi lọc vi sinh', quantity: 5 }
        ]
      };

      const normalized = normalizeDeliveryFormValues(rawDeliveryPayload);

      // contractId không phải UUID hợp lệ -> phải được gán thành null để không vi phạm FK
      expect(normalized.contractId).toBeNull();
      // soHopDong được bảo toàn nguyên vẹn
      expect(normalized.soHopDong).toBe('217/VT-SGM/2026');
    });

    it('should move contractId string to soHopDong if soHopDong was omitted', () => {
      const rawDeliveryPayload = {
        deliveryId: 'PGH2026-0100',
        soPhieuXuat: 'PXK-ERP-02',
        donViVanChuyen: 'GHTK',
        contractId: '244/SC-SGM/2026',
        slMay: 0
      };

      const normalized = normalizeDeliveryFormValues(rawDeliveryPayload);

      expect(normalized.contractId).toBeNull();
      expect(normalized.soHopDong).toBe('244/SC-SGM/2026');
    });

    it('should keep valid UUID contractId untouched', () => {
      const validUuid = 'c8b3e8e2-8924-4f8e-9430-bf482d8c3641';
      const rawDeliveryPayload = {
        deliveryId: 'PGH2026-0101',
        soPhieuXuat: 'PXK-ERP-03',
        donViVanChuyen: 'Xe công ty',
        contractId: validUuid,
        soHopDong: 'HD-2026-01'
      };

      const normalized = normalizeDeliveryFormValues(rawDeliveryPayload);
      expect(normalized.contractId).toBe(validUuid);
      expect(normalized.soHopDong).toBe('HD-2026-01');
    });
  });

  describe('3. Resilient ERP Sales Orders Reconciler & Self-Healing URLs', () => {
    it('should automatically self-heal typo sgn.vnaisoft.com to sgm.vnaisoft.com', () => {
      const typoUrl = 'https://sgn.vnaisoft.com/api/public/sales-orders';
      const healed = sanitizeErpUrl(typoUrl, DEFAULT_ERP_CONFIG.salesOrdersUrl);
      expect(healed).toBe('https://sgm.vnaisoft.com/api/public/sales-orders');
    });

    it('should automatically self-heal typo itens to items', () => {
      const typoUrl = 'https://sgm.vnaisoft.com/api/public/itens';
      const healed = sanitizeErpUrl(typoUrl, DEFAULT_ERP_CONFIG.itemsUrl);
      expect(healed).toBe('https://sgm.vnaisoft.com/api/public/items');
    });

    it('should resolve sales order from local contracts when available', async () => {
      const mockContracts = [
        {
          id: 'contract-uuid-1',
          soHopDong: '244/SC-SGM/2026',
          soDonHang: '11-KDDH2609-088',
          tenKhachHang: 'Công ty Cổ phần Thép Pomina',
          sdt: '0903123456',
          totalAmount: 15000000
        }
      ];

      const res = await resolveSalesOrderByContractNumber('244/SC-SGM/2026', mockContracts);
      expect(res.matched).toBe(true);
      expect(res.soHopDong).toBe('244/SC-SGM/2026');
      expect(res.soDonHang).toBe('11-KDDH2609-088');
      expect(res.customerName).toBe('Công ty Cổ phần Thép Pomina');
      expect(res.source).toBe('LOCAL_CONTRACT');
    });

    it('should resolve sales order with case and slash normalization', async () => {
      const mockContracts = [
        {
          id: 'contract-uuid-2',
          soHopDong: '217/VT-SGM/2026',
          soDonHang: '11-KDDH2609-005',
          tenKhachHang: 'Bao Bì Sài Gòn',
          sdt: '0918765432'
        }
      ];

      // Lowercase, without leading or trailing spaces
      const res = await resolveSalesOrderByContractNumber('217/vt-sgm/2026', mockContracts);
      expect(res.matched).toBe(true);
      expect(res.soDonHang).toBe('11-KDDH2609-005');
    });
  });

  describe('4. Enterprise Product Catalog Explorer Logic', () => {
    it('should compute multiple line items with sequential STT and accurate prices', () => {
      const rawCatalogItems = [
        {
          id: 'stage-1',
          productId: 'VT-INK-01',
          productName: 'Mực in CIJ Ink-101',
          unit: 'Bình',
          quantity: 2,
          price: 650000,
          vatPct: 8
        },
        {
          id: 'stage-2',
          productId: 'VT-SOLV-02',
          productName: 'Dung môi Make-up Solv-202',
          unit: 'Chai',
          quantity: 4,
          price: 250000,
          vatPct: 8
        },
        {
          id: 'stage-3',
          productId: 'VT-BELT-03',
          productName: 'Dây curoa motor chính',
          unit: 'Sợi',
          quantity: 1,
          price: 450000,
          vatPct: 10
        }
      ];

      const processed = rawCatalogItems.map((item, idx) =>
        computeLineItem({
          ...item,
          stt: idx + 1
        })
      );

      expect(processed).toHaveLength(3);
      expect(processed[0].stt).toBe(1);
      expect(processed[0].subtotalBeforeTax).toBe(1300000);
      expect(processed[0].vatAmount).toBe(104000);

      expect(processed[1].stt).toBe(2);
      expect(processed[1].subtotalBeforeTax).toBe(1000000);
      expect(processed[1].vatAmount).toBe(80000);

      expect(processed[2].stt).toBe(3);
      expect(processed[2].subtotalBeforeTax).toBe(450000);
      expect(processed[2].vatAmount).toBe(45000);

      const aggs = aggregateProducts(processed);
      expect(aggs.totalBeforeTax).toBe(2750000);
      expect(aggs.totalVat).toBe(229000);
      expect(aggs.totalAfterTax).toBe(2979000);
    });
  });
});
