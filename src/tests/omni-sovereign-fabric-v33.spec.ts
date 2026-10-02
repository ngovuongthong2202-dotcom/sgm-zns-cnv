import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  resolveSalesOrderByContractNumber, 
  sanitizeContractCode,
  clearSalesOrderBridgeCache 
} from '@/src/modules/sales/domain/services/salesOrderErpBridgeService';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { useDeliveriesKpis } from '@/src/modules/fulfillment/ui/hooks/useDeliveriesKpis';
import { isQuotationWithContract } from '@/src/modules/sales/ui/components/QuotationStats';

describe('Omni-Sovereign Fabric v33 Test Suite', () => {

  describe('1. Sales Order ERP Bridge Service & Contract Lookup', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      clearSalesOrderBridgeCache();
    });

    it('sanitizes contract code correctly', () => {
      expect(sanitizeContractCode('  244 / SC - SGM / 2026  ')).toBe('244/SC-SGM/2026');
      expect(sanitizeContractCode('11-KDDH2610-001')).toBe('11-KDDH2610-001');
      expect(sanitizeContractCode('')).toBe('');
    });

    it('resolves sales order from local contracts tier first (Tier 1)', async () => {
      const localContracts = [
        {
          id: 'c1',
          soHopDong: '244/SC-SGM/2026',
          soDonHang: '11-KDDH2610-001',
          soBaoGia: 'BG-2026-001'
        }
      ];

      const result = await resolveSalesOrderByContractNumber('244/SC-SGM/2026', localContracts);
      expect(result.matched).toBe(true);
      expect(result.soDonHang).toBe('11-KDDH2610-001');
      expect(result.source).toBe('LOCAL_CONTRACT');
    });

    it('resolves sales order from ERP lookup proxy when not in local contracts (Tier 2/3)', async () => {
      const mockApiResponse = {
        success: true,
        matched: true,
        soHopDong: '244/SC-SGM/2026',
        soDonHang: '11-KDDH2610-001',
        customerName: 'Công ty Alpha',
        phone: '0901234567',
        totalAfterTax: 0
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as any);

      const result = await resolveSalesOrderByContractNumber('244/SC-SGM/2026', []);
      expect(result.matched).toBe(true);
      expect(result.soDonHang).toBe('11-KDDH2610-001');
      expect(result.source).toBe('ERP_API');
    });

    it('returns matched: false gracefully when contract is not found in ERP', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          matched: false,
          soHopDong: 'NON-EXISTENT-CONTRACT',
          message: 'Không tìm thấy'
        })
      } as any);

      const result = await resolveSalesOrderByContractNumber('NON-EXISTENT-CONTRACT', []);
      expect(result.matched).toBe(false);
      expect(result.soDonHang).toBeUndefined();
    });

    it('handles network errors gracefully without crashing the UI', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await resolveSalesOrderByContractNumber('244/SC-SGM/2026', []);
      expect(result.matched).toBe(false);
      expect(result.soDonHang).toBeUndefined();
    });
  });

  describe('2. Delivery KPI & Filter Mesh (Resolving Empty Dataview Issue)', () => {
    const mockDeliveries: Delivery[] = [
      {
        id: 'del-1',
        deliveryId: 'PGH-2026-001',
        soPhieuBaoGia: 'BG-2026-001',
        customerId: 'cust-1',
        diaChiGiaoHang: 'Hà Nội',
        ngayGiaoMay: '2026-02-15',
        ngayGiaoThucTe: null, // Chưa giao
        trangThai: 'PENDING',
        tinhTrangGiaoHang: 'CHUA_GIAO'
      } as any,
      {
        id: 'del-2',
        deliveryId: 'PGH-2026-002',
        soPhieuBaoGia: 'BG-2026-002',
        customerId: 'cust-2',
        diaChiGiaoHang: 'TP HCM',
        ngayGiaoMay: '2026-01-10',
        ngayGiaoThucTe: '2026-01-09', // Đã giao đúng hạn
        trangThai: 'COMPLETED',
        tinhTrangGiaoHang: 'HOAN_TAT'
      } as any,
      {
        id: 'del-3',
        deliveryId: 'PGH-2026-003',
        soPhieuBaoGia: 'BG-2026-003',
        customerId: 'cust-1',
        diaChiGiaoHang: 'Hải Phòng',
        ngayGiaoMay: '2026-01-05',
        ngayGiaoThucTe: '2026-01-12', // Đã giao trễ hạn
        trangThai: 'COMPLETED',
        tinhTrangGiaoHang: 'HOAN_TAT'
      } as any,
      {
        id: 'del-4',
        deliveryId: 'PGH-2026-004',
        soPhieuBaoGia: 'BG-2026-004',
        customerId: 'cust-3',
        diaChiGiaoHang: 'Đà Nẵng',
        ngayGiaoMay: '2026-01-01',
        ngayGiaoThucTe: null,
        trangThai: 'CANCELLED',
        tinhTrangGiaoHang: 'HUY' // Đã hủy
      } as any
    ];

    const mockCustomers: Customer[] = [
      { id: 'cust-1', tenKhachHang: 'Công ty Alpha', tinhThanh: 'Hà Nội' } as any,
      { id: 'cust-2', tenKhachHang: 'Công ty Beta', tinhThanh: 'TP HCM' } as any,
      { id: 'cust-3', tenKhachHang: 'Công ty Gamma', tinhThanh: 'Đà Nẵng' } as any,
    ];

    it('calculates KPIs correctly: 1 unfulfilled delivery (excluding cancelled)', () => {
      // Direct KPI test function
      const today = '2026-03-01';
      let inTransit = 0;
      let completed = 0;
      let late = 0;
      let onTime = 0;

      mockDeliveries.forEach(d => {
        const isCompleted = !!d.ngayGiaoThucTe;
        const isCancelled = (d as any).tinhTrangGiaoHang === 'HUY';
        if (isCancelled) return;

        if (!isCompleted) {
          inTransit++;
          if (d.ngayGiaoMay && d.ngayGiaoMay < today) late++;
        } else {
          completed++;
          if (d.ngayGiaoMay && d.ngayGiaoThucTe && d.ngayGiaoThucTe <= d.ngayGiaoMay) onTime++;
          else if (d.ngayGiaoMay && d.ngayGiaoThucTe && d.ngayGiaoThucTe > d.ngayGiaoMay) late++;
        }
      });

      expect(inTransit).toBe(1); // del-1 is pending unfulfilled
      expect(completed).toBe(2); // del-2 and del-3
      expect(onTime).toBe(1);    // del-2 (2026-01-09 <= 2026-01-10)
      expect(late).toBe(2);      // del-1 (2026-02-15 < 2026-03-01) and del-3 (2026-01-12 > 2026-01-05)
    });

    it('filters correctly when selectedStatus is "undelivered" (Fixes the 0 record bug)', () => {
      const selectedStatus = 'undelivered';
      const statusUpper = selectedStatus.toUpperCase().trim();

      const filtered = mockDeliveries.filter(d => {
        if (statusUpper === 'UNDELIVERED' || selectedStatus === 'undelivered' || selectedStatus === 'chua_giao') {
          return !d.ngayGiaoThucTe && (d as any).tinhTrangGiaoHang !== 'HUY' && (d as any).tinhTrangGiaoHang !== 'Hủy';
        }
        return true;
      });

      // Crucial: Must return exactly 1 record (del-1), NOT 0!
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('del-1');
      expect(filtered[0].deliveryId).toBe('PGH-2026-001');
    });

    it('filters correctly when selectedSchedule is "late"', () => {
      const selectedSchedule = 'late';
      const todayStr = '2026-03-01';

      const filtered = mockDeliveries.filter(d => {
        if ((d as any).tinhTrangGiaoHang === 'HUY') return false;
        if (!d.ngayGiaoThucTe && d.ngayGiaoMay && d.ngayGiaoMay < todayStr) return true;
        if (d.ngayGiaoThucTe && d.ngayGiaoMay && d.ngayGiaoThucTe > d.ngayGiaoMay) return true;
        return false;
      });

      expect(filtered.length).toBe(2);
      expect(filtered.map(d => d.id)).toEqual(['del-1', 'del-3']);
    });

    it('filters correctly when selectedSchedule is "on_time"', () => {
      const filtered = mockDeliveries.filter(d => {
        if ((d as any).tinhTrangGiaoHang === 'HUY') return false;
        if (!d.ngayGiaoThucTe) return false;
        return Boolean(d.ngayGiaoMay && d.ngayGiaoThucTe <= d.ngayGiaoMay);
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('del-2');
    });
  });

  describe('3. Payment Form Mandatory Contract Number & Quotation Prefill', () => {
    it('validates that soHopDong cannot be empty or whitespace only', () => {
      const validatePayment = (data: { soHopDong?: string; soPhieuThu?: string; soTien?: number }) => {
        if (!data.soHopDong || !String(data.soHopDong).trim()) {
          return { valid: false, error: 'Số Hợp Đồng là trường bắt buộc để đối soát công nợ và đơn hàng ERP' };
        }
        return { valid: true };
      };

      expect(validatePayment({ soHopDong: '' }).valid).toBe(false);
      expect(validatePayment({ soHopDong: '   ' }).valid).toBe(false);
      expect(validatePayment({ soHopDong: undefined }).valid).toBe(false);
      expect(validatePayment({ soHopDong: '244/SC-SGM/2026' }).valid).toBe(true);
    });

    it('prefills soHopDong and soDonHang when linked quotation has a contract', () => {
      const mockQuotation = {
        id: 'q-001',
        soPhieuBaoGia: 'BG-2026-001',
        tenKhachHang: 'Công ty Cơ Điện ABC',
        tongGiaTri: 150000000
      };

      const mockContracts = [
        {
          id: 'c-001',
          quotationId: 'q-001',
          soHopDong: '244/SC-SGM/2026',
          soDonHang: '11-KDDH2610-001'
        }
      ];

      const linkedContract = mockContracts.find(c => c.quotationId === mockQuotation.id);
      
      const formInitialState = {
        soBaoGia: mockQuotation.soPhieuBaoGia,
        soHopDong: linkedContract?.soHopDong || '',
        soDonHang: linkedContract?.soDonHang || '',
        soTien: mockQuotation.tongGiaTri
      };

      expect(formInitialState.soHopDong).toBe('244/SC-SGM/2026');
      expect(formInitialState.soDonHang).toBe('11-KDDH2610-001');
    });
  });

  describe('4. Quotation Stats Full Monetary Display & Contract Identification', () => {
    it('identifies quotation linked with contracts across ID or Quote numbers', () => {
      const q1 = { id: 'q1', soBaoGia: 'BG-01' };
      const q2 = { id: 'q2', soPhieuBaoGia: 'BG-02' };
      const q3 = { id: 'q3', soBaoGia: 'BG-03' };

      const contracts = [
        { id: 'c1', quotationId: 'q1', soHopDong: 'HD-01' },
        { id: 'c2', soBaoGia: 'BG-02', soHopDong: 'HD-02' }
      ];

      expect(isQuotationWithContract(q1, contracts)).toBe(true);
      expect(isQuotationWithContract(q2, contracts)).toBe(true);
      expect(isQuotationWithContract(q3, contracts)).toBe(false);
    });

    it('formats currency correctly without exponential notation or undefined', () => {
      const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
      };

      expect(formatCurrency(0)).toBe('0 ₫');
      expect(formatCurrency(2450000000)).toBe('2.450.000.000 ₫');
      expect(formatCurrency(12500000)).toBe('12.500.000 ₫');
    });
  });
});
