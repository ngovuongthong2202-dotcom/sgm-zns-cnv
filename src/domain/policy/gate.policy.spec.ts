import { describe, it, expect } from 'vitest';
import { canCreatePayment, canCreateDelivery } from './gate.policy';
import { canCreateContract } from '../../modules/contracts/domain/ContractPolicy';
import { EntityZnsStatus } from '../../domain/enums/zns-status';

describe('Core Policy Gates Golden Master', () => {
  describe('canCreateContract', () => {
    it('matches golden master for valid quotation', () => {
      const quotation = { trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreateContract(quotation)).toMatchSnapshot();
    });

    it('matches golden master for invalid quotation', () => {
      const quotation = { trangThaiGuiTinBaoGia: EntityZnsStatus.THAT_BAI } as any;
      expect(canCreateContract(quotation)).toMatchSnapshot();
    });

    it('matches golden master for missing quotation', () => {
      expect(canCreateContract(null)).toMatchSnapshot();
    });
  });

  describe('canCreatePayment', () => {
    it('matches golden master for valid Quotation source (Vật tư)', () => {
      const source = { loai: 'BG Vật tư', trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreatePayment(source)).toMatchSnapshot();
    });

    it('matches golden master for valid Quotation source (Dịch vụ)', () => {
      const source = { loai: 'BG Dịch vụ', trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreatePayment(source)).toMatchSnapshot();
    });

    it('blocks direct payment creation for BG Máy quotation source', () => {
      const source = { loai: 'BG Máy', trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreatePayment(source)).toEqual({
        allowed: false,
        reason: "Báo giá Máy phải được khởi tạo Hợp đồng trước khi tạo Thanh toán."
      });
    });

    it('matches golden master for valid Contract source', () => {
      const source = { trangThaiGuiTinHopDong: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreatePayment(source)).toMatchSnapshot();
    });

    it('matches golden master for missing source', () => {
      expect(canCreatePayment(null)).toMatchSnapshot();
    });
  });

  describe('canCreateDelivery', () => {
    it('matches golden master for valid payment', () => {
      const payment = { trangThaiGuiTinThanhToan: EntityZnsStatus.THANH_CONG } as any;
      expect(canCreateDelivery(payment)).toMatchSnapshot();
    });

    it('matches golden master for invalid payment', () => {
      const payment = { trangThaiGuiTinThanhToan: EntityZnsStatus.THAT_BAI } as any;
      expect(canCreateDelivery(payment)).toMatchSnapshot();
    });
  });
});
