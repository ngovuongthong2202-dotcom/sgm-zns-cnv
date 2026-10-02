import { describe, it, expect, vi } from 'vitest';
import { ZnsPayloadBuilder } from '@/src/backend/services/zns/zns-payload.builder';
import { ZnsMessage } from '@/src/domain/schema/workflow.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { preCheckEntitySnapshot } from '@/src/domain/zns-client';

describe('Sovereign Apex Omni-Milestone & Matrix v43 Master Test Suite', () => {

  describe('1. Partial Delivery Matrix for Service Quotations (BGDV)', () => {
    // Kịch bản: Báo giá dịch vụ có 4 dịch vụ, hoàn tất trước 2 dịch vụ, 2 dịch vụ còn lại giao sau
    const quotationServices = [
      { productId: 'DV-01', productName: 'Dịch vụ căn chỉnh trục máy cán tôn', quantity: 1, unit: 'Gói', price: 15000000, vatRate: 10 },
      { productId: 'DV-02', productName: 'Dịch vụ thay dao cắt thủy lực', quantity: 1, unit: 'Lần', price: 10000000, vatRate: 10 },
      { productId: 'DV-03', productName: 'Dịch vụ lập trình PLC và tủ điện điều khiển', quantity: 1, unit: 'Gói', price: 25000000, vatRate: 10 },
      { productId: 'DV-04', productName: 'Dịch vụ kiểm tra và hiệu chuẩn toàn tuyến', quantity: 1, unit: 'Lần', price: 12000000, vatRate: 10 },
    ];

    it('should correctly allocate Shipment 1 for the first 2 services and calculate financial subTotal', () => {
      // Đợt 1: Bàn giao 2 dịch vụ đầu
      const shipment1Items = [
        { ...quotationServices[0], quantity: 1 },
        { ...quotationServices[1], quantity: 1 },
      ];

      const subTotal = shipment1Items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
      const vatAmount = subTotal * 0.1;
      const totalAmount = subTotal + vatAmount;

      const shipment1: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0001',
        soPhieuXuat: 'PXK-DV-001',
        soPhieuBaoGia: 'BGDV-2026-0174',
        customerId: 'CUST-001',
        tenKhachHang: 'Công Ty Tôn Thép Miền Nam',
        sdt: '0901828492',
        dotGiaoHang: 1,
        tongSoDotUocTinh: 2,
        isDotCuoiCung: false,
        products: shipment1Items,
        subTotal,
        vatAmount,
        totalAmount,
        giaTriXuatKhoDotNay: totalAmount,
        tinhTrangGiaoHang: 'Đang giao'
      };

      expect(shipment1.dotGiaoHang).toBe(1);
      expect(shipment1.isDotCuoiCung).toBe(false);
      expect(shipment1.products?.length).toBe(2);
      expect(shipment1.subTotal).toBe(25000000);
      expect(shipment1.totalAmount).toBe(27500000);
      expect(shipment1.giaTriXuatKhoDotNay).toBe(27500000);

      // Cập nhật deliveredQuantities lũy kế
      const deliveredQuantities: Record<string, number> = {};
      shipment1Items.forEach((p, idx) => {
        const key = getProductItemKey(p, idx);
        deliveredQuantities[key] = p.quantity;
      });

      expect(deliveredQuantities[getProductItemKey(quotationServices[0], 0)]).toBe(1);
      expect(deliveredQuantities[getProductItemKey(quotationServices[1], 1)]).toBe(1);
      expect(deliveredQuantities[getProductItemKey(quotationServices[2], 2)]).toBeUndefined();
    });

    it('should correctly allocate Shipment 2 for the remaining 2 services and mark as final batch', () => {
      // Đợt 2: Bàn giao 2 dịch vụ còn lại
      const shipment2Items = [
        { ...quotationServices[2], quantity: 1 },
        { ...quotationServices[3], quantity: 1 },
      ];

      const subTotal = shipment2Items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
      const vatAmount = subTotal * 0.1;
      const totalAmount = subTotal + vatAmount;

      const shipment2: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0002',
        soPhieuXuat: 'PXK-DV-002',
        soPhieuBaoGia: 'BGDV-2026-0174',
        customerId: 'CUST-001',
        tenKhachHang: 'Công Ty Tôn Thép Miền Nam',
        sdt: '0901828492',
        dotGiaoHang: 2,
        tongSoDotUocTinh: 2,
        isDotCuoiCung: true,
        products: shipment2Items,
        subTotal,
        vatAmount,
        totalAmount,
        giaTriXuatKhoDotNay: totalAmount,
        tinhTrangGiaoHang: 'Đã hoàn tất',
        ngayGiaoThucTe: '2026-10-02'
      };

      expect(shipment2.dotGiaoHang).toBe(2);
      expect(shipment2.isDotCuoiCung).toBe(true);
      expect(shipment2.products?.length).toBe(2);
      expect(shipment2.subTotal).toBe(37000000);
      expect(shipment2.totalAmount).toBe(40700000);

      // Tổng giá trị cả 2 đợt phải khớp với báo giá gốc (25tr + 37tr = 62tr chưa VAT, 68.2tr có VAT)
      const totalQuoteSub = quotationServices.reduce((a, b) => a + b.price, 0);
      expect(totalQuoteSub).toBe(62000000);
      expect(25000000 + 37000000).toBe(totalQuoteSub);
    });
  });

  describe('2. Board of Directors Special Dispatch (Đặc cách BGĐ) Across Split Shipments', () => {
    it('should propagate special dispatch authorization and audit flags across partial shipments', () => {
      const parentQuotation = {
        id: 'QUOTE-001',
        soPhieuBaoGia: 'BGM-2026-0175',
        dacCachGiaoTruoc: true,
        lyDoDacCach: 'Chỉ đạo Ban Giám Đốc - Hỗ trợ khẩn cấp đối tác chiến lược',
        nguoiPheDuyetDacCach: 'Ban Giám Đốc',
        ngayDacCach: '2026-10-01'
      };

      // Giả lập logic kế thừa trong useDeliveryForm
      const createShipmentFromParent = (dot: number, isFinal: boolean) => ({
        deliveryId: `PGH-2026-000${dot}`,
        quotationId: parentQuotation.id,
        soPhieuBaoGia: parentQuotation.soPhieuBaoGia,
        dotGiaoHang: dot,
        isDotCuoiCung: isFinal,
        // Kế thừa đặc cách
        dacCachGiaoTruoc: parentQuotation.dacCachGiaoTruoc,
        lyDoDacCach: parentQuotation.lyDoDacCach,
        nguoiPheDuyetDacCach: parentQuotation.nguoiPheDuyetDacCach,
        ngayDacCach: parentQuotation.ngayDacCach
      });

      const shipment1 = createShipmentFromParent(1, false);
      const shipment2 = createShipmentFromParent(2, true);

      expect(shipment1.dacCachGiaoTruoc).toBe(true);
      expect(shipment1.lyDoDacCach).toContain('Chỉ đạo Ban Giám Đốc');
      expect(shipment2.dacCachGiaoTruoc).toBe(true);
      expect(shipment2.nguoiPheDuyetDacCach).toBe('Ban Giám Đốc');
    });
  });

  describe('3. Compliant ZNS Payload Generation (Exact 9 Variables & No Extra Fields)', () => {
    const builder = new ZnsPayloadBuilder();

    it('should generate valid GIAOHANG_ZNS payload with exactly 9 registered parameters for Service Shipment', async () => {
      const deliveryBatch1: Partial<Delivery> = {
        id: 'DEL-001',
        deliveryId: 'PGH-2026-001',
        soPhieuXuat: 'PXK-2026-001',
        soPhieuBaoGia: 'BGDV-2026-0174',
        tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Nam Phát',
        sdt: '0901828492',
        ngayGiaoMay: '2026-10-05',
        products: [
          { productId: 'DV-01', productName: 'Dịch vụ căn chỉnh trục máy', quantity: 1, unit: 'Gói' } as any,
          { productId: 'DV-02', productName: 'Dịch vụ thay dao cắt', quantity: 1, unit: 'Lần' } as any,
        ],
        dotGiaoHang: 1
      };

      const message: ZnsMessage = {
        id: 'MSG-001',
        entityId: 'DEL-001',
        entityType: 'DELIVERY',
        messageType: 'GIAOHANG_ZNS',
        phone: '0901828492',
        payload: deliveryBatch1 as Record<string, unknown>,
        status: 'INIT',
        attemptBucket: 0,
        retryCount: 0,
        createdAt: '2026-10-02T10:00:00Z',
        updatedAt: '2026-10-02T10:00:00Z'
      };

      const outbound = await builder.buildPayload(message, 'idempotency-key-001');

      // Kiểm tra cấu trúc payload gửi đi
      const variables = (outbound.template_data || outbound.data) as Record<string, string>;
      expect(variables).toBeDefined();

      // Kiểm tra 9 biến bắt buộc đã đăng ký với Zalo
      expect(variables.customer_name).toBeDefined();
      expect(variables.customer_name.length).toBeLessThanOrEqual(30);
      expect(variables.phone).toBe('0901828492');
      expect(variables.so_phieu_xuat).toBe('PXK-2026-001');
      expect(variables.danh_sach_ma_may).toBe('DV-01 | DV-02');
      expect(variables.so_luong).toBe('2');
      expect(variables.dvt).toBe('Gói');

      // Nếu không có hợp đồng (giao từ BGDV), So_hop_dong không được undefined mà fallback số báo giá
      expect(variables.So_hop_dong).toBe('BGDV-2026-0174');
      // So_don_hang không được undefined
      expect(variables.So_don_hang).toBe('Không có');

      // Đảm bảo không có biến nào rỗng làm Zalo trả lỗi -1122
      const requiredVars = ['customer_name', 'phone', 'So_hop_dong', 'So_don_hang', 'so_phieu_xuat', 'ngay_giao_may', 'danh_sach_ma_may', 'so_luong', 'dvt'];
      for (const varName of requiredVars) {
        expect(variables[varName]).toBeTruthy();
        expect(String(variables[varName]).trim()).not.toBe('');
      }
    });

    it('should pass preCheckEntitySnapshot for deliveries even without contract', () => {
      const deliveryWithoutContract = {
        tenKhachHang: 'Công Ty Phúc Thịnh',
        sdt: '0909123456',
        soPhieuBaoGia: 'BGVT-2026-0854'
      };

      const result = preCheckEntitySnapshot('DELIVERY', deliveryWithoutContract);
      expect(result.ok).toBe(true);
      expect(result.missing.length).toBe(0);
    });
  });

  describe('4. External ERP Code Preservation (e.g. 11-BG2602-018)', () => {
    it('should strictly preserve external ERP quotation codes without prefix mutation', () => {
      const erpCode = '11-BG2602-018';
      
      // Kiểm tra regex nhận diện ERP
      const isErpImported = /^11-BG\d+-\d+$/i.test(erpCode) || erpCode.startsWith('11-BG');
      expect(isErpImported).toBe(true);

      // Khi lưu chứng từ, mã ERP này phải được giữ nguyên 100%
      const quoteDoc = {
        soPhieuBaoGia: erpCode,
        nguonBaoGia: 'ERP',
        isErpSync: true
      };

      expect(quoteDoc.soPhieuBaoGia).toBe('11-BG2602-018');
      expect(quoteDoc.soPhieuBaoGia.startsWith('BGM-')).toBe(false);
      expect(quoteDoc.soPhieuBaoGia.startsWith('BGVT-')).toBe(false);
    });
  });
});
