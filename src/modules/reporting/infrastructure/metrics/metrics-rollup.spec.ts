import { describe, it, expect } from 'vitest';
import { buildBreakdown, buildProducts, buildInsights } from './metrics-rollup-helpers';
import { rollupQuotations, rollupPayments, RollupContext } from './metrics-domain-rollups';
import { Quotation, Customer, Payment, Delivery, ZnsMessage } from './metrics-interfaces';
import { QUOTATION_LOAI, normalizeLoai } from '../../../../domain/enums/quotation-loai';

describe('Metrics Rollup Service - Core Functions & Bug Z2 Verification', () => {
  const mockCustomers: Customer[] = [
    { id: 'c1', name: 'Khách hàng Hà Nội', tinhThanh: 'Hà Nội' },
    { id: 'c2', name: 'Khách hàng Sài Gòn', tinhThanh: 'TP. Hồ Chí Minh' },
  ];

  const mockQuotations: Quotation[] = [
    {
      id: 'q1',
      customerId: 'c1',
      loai: 'BG Máy',
      ngayBaoGia: '2026-06-01',
      products: [
        { productName: 'Máy xúc SGM-100', quantity: 2, price: 150000000, unit: 'Máy' }
      ]
    },
    {
      id: 'q2',
      customerId: 'c2',
      loai: 'BG Vật tư',
      ngayBaoGia: '2026-06-02',
      products: [
        { productName: 'Ống dẫn thủy lực', quantity: 10, price: 2000000, unit: 'Bộ' }
      ]
    },
    {
      id: 'q3',
      customerId: 'c1',
      loai: 'BG Dịch vụ',
      ngayBaoGia: '2026-06-03',
      products: [
        { productName: 'Bảo dưỡng định kỳ', quantity: 1, price: 5000000, unit: 'Lần' }
      ]
    }
  ];

  describe('Quotation Categorization & Funnel Filtering', () => {
    it('correctly filters "BG Máy" and separate from "BG Vật tư" / "BG Dịch vụ"', () => {
      // Bug Z2 was caused by filtering on "BG Máy và Thiết bị", returning 0 results instead of 1.
      // This test ensures that the standard category name "BG Máy" is found and filtered properly.
      const machineQuotes = mockQuotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY);
      expect(machineQuotes).toHaveLength(1);
      expect(machineQuotes[0].id).toBe('q1');

      const vatTuQuotes = mockQuotations.filter(q => {
         const l = normalizeLoai(q.loai);
         return l === QUOTATION_LOAI.VAT_TU || l === QUOTATION_LOAI.DICH_VU;
      });
      expect(vatTuQuotes).toHaveLength(2);
      expect(vatTuQuotes.map(q => q.id)).toContain('q2');
      expect(vatTuQuotes.map(q => q.id)).toContain('q3');
    });
  });

  describe('buildBreakdown with corrected categories', () => {
    it('correctly builds geographical breakdown of revenues and customers for May (Machine) quotes', () => {
      const payments: Payment[] = [
        { id: 'p1', quotationId: 'q1', customerId: 'c1', soTien: 150000000, tinhTrangThanhToan: 'ĐÃ THANH TOÁN' }
      ];
      const deliveries: Delivery[] = [
        { id: 'd1', quotationId: 'q1', customerId: 'c1', ngayGiaoThucTe: '2026-06-05' }
      ];

      const machineQuotes = mockQuotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY);
      const breakdown = buildBreakdown(machineQuotes, mockCustomers, payments, deliveries);

      expect(breakdown).toBeDefined();
      expect(breakdown.length).toBeGreaterThanOrEqual(1);
      
      const hnGroup = breakdown.find(b => b.group === 'Hà Nội');
      expect(hnGroup).toBeDefined();
      expect(hnGroup?.khbg).toBe(1); // 1 quotation in Hà Nội
      expect(hnGroup?.khPaid).toBe(1); // 1 completed payment
      expect(hnGroup?.khDel).toBe(1); // 1 real delivery
      expect(hnGroup?.rev).toBe(150000000);
    });
  });

  describe('buildProducts with corrected categories', () => {
    it('aggregates quantities and revenues correctly for selected group', () => {
      const machineQuotes = mockQuotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY);
      const products = buildProducts(machineQuotes);

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Máy xúc SGM-100');
      expect(products[0].qty).toBe(2);
      expect(products[0].revenue).toBe(300000000); // 2 * 150,000,000
    });
  });

  describe('rollupQuotations domain rollup helper', () => {
    it('successfully groups quotations by standard types in rollupQuotations', () => {
      const mockCtx: RollupContext = {
        todayString: '2026-06-03',
        isToday: () => false,
        isLast7d: () => true,
        isLast30d: () => true,
        hasZnsStatus: () => true
      };

      const result = rollupQuotations(mockQuotations, mockCtx);
      
      expect(result.byLoai['BG Máy']).toBe(1);
      expect(result.byLoai['BG Vật tư']).toBe(1);
      expect(result.byLoai['BG Dịch vụ']).toBe(1);
    });
  });

  describe('rollupPayments & Bug M2 boundary formatting verification', () => {
    it('correctly rollups payments with mixed formatting styles, dot-comma decimals and currencies safely', () => {
      const payments: Payment[] = [
        { id: 'p1', customerId: 'c1', totalAmount: undefined, soTien: undefined, tongTienThanhToan: '1.500.000,50 ₫', tinhTrangThanhToan: 'ĐÃ THANH TOÁN' },
        { id: 'p2', customerId: 'c1', totalAmount: undefined, soTien: undefined, tongTienThanhToan: '1,500,000.50', tinhTrangThanhToan: 'ĐÃ THANH TOÁN' },
        { id: 'p3', customerId: 'c1', totalAmount: undefined, soTien: undefined, tongTienThanhToan: '5.000.000 đ', tinhTrangThanhToan: 'ĐÃ THANH TOÁN' }
      ];
      
      const mockCtx: RollupContext = {
        todayString: '2026-06-03',
        isToday: () => false,
        isLast7d: () => true,
        isLast30d: () => true,
        hasZnsStatus: () => true
      };
      
      const res = rollupPayments(payments, mockCtx);
      expect(res.doanhThuThang).toBe(8000001); // 1500000.50 + 1500000.50 + 5000000 = 8000001
    });
  });

  describe('buildInsights & Bug Z3 status field compatibility verification', () => {
    it('correctly flags customers with repeated ZNS failures utilizing status field', () => {
      const customers: Customer[] = [
        { id: 'c_fail', name: 'Thất bại' },
        { id: 'c_ok', name: 'Thành công' }
      ];
      
      const znsMessages: ZnsMessage[] = [
        { id: 'z1', customerId: 'c_fail', soDienThoai: '0901234567', status: 'FAILED', errorLog: 'Vendor Timeout', createdAt: '2026-06-01T10:00:00Z' },
        { id: 'z2', customerId: 'c_fail', soDienThoai: '0901234567', status: 'FAILED', errorLog: 'Invalid template', createdAt: '2026-06-02T10:00:00Z' },
        { id: 'z3', customerId: 'c_ok', soDienThoai: '0907654321', status: 'SUCCESS', createdAt: '2026-06-01T10:00:00Z' },
        { id: 'z4', customerId: 'c_ok', soDienThoai: '0907654321', status: 'SUCCESS', createdAt: '2026-06-02T10:00:00Z' }
      ];
      
      const data = {
        customers,
        quotations: [],
        contracts: [],
        payments: [],
        deliveries: [],
        znsMessages
      };
      
      const insights = buildInsights(data);
      expect(insights.khZnsLoi).toHaveLength(1);
      expect(insights.khZnsLoi[0].key).toBe('0901234567');
      expect(insights.khZnsLoi[0].count).toBe(2);
      expect(insights.khZnsLoi[0].latestMsg).toBe('Invalid template');
    });
  });
});
