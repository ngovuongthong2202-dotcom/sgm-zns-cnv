import { describe, it, expect } from 'vitest';

describe('Fulfillment Workflow Integrity & Contextual Source State Machine', () => {
  describe('Domain Integrity Gatekeeper (Quotation Filtering for Delivery)', () => {
    const mockQuotations = [
      { id: 'Q1', soPhieuBaoGia: 'BG-MAY-01', loai: 'BG Máy', tenKhachHang: 'Khách Hàng A' },
      { id: 'Q2', soPhieuBaoGia: 'BG-VT-01', loai: 'BG Vật Tư', tenKhachHang: 'Khách Hàng B' },
      { id: 'Q3', soPhieuBaoGia: 'BG-DV-01', loai: 'BG Dịch Vụ', tenKhachHang: 'Khách Hàng C' },
      { id: 'Q4', soPhieuBaoGia: 'BG-MAY-02', loaiBaoGia: 'Máy dán cạnh', tenKhachHang: 'Khách Hàng D' },
      { id: 'Q5', soPhieuBaoGia: 'BG-VT-02', loaiBaoGia: 'Vật tư thay thế', tenKhachHang: 'Khách Hàng E' },
      { id: 'Q6', soPhieuBaoGia: 'BG-DEL', loai: 'BG Vật Tư', deletedAt: '2026-01-01' }
    ];

    const filterQuotationsForDelivery = (quotations: any[]) => {
      return (quotations || []).filter((q: any) => {
        if (q.deletedAt || q.deleted_at) return false;
        const loai = String(q.loai || q.loaiBaoGia || '').trim();
        return loai === 'BG Vật Tư' || loai === 'BG Dịch Vụ' || (loai !== 'BG Máy' && !loai.includes('Máy'));
      });
    };

    it('strictly includes only BG Vật Tư & BG Dịch Vụ and excludes BG Máy', () => {
      const filtered = filterQuotationsForDelivery(mockQuotations);
      const ids = filtered.map(q => q.id);

      expect(ids).toContain('Q2'); // BG Vật Tư
      expect(ids).toContain('Q3'); // BG Dịch Vụ
      expect(ids).toContain('Q5'); // Vật tư thay thế
      expect(ids).not.toContain('Q1'); // BG Máy (excluded)
      expect(ids).not.toContain('Q4'); // Máy dán cạnh (excluded)
      expect(ids).not.toContain('Q6'); // Deleted (excluded)
    });
  });

  describe('Contextual Source State Machine (CSSM - Tab Switching Isolation)', () => {
    it('enables waiver when switching to Contract (Giao trước) tab', () => {
      let state = {
        dacCachGiaoTruoc: false,
        nguoiPheDuyetDacCach: '',
        lyDoDacCach: '',
        contractId: '',
        paymentId: 'PT-01',
        quotationId: ''
      };

      const defaultLeader = 'Lãnh đạo A';

      // Switch to Contract tab
      state = {
        ...state,
        dacCachGiaoTruoc: true,
        nguoiPheDuyetDacCach: defaultLeader,
        lyDoDacCach: 'Đặc cách giao trước khi thanh toán theo HĐ',
        paymentId: '',
        quotationId: ''
      };

      expect(state.dacCachGiaoTruoc).toBe(true);
      expect(state.nguoiPheDuyetDacCach).toBe('Lãnh đạo A');
      expect(state.paymentId).toBe('');
    });

    it('resets waiver when switching to Payment tab with a standard payment', () => {
      let state = {
        dacCachGiaoTruoc: true,
        nguoiPheDuyetDacCach: 'Lãnh đạo A',
        lyDoDacCach: 'Đặc cách',
        contractId: 'CTR-01',
        paymentId: '',
        quotationId: ''
      };

      const selectedPayment = { id: 'PT-02', dacCachGiaoTruoc: false };

      // Switch to Payment tab
      const isWaiver = Boolean(selectedPayment?.dacCachGiaoTruoc);
      state = {
        ...state,
        dacCachGiaoTruoc: isWaiver,
        nguoiPheDuyetDacCach: isWaiver ? 'Lãnh đạo B' : '',
        lyDoDacCach: isWaiver ? 'Đặc cách PT' : '',
        contractId: '',
        quotationId: ''
      };

      expect(state.dacCachGiaoTruoc).toBe(false);
      expect(state.nguoiPheDuyetDacCach).toBe('');
      expect(state.lyDoDacCach).toBe('');
    });

    it('resets waiver when switching to Quotation tab', () => {
      let state = {
        dacCachGiaoTruoc: true,
        nguoiPheDuyetDacCach: 'Lãnh đạo A',
        lyDoDacCach: 'Đặc cách',
        contractId: 'CTR-01',
        paymentId: '',
        quotationId: ''
      };

      // Switch to Quotation tab
      state = {
        ...state,
        dacCachGiaoTruoc: false,
        nguoiPheDuyetDacCach: '',
        lyDoDacCach: '',
        contractId: '',
        paymentId: ''
      };

      expect(state.dacCachGiaoTruoc).toBe(false);
      expect(state.nguoiPheDuyetDacCach).toBe('');
    });
  });

  describe('Origin-Aware Field State Tracker (OAFST - Reversible ERP Cleansing)', () => {
    it('clears all ERP populated fields when soPhieuXuat is cleared', () => {
      const initialFormState = {
        soPhieuXuat: 'PXBH-2026-001',
        khoXuat: 'Kho Tổng TP.HCM',
        keToanKho: 'Nguyễn Văn Kho',
        ngayTaoPhieuXuat: '2026-09-29',
        donViVanChuyen: 'Xe CNV',
        soDienThoaiDonViVanChuyen: '0901234567',
        ghiChu: 'Giao giờ hành chính'
      };

      const clearErpFields = (current: typeof initialFormState) => ({
        ...current,
        soPhieuXuat: '',
        khoXuat: '',
        keToanKho: '',
        ngayTaoPhieuXuat: '',
        donViVanChuyen: '',
        soDienThoaiDonViVanChuyen: '',
        // Notice ghiChu is preserved
        ghiChu: current.ghiChu
      });

      const cleared = clearErpFields(initialFormState);

      expect(cleared.soPhieuXuat).toBe('');
      expect(cleared.khoXuat).toBe('');
      expect(cleared.keToanKho).toBe('');
      expect(cleared.ngayTaoPhieuXuat).toBe('');
      expect(cleared.donViVanChuyen).toBe('');
      expect(cleared.soDienThoaiDonViVanChuyen).toBe('');
      expect(cleared.ghiChu).toBe('Giao giờ hành chính'); // Preserved user note
    });
  });
});
