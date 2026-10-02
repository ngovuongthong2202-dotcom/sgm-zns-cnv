import { describe, it, expect } from 'vitest';
import { QuotationSchema } from '@/src/domain/schema/quotation.schema';
import { ContractSchema } from '@/src/domain/schema/contract.schema';
import { PaymentSchema } from '@/src/domain/schema/payment.schema';
import { DeliverySchema, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { 
  reconcileDeliveryShipments, 
  validateShipmentQuantities, 
  evaluateShipmentFinancialGate, 
  migrateLegacyDeliveriesToUnifiedLedger 
} from '@/src/modules/fulfillment/ui/utils/delivery-reconciler';
import { buildDeliveryZnsPayload } from '@/src/backend/services/zns/zns-payload.builder';

describe('Sovereign Omni-Milestone Nexus & 5-Tier Semantic Engine (V48)', () => {

  describe('Test 1: Decimal & Float Quantity Schema Unlock (slMay Float Support)', () => {
    it('should validate QuotationSchema with float slMay (e.g. 58.5 items/hours)', () => {
      const validQuotation = {
        soPhieuBaoGia: 'BGVT-2026-0001',
        customerId: 'CUST-001',
        tenKhachHang: 'Công ty TNHH Thép Việt Nhật',
        slMay: 58.5,
        loai: 'BG Vật tư',
        products: [
          {
            id: 'item-1',
            productName: 'Lò xo nén dẹp CN',
            quantity: 50,
            price: 150000,
            unit: 'Cái',
            itemType: 'MATERIAL'
          },
          {
            id: 'item-2',
            productName: 'Chi phí thời gian di chuyển kỹ thuật',
            quantity: 8.5,
            price: 200000,
            unit: 'Giờ',
            itemType: 'SERVICE'
          }
        ]
      };

      const result = QuotationSchema.safeParse(validQuotation);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slMay).toBe(58.5);
      }
    });

    it('should validate ContractSchema, PaymentSchema, and DeliverySchema with float slMay', () => {
      const baseObj = {
        contractId: 'HD-2026-001',
        soHopDong: 'HD-2026-001',
        soDonHang: 'DH-2026-001',
        quotationId: 'BG-2026-001',
        customerId: 'CUST-001',
        slMay: 24.5,
        paymentId: 'PT-001',
        deliveryId: 'PGH-001'
      };

      const contractResult = ContractSchema.safeParse({ ...baseObj });
      expect(contractResult.success).toBe(true);

      const paymentResult = PaymentSchema.safeParse({ ...baseObj, soTien: 50000000, tongTienPhaiThu: 100000000 });
      expect(paymentResult.success).toBe(true);

      const deliveryResult = DeliverySchema.safeParse({ ...baseObj });
      expect(deliveryResult.success).toBe(true);
    });
  });

  describe('Test 2: 5-Tier Contextual Deduction Engine', () => {
    it('Tier 1: Quotation context "BG Vật tư" inherently assigns MATERIAL to unfamiliar parts', () => {
      // Products with novel or mechanical names not in any dictionary
      const novelItem1 = detectItemType('Lò xo nén dẹp CN thép lò xo SWP-B', 'Cái', 'MATERIAL');
      const novelItem2 = detectItemType('Ty ren Inox 304 M12 bước ren 1.75', 'Cây', 'MATERIAL');
      const novelItem3 = detectItemType('Cốc bi con lăn dẫn hướng tôn 76x3', 'Cái', 'MATERIAL');
      const novelItem4 = detectItemType('Phe cài trục phi 25 mạ kẽm', 'Cái', 'MATERIAL');
      const novelItem5 = detectItemType('Bản mã đục lỗ oval 150x200 dày 10mm', 'Tấm', 'MATERIAL');

      expect(novelItem1).toBe('MATERIAL');
      expect(novelItem2).toBe('MATERIAL');
      expect(novelItem3).toBe('MATERIAL');
      expect(novelItem4).toBe('MATERIAL');
      expect(novelItem5).toBe('MATERIAL');
    });

    it('Tier 2: Unit-of-Measure Determinism takes precedence for Services and Materials', () => {
      // Hours/Days/Shifts/Trips are inherently SERVICE regardless of name
      expect(detectItemType('Thời gian di chuyển kỹ thuật khảo sát', 'Giờ')).toBe('SERVICE');
      expect(detectItemType('Công tác cân chỉnh máy tại hiện trường', 'Ca')).toBe('SERVICE');
      expect(detectItemType('Phí vận chuyển và cẩu hạ', 'Chuyến')).toBe('SERVICE');
      expect(detectItemType('Gói bảo dưỡng định kỳ 6 tháng', 'Gói')).toBe('SERVICE');

      // Machine/Line/System are inherently MACHINE
      expect(detectItemType('Dây chuyền cán sóng ngói tự động', 'Dây chuyền')).toBe('MACHINE');
      expect(detectItemType('Cụm máy cắt thủy lực servo', 'Cụm máy')).toBe('MACHINE');
    });

    it('Tier 3: ERP Item Code Prefix Pattern determinism', () => {
      expect(detectItemType('Nhân công lắp đặt máy', 'Giờ', 'MACHINE', '705-NC-001')).toBe('SERVICE');
      expect(detectItemType('Gia công phụ tùng', 'Cái', 'MACHINE', 'DV-GC-002')).toBe('SERVICE');
      expect(detectItemType('Thép tấm SS400', 'Kg', 'MACHINE', '152-TP-001')).toBe('MATERIAL');
      expect(detectItemType('Bạc đạn SKF 6205', 'Cái', 'MACHINE', 'VT-BD-6205')).toBe('MATERIAL');
      expect(detectItemType('Máy cán tôn SGM-1200', 'Máy', 'MATERIAL', 'TP-MAY-001')).toBe('MACHINE');
    });

    it('Tier 4: Finite SGM Machine Recognition vs Spare Parts Subtraction', () => {
      // In "BG Máy" context:
      // True machines are recognized as MACHINE
      expect(detectItemType('Máy cán tôn 2 tầng sóng vuông sóng tròn SGM', 'Máy', 'MACHINE')).toBe('MACHINE');
      expect(detectItemType('Máy dập vòm thủy lực tự động', 'Máy', 'MACHINE')).toBe('MACHINE');
      expect(detectItemType('Máy xà gồ C Z tự động đổi size', 'Máy', 'MACHINE')).toBe('MACHINE');

      // Spare parts that might contain the word "máy" or mechanical components are subtracted to MATERIAL
      expect(detectItemType('Dao cắt tôn máy xà gồ SKD11', 'Bộ', 'MACHINE')).toBe('MATERIAL');
      expect(detectItemType('Trục cán định hình số 4 máy cán tôn', 'Cây', 'MACHINE')).toBe('MATERIAL');
      expect(detectItemType('Bánh răng truyền động máy dập vòm', 'Cái', 'MACHINE')).toBe('MATERIAL');
      expect(detectItemType('Lò xo nén dẹp cụm dao cắt', 'Cái', 'MACHINE')).toBe('MATERIAL');
    });
  });

  describe('Test 3: Omni-Milestone Fulfillment Nexus & Reconciler', () => {
    const sampleDelivery = {
      id: 'DEL-MASTER-001',
      deliveryId: 'PGH-0001',
      contractId: 'HD-2026-001',
      soHopDong: 'HD-2026-001',
      customerId: 'CUST-001',
      tenKhachHang: 'Công ty Cơ Khí Hoàng Mai',
      products: [
        {
          id: 'p1',
          productId: 'MAY-CAN-01',
          productName: 'Máy cán tôn 1 tầng 11 sóng',
          quantity: 1,
          price: 450000000,
          unit: 'Máy',
          itemType: 'MACHINE'
        },
        {
          id: 'p2',
          productId: 'VT-LO-XO-01',
          productName: 'Lò xo nén dẹp CN',
          quantity: 50,
          price: 150000,
          unit: 'Cái',
          itemType: 'MATERIAL'
        },
        {
          id: 'p3',
          productId: 'DV-KHAO-SAT-01',
          productName: 'Dịch vụ khảo sát và đo đạc xưởng',
          quantity: 4,
          price: 2500000,
          unit: 'Lần',
          itemType: 'SERVICE'
        }
      ],
      cacDotGiao: [
        {
          id: 'DOT-1',
          dotGiaoHang: 1,
          soPhieuXuat: 'PXK-2026-001',
          ngayGiaoMay: '2026-06-20',
          ngayGiaoThucTe: '2026-06-20',
          tinhTrangGiaoHang: 'HOAN_TAT',
          products: [
            {
              id: 'p2',
              productId: 'VT-LO-XO-01',
              productName: 'Lò xo nén dẹp CN',
              quantity: 20,
              price: 150000,
              unit: 'Cái',
              itemType: 'MATERIAL'
            },
            {
              id: 'p3',
              productId: 'DV-KHAO-SAT-01',
              productName: 'Dịch vụ khảo sát và đo đạc xưởng',
              quantity: 2,
              price: 2500000,
              unit: 'Lần',
              itemType: 'SERVICE'
            }
          ],
          giaTriXuatKhoDotNay: 8000000
        }
      ]
    };

    it('should reconcile cumulative progress and remaining balances correctly after Shipment 1', () => {
      const recon = reconcileDeliveryShipments(sampleDelivery as any);

      expect(recon.totalBaselineQuantity).toBe(55); // 1 machine + 50 springs + 4 services
      expect(recon.totalShippedQuantity).toBe(22); // 20 springs + 2 services
      expect(recon.isFullyDelivered).toBe(false);
      expect(recon.nextDotGiaoHang).toBe(2);

      // Remaining checks:
      const remainingMachine = recon.remainingProducts.find(p => p.productId === 'MAY-CAN-01');
      const remainingSprings = recon.remainingProducts.find(p => p.productId === 'VT-LO-XO-01');
      const remainingServices = recon.remainingProducts.find(p => p.productId === 'DV-KHAO-SAT-01');

      expect(remainingMachine?.remainingQuantity).toBe(1);
      expect(remainingSprings?.remainingQuantity).toBe(30);
      expect(remainingServices?.remainingQuantity).toBe(2);
    });

    it('should block attempts to dispatch quantities exceeding remaining balances', () => {
      const recon = reconcileDeliveryShipments(sampleDelivery as any);

      // Attempt to dispatch 35 springs (when only 30 remain)
      const invalidShipmentProducts = [
        {
          id: 'p2',
          productId: 'VT-LO-XO-01',
          productName: 'Lò xo nén dẹp CN',
          quantity: 35,
          unit: 'Cái'
        }
      ];

      const validation = validateShipmentQuantities(invalidShipmentProducts as any, recon.remainingProducts);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('vượt quá số lượng còn lại');
    });

    it('should allow valid allocation within remaining limits', () => {
      const recon = reconcileDeliveryShipments(sampleDelivery as any);

      const validShipmentProducts = [
        {
          id: 'p1',
          productId: 'MAY-CAN-01',
          productName: 'Máy cán tôn 1 tầng 11 sóng',
          quantity: 1,
          unit: 'Máy'
        },
        {
          id: 'p2',
          productId: 'VT-LO-XO-01',
          productName: 'Lò xo nén dẹp CN',
          quantity: 30,
          unit: 'Cái'
        },
        {
          id: 'p3',
          productId: 'DV-KHAO-SAT-01',
          productName: 'Dịch vụ khảo sát và đo đạc xưởng',
          quantity: 2,
          unit: 'Lần'
        }
      ];

      const validation = validateShipmentQuantities(validShipmentProducts as any, recon.remainingProducts);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Test 4: Shipment Financial Gate & Executive Waiver', () => {
    const sampleDelivery = {
      id: 'DEL-001',
      contractId: 'HD-001',
      cacDotGiao: [
        { dotGiaoHang: 1, giaTriXuatKhoDotNay: 100000000 }
      ]
    };

    it('should flag financial gate when cumulative shipment value exceeds paid payments', () => {
      const allPayments = [
        {
          id: 'PM-001',
          contractId: 'HD-001',
          soTien: 150000000,
          cacDotThu: [{ lanThu: 1, soTien: 150000000 }]
        }
      ];

      // Current shipment 2 value is 100,000,000. Cumulative = 100tr + 100tr = 200tr > 150tr paid!
      const gate = evaluateShipmentFinancialGate(sampleDelivery as any, 100000000, allPayments);
      expect(gate.isPassed).toBe(false);
      expect(gate.requiresExecutiveWaiver).toBe(true);
      expect(gate.shortfallAmount).toBe(50000000);
      expect(gate.warningMessage).toContain('vượt quá số tiền đã thanh toán');
    });

    it('should pass financial gate when payments cover cumulative shipment value', () => {
      const allPayments = [
        {
          id: 'PM-001',
          contractId: 'HD-001',
          soTien: 300000000,
          cacDotThu: [{ lanThu: 1, soTien: 300000000 }]
        }
      ];

      const gate = evaluateShipmentFinancialGate(sampleDelivery as any, 100000000, allPayments);
      expect(gate.isPassed).toBe(true);
      expect(gate.requiresExecutiveWaiver).toBe(false);
    });
  });

  describe('Test 5: Zero-Loss Auto-Migration from Discrete Documents to Unified Ledger', () => {
    it('should merge multiple discrete deliveries of the same order into 1 master record with cacDotGiao', () => {
      const discreteDeliveries = [
        {
          id: 'DEL-DISCRETE-01',
          deliveryId: 'PGH-001',
          contractId: 'HD-2026-999',
          soHopDong: 'HD-2026-999',
          dotGiaoHang: 1,
          soPhieuXuat: 'PXK-999-01',
          ngayGiaoMay: '2026-05-10',
          thoGiaoMay: 'Nguyễn Văn A',
          products: [{ productName: 'Lò xo nén', quantity: 20, unit: 'Cái' }]
        },
        {
          id: 'DEL-DISCRETE-02',
          deliveryId: 'PGH-002',
          contractId: 'HD-2026-999',
          soHopDong: 'HD-2026-999',
          dotGiaoHang: 2,
          soPhieuXuat: 'PXK-999-02',
          ngayGiaoMay: '2026-06-15',
          thoGiaoMay: 'Trần Văn B',
          products: [{ productName: 'Máy cán tôn', quantity: 1, unit: 'Máy' }]
        }
      ];

      const unified = migrateLegacyDeliveriesToUnifiedLedger(discreteDeliveries as any);
      expect(unified.length).toBe(1);

      const master = unified[0];
      expect(master.deliveryId).toBe('PGH-001');
      expect(master.cacDotGiao?.length).toBe(2);
      expect(master.cacDotGiao?.[0].soPhieuXuat).toBe('PXK-999-01');
      expect(master.cacDotGiao?.[1].soPhieuXuat).toBe('PXK-999-02');
      expect(master.cacDotGiao?.[1].thoGiaoMay).toBe('Trần Văn B');
    });
  });

  describe('Test 6: ZNS 9-Variable Payload Extraction for Multi-Shipment', () => {
    it('should generate valid 9-variable ZNS payload for a specific shipment milestone', () => {
      const template = {
        templateId: '12345',
        templateCode: 'GIAOHANG_ZNS',
        variables: [
          { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
          { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
          { name: 'So_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF' },
          { name: 'So_don_hang', label: 'Số ĐH', sourceField: 'soDonHang', sourceEntity: 'SELF' },
          { name: 'so_phieu_xuat', label: 'Số PXK', sourceField: 'soPhieuXuat', sourceEntity: 'SELF' },
          { name: 'ngay_giao_may', label: 'Ngày giao', sourceField: 'ngayGiaoMay', sourceEntity: 'SELF' },
          { name: 'danh_sach_ma_may', label: 'Danh sách máy', sourceField: 'danhSachMaMay', sourceEntity: 'SELF' },
          { name: 'so_luong', label: 'Số lượng', sourceField: 'slMay', sourceEntity: 'SELF' },
          { name: 'dvt', label: 'ĐVT', sourceField: 'dvt', sourceEntity: 'SELF' }
        ]
      };

      const shipmentContext = {
        tenKhachHang: 'Công ty CP Xây Dựng Nam Phát',
        sdt: '0912345678',
        soHopDong: 'HD-2026-888',
        soDonHang: 'DH-2026-888',
        soPhieuXuat: 'PXK-DOT2-008',
        ngayGiaoMay: '2026-08-20',
        danhSachMaMay: ['M-2026-01', 'M-2026-02'],
        slMay: 2,
        dvt: 'Máy',
        products: [
          { productName: 'Máy chấn tôn CNC', quantity: 2, unit: 'Máy', machineCode: 'M-2026-01' }
        ]
      };

      const payload = buildDeliveryZnsPayload(shipmentContext as any, template as any);
      expect(payload).toBeDefined();
      expect(payload.template_data.so_phieu_xuat).toBe('PXK-DOT2-008');
      expect(payload.template_data.So_hop_dong).toBe('HD-2026-888');
      expect(payload.template_data.so_luong).toBe(2);
      expect(payload.template_data.dvt).toBe('Máy');
      expect(payload.template_data.danh_sach_ma_may).toContain('M-2026-01');
    });
  });

});
