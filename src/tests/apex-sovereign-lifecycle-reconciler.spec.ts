import { describe, it, expect } from 'vitest';
import { 
  getVietnameseRegion, 
  formatCustomerRegionDisplay, 
  cleanDuplicateAddress, 
  stripProvinceFromAddress 
} from '@/src/shared/utils/vietnamRegionHelper';
import { resolveDocumentLifecycleBadge } from '@/src/domain/services/lifecycle-reconciler';
import { computeMaxCustomerSequence } from '@/src/modules/customers/ui/hooks/useCustomerForm';

describe('APEX SOVEREIGN OMNI-NEXUS ULTIMATE - Comprehensive Verification', () => {

  describe('1. Vietnam Region & Address Anti-Duplication Helper', () => {
    it('accurately maps provinces to 4 macro regions', () => {
      expect(getVietnameseRegion('TP. Hồ Chí Minh').region).toBe('Miền Nam');
      expect(getVietnameseRegion('Hồ Chí Minh').region).toBe('Miền Nam');
      expect(getVietnameseRegion('Hà Nội').region).toBe('Miền Bắc');
      expect(getVietnameseRegion('Đà Nẵng').region).toBe('Miền Trung');
      expect(getVietnameseRegion('Đắk Lắk').region).toBe('Tây Nguyên');
      expect(getVietnameseRegion('Lâm Đồng').region).toBe('Tây Nguyên');
      expect(getVietnameseRegion('Bình Dương').region).toBe('Miền Nam');
      expect(getVietnameseRegion('Hải Phòng').region).toBe('Miền Bắc');
    });

    it('formats customer region display for enterprise overview', () => {
      expect(formatCustomerRegionDisplay('TP. Hồ Chí Minh')).toBe('Miền Nam • TP. Hồ Chí Minh');
      expect(formatCustomerRegionDisplay('Hà Nội')).toBe('Miền Bắc • TP. Hà Nội');
      expect(formatCustomerRegionDisplay('Đà Nẵng')).toBe('Miền Trung • TP. Đà Nẵng');
    });

    it('strips trailing province names from VietQR address', () => {
      const raw = 'Lô 12A KCN Tân Tạo, Phường Tân Tạo, Quận Bình Tân, Thành phố Hồ Chí Minh';
      const stripped = stripProvinceFromAddress(raw, 'TP. Hồ Chí Minh');
      expect(stripped).toBe('Lô 12A KCN Tân Tạo, Phường Tân Tạo, Quận Bình Tân');
    });

    it('eliminates duplicate province in cleanDuplicateAddress', () => {
      const addrWithDup = '123 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh';
      const cleaned = cleanDuplicateAddress(addrWithDup, 'TP. Hồ Chí Minh');
      expect(cleaned).toBe('123 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh');
      expect(cleaned).not.toContain('TP. Hồ Chí Minh, TP. Hồ Chí Minh');
    });
  });

  describe('2. Unified Document Lifecycle Reconciler (Fix for Timeline Header 30% bug)', () => {
    it('correctly returns COMPLETED_100 for delivered & fully paid contracts (Contract 022 scenario)', () => {
      const mockContract = {
        id: 'c-022',
        soHopDong: '022/KD1-SGM/TN-OT/26',
        tongGiaTriSauThue: 100_000_000,
        giaTriHopDong: 100_000_000,
        slMay: 1,
        products: [{ maSanPham: 'CNC-01', tenSanPham: 'Máy CNC Router', quantity: 1, donGia: 100_000_000, thanhTien: 100_000_000 }]
      };

      const mockDeliveries = [
        {
          id: 'del-01',
          soPhieuGiaoHang: 'PGH-2026-0130',
          contractId: 'c-022',
          soHopDong: '022/KD1-SGM/TN-OT/26',
          ngayGiaoThucTe: '2026-03-20',
          trangThai: 'Đã giao',
          slMay: 1,
          products: [{ maSanPham: 'CNC-01', quantity: 1 }]
        }
      ];

      const mockPayments = [
        {
          id: 'pay-01',
          soPhieuThu: 'PT-2026-0042',
          contractId: 'c-022',
          soHopDong: '022/KD1-SGM/TN-OT/26',
          soTien: 100_000_000,
          trangThai: 'Đã thu'
        }
      ];

      const badge = resolveDocumentLifecycleBadge({
        contract: mockContract,
        deliveries: mockDeliveries,
        payments: mockPayments
      });

      // Must be COMPLETED_100 or DELIVERED_ACTUAL, NEVER PRODUCTION_SECURED_30
      expect(badge.key).toBe('COMPLETED_100');
      expect(badge.label).toBe('HOÀN THÀNH TOÀN DIỆN (100%)');
      expect(badge.variant).toBe('emerald');
      expect(badge.key).not.toBe('PRODUCTION_SECURED_30');
    });

    it('returns DELIVERED_ACTUAL when goods delivered but payment is partial', () => {
      const mockContract = {
        id: 'c-023',
        soHopDong: '023/KD1-SGM/26',
        tongGiaTriSauThue: 200_000_000,
        giaTriHopDong: 200_000_000,
        slMay: 1,
        products: [{ maSanPham: 'EDGE-01', quantity: 1, donGia: 200_000_000, thanhTien: 200_000_000 }]
      };

      const mockDeliveries = [
        {
          id: 'del-02',
          soPhieuGiaoHang: 'PGH-2026-0131',
          contractId: 'c-023',
          soHopDong: '023/KD1-SGM/26',
          ngayGiaoThucTe: '2026-03-25',
          slMay: 1,
          products: [{ maSanPham: 'EDGE-01', quantity: 1 }]
        }
      ];

      const mockPayments = [
        {
          id: 'pay-02',
          soPhieuThu: 'PT-2026-0043',
          contractId: 'c-023',
          soHopDong: '023/KD1-SGM/26',
          soTien: 60_000_000, // 30%
          trangThai: 'Đã thu'
        }
      ];

      const badge = resolveDocumentLifecycleBadge({
        contract: mockContract,
        deliveries: mockDeliveries,
        payments: mockPayments
      });

      expect(badge.key).toBe('DELIVERED_ACTUAL');
      expect(badge.label).toBe('ĐÃ BÀN GIAO MÁY THỰC TẾ');
      expect(badge.variant).toBe('cyan');
    });

    it('correctly handles SPECIAL_WAIVER for exempted contracts', () => {
      const mockContract = {
        id: 'c-024',
        soHopDong: '024/KD1-SGM/26',
        tongGiaTriSauThue: 150_000_000,
        isExempted: true,
        lyDoMienCoc: 'Khách hàng thân thiết VIP, Ban Giám Đốc phê duyệt xuất xưởng không cần cọc'
      };

      const badge = resolveDocumentLifecycleBadge({
        contract: mockContract,
        deliveries: [],
        payments: []
      });

      expect(badge.key).toBe('SPECIAL_WAIVER');
      expect(badge.label).toBe('ĐẶC CÁCH BAN GIÁM ĐỐC');
      expect(badge.variant).toBe('amber');
    });
  });

  describe('3. Deterministic Sequential Customer Code Generator', () => {
    it('computes maximum sequence correctly without random generation', () => {
      const customers = [
        { maKh: 'KH0001' },
        { maKh: 'KH0189' },
        { maKh: 'KH0190' },
        { maKh: 'KH0050' }
      ];

      const maxSeq = computeMaxCustomerSequence(customers);
      expect(maxSeq).toBe(190);
      const nextCode = `KH${String(maxSeq + 1).padStart(4, '0')}`;
      expect(nextCode).toBe('KH0191');
    });

    it('handles empty customer array gracefully defaulting to 0', () => {
      const maxSeq = computeMaxCustomerSequence([]);
      expect(maxSeq).toBe(0);
      const nextCode = `KH${String(maxSeq + 1).padStart(4, '0')}`;
      expect(nextCode).toBe('KH0001');
    });
  });
});
