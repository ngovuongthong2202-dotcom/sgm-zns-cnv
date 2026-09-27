import { describe, it, expect } from 'vitest';
import {
  isUuid,
  resolveDeliveryDisplayCode,
  resolvePaymentDisplayCode,
  resolveDeliveryVoucherMeta,
  calculateMachineAllocation,
} from './voucherResolver';

describe('Sovereign Voucher & Lineage Resolver Engine (S-VCLE)', () => {
  describe('isUuid', () => {
    it('nhận diện chính xác chuỗi UUID 36 ký tự', () => {
      expect(isUuid('cbecefac-0620-447b-834a-6aaa09dc23a8')).toBe(true);
      expect(isUuid('78887e1f-d232-4467-b869-952d76ee64db')).toBe(true);
      expect(isUuid('CBECEFAC-0620-447B-834A-6AAA09DC23A8')).toBe(true);
    });

    it('loại trừ các chuỗi mã chứng từ nghiệp vụ', () => {
      expect(isUuid('PGH-2026-0130')).toBe(false);
      expect(isUuid('11-PXBHDH2607-022')).toBe(false);
      expect(isUuid('PT-2026-5405')).toBe(false);
      expect(isUuid('BGM-2026-0256')).toBe(false);
      expect(isUuid('022/KD1-SGM/TN-OT/26')).toBe(false);
      expect(isUuid('')).toBe(false);
      expect(isUuid(null as any)).toBe(false);
      expect(isUuid(undefined as any)).toBe(false);
    });
  });

  describe('resolveDeliveryDisplayCode', () => {
    it('ưu tiên deliveryId chuẩn nghiệp vụ', () => {
      expect(resolveDeliveryDisplayCode({ deliveryId: 'PGH-2026-0130', id: 'cbecefac-0620-447b-834a-6aaa09dc23a8' })).toBe('PGH-2026-0130');
    });

    it('ưu tiên soPhieuXuat ERP nếu không có deliveryId', () => {
      expect(resolveDeliveryDisplayCode({ soPhieuXuat: '11-PXBHDH2607-022', id: 'cbecefac-0620-447b-834a-6aaa09dc23a8' })).toBe('11-PXBHDH2607-022');
    });

    it('triệt tiêu chuỗi UUID thô và chuyển thành mã PGH thân thiện (PGH-CBECEFAC)', () => {
      const code = resolveDeliveryDisplayCode({ id: 'cbecefac-0620-447b-834a-6aaa09dc23a8' });
      expect(code).toBe('PGH-CBECEFAC');
      expect(code.includes('-0620-')).toBe(false);
    });

    it('trả về fallback an toàn khi rỗng', () => {
      expect(resolveDeliveryDisplayCode(null)).toBe('Chưa có PGH');
      expect(resolveDeliveryDisplayCode({})).toBe('PGH-AUTO');
    });
  });

  describe('resolvePaymentDisplayCode', () => {
    it('ưu tiên paymentId chuẩn', () => {
      expect(resolvePaymentDisplayCode({ paymentId: 'PT-2026-5405', id: 'uuid-123' })).toBe('PT-2026-5405');
    });

    it('lấy soPhieuThu nếu có', () => {
      expect(resolvePaymentDisplayCode({ soPhieuThu: 'PT-THU-001' })).toBe('PT-THU-001');
    });

    it('sinh mã thân thiện nếu id là UUID', () => {
      const code = resolvePaymentDisplayCode({ id: 'cbecefac-0620-447b-834a-6aaa09dc23a8' });
      expect(code).toBe('PT-CBECEFAC');
    });
  });

  describe('resolveDeliveryVoucherMeta', () => {
    it('trích xuất đầy đủ thông tin giao hàng và xác nhận bàn giao thực tế', () => {
      const del = {
        id: 'cbecefac-0620-447b-834a-6aaa09dc23a8',
        deliveryId: 'PGH-2026-0130',
        soPhieuXuat: '11-PXBHDH2607-022',
        ngayGiaoThucTe: '2026-07-28',
        kyNhan: 'Bà Phạm Thị Lệ Thủy',
        thoGiaoMay: 'Cao Hoàng Tú',
        danhSachMaMay: ['#KH854/17', '#111'],
      };

      const meta = resolveDeliveryVoucherMeta(del);
      expect(meta.displayCode).toBe('PGH-2026-0130');
      expect(meta.erpCode).toBe('11-PXBHDH2607-022');
      expect(meta.isDelivered).toBe(true);
      expect(meta.deliveredDate).toBe('2026-07-28');
      expect(meta.recipientName).toBe('Bà Phạm Thị Lệ Thủy');
      expect(meta.technicianName).toBe('Cao Hoàng Tú');
      expect(meta.machineList).toEqual(['#KH854/17', '#111']);
      expect(meta.machineQty).toBe(2);
      expect(meta.statusLabel).toBe('✓ Đã bàn giao thực tế');
    });

    it('trích xuất đúng trạng thái đang xử lý khi chưa bàn giao', () => {
      const del = {
        deliveryId: 'PGH-2026-0130',
        ngayGiaoMay: '2026-08-01',
        danhSachMaMay: ['#KH854/17'],
      };

      const meta = resolveDeliveryVoucherMeta(del);
      expect(meta.isDelivered).toBe(false);
      expect(meta.statusLabel).toBe('Đang xử lý xuất kho');
      expect(meta.plannedDate).toBe('2026-08-01');
    });
  });

  describe('calculateMachineAllocation (Dynamic Machine Allocation Gate)', () => {
    it('khóa an toàn khi hợp đồng 2 máy đã có phiếu giao chứa đủ 2 máy', () => {
      const contract = {
        products: [{ productName: 'Máy ép tôn sóng tròn', quantity: 2, price: 240000000 }],
      };
      const deliveries = [
        {
          deliveryId: 'PGH-2026-0130',
          danhSachMaMay: ['#KH854/17', '#111'],
          // Đang xử lý xuất kho, chưa giao thực tế
        }
      ];

      const gate = calculateMachineAllocation(contract, deliveries);
      expect(gate.totalOrderMachines).toBe(2);
      expect(gate.totalAssignedMachines).toBe(2);
      expect(gate.remainingMachines).toBe(0);
      expect(gate.isFullyAllocated).toBe(true);
      expect(gate.buttonLabel).toBe('✓ Đã đủ SL máy xuất kho (2/2)');
    });

    it('cho phép lập thêm phiếu khi hợp đồng 3 máy mới có phiếu 1 máy', () => {
      const contract = {
        slMay: 3,
      };
      const deliveries = [
        {
          deliveryId: 'PGH-2026-0130',
          products: [{ quantity: 1 }],
        }
      ];

      const gate = calculateMachineAllocation(contract, deliveries);
      expect(gate.totalOrderMachines).toBe(3);
      expect(gate.totalAssignedMachines).toBe(1);
      expect(gate.remainingMachines).toBe(2);
      expect(gate.isFullyAllocated).toBe(false);
      expect(gate.buttonLabel).toBe('+ Lập Phiếu Xuất Kho (Còn 2 máy)');
    });
  });
});
