import { describe, it, expect } from 'vitest';
import { resolveWaiverPrefill } from '../components/DeliveryFormHelpers';

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

  describe('Contextual Source State Machine (CSSM) – Đợt 0A (GH02): đổi nguồn không tự bật đặc cách', () => {
    it('chuyển sang tab Hợp Đồng không tự bật đặc cách, không tự chọn lãnh đạo', () => {
      const r = resolveWaiverPrefill({ parents: [{ soHopDong: 'HD-01' }], current: { dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' } });
      expect(r).toEqual({ dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' });
    });

    it('chuyển sang tab Thanh Toán với phiếu thu thường → đặc cách tắt, hai ô rỗng', () => {
      expect(resolveWaiverPrefill({ parents: [{ id: 'PT-02', dacCachGiaoTruoc: false }] })).toEqual({ dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' });
    });

    it('phiếu thu có đặc cách đã ghi nhận → chép nguyên văn (không phải "Lãnh đạo A" mặc định)', () => {
      const recorded = { dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: 'Khách hàng VIP bảo lãnh công nợ' };
      expect(resolveWaiverPrefill({ parents: [recorded] })).toEqual(recorded);
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
