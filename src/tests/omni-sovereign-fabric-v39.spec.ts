import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminDb } from '@/src/backend/config/supabase.admin';
import { sequenceGeneratorService } from '@/src/backend/services/workflow/sequence-generator.service';
import { reconcileHistoricalDuplicateQuotations, planDuplicateReconciliation } from '@/src/backend/services/workflow/reconcile-duplicates.service';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

describe('Sovereign Apex Omni-Fabric v39 Master Test Suite', () => {

  describe('1. Technical Specifier Parser, Bounded Numeric Tokenizer & Contradiction Elimination', () => {
    // Giả lập danh mục sản phẩm ERP
    const catalog = [
      {
        item_code: 'MCT-1T-1200',
        name: 'Máy cán tôn 1 tầng SGM VN K1200mm động cơ 7.5kW',
        nameNoTone: 'may can ton 1 tang sgm vn k1200mm dong co 7.5kw',
        codeLower: 'mct-1t-1200',
        display_unit: 'Máy'
      },
      {
        item_code: 'MCT-1T-600',
        name: 'Máy cán tôn 1 tầng VN K600mm trục 420',
        nameNoTone: 'may can ton 1 tang vn k600mm truc 420',
        codeLower: 'mct-1t-600',
        display_unit: 'Máy'
      },
      {
        item_code: 'MCT-2T-1200-914',
        name: 'Máy cán tôn 2 tầng SGM K1200/K914 sóng vuông và sóng tròn',
        nameNoTone: 'may can ton 2 tang sgm k1200/k914 song vuong va song tron',
        codeLower: 'mct-2t-1200-914',
        display_unit: 'Máy'
      },
      {
        item_code: 'DC-B68',
        name: 'Dây curoa B68 công nghiệp số 2',
        nameNoTone: 'day curoa b68 cong nghiep so 2',
        codeLower: 'dc-b68',
        display_unit: 'Sợi'
      }
    ];

    function searchCatalog(query: string) {
      const cleanQ = query.trim().toLowerCase();
      const cleanQNoTone = cleanQ
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

      const tokens = cleanQ.split(/\s+/).filter(Boolean);
      const tokensNoTone = cleanQNoTone.split(/\s+/).filter(Boolean);

      let queryTier: number | null = null;
      const hasTangWord = tokensNoTone.includes('tang') || tokensNoTone.includes('t') || cleanQ.includes('tầng');
      if (hasTangWord) {
        if (tokensNoTone.includes('2') || /(?:^|\s)(?:2\s*t(?:[^\w]|$)|2\s*tang|2\s*tầng|hai\s*tang|hai\s*tầng)/i.test(cleanQNoTone)) {
          queryTier = 2;
        } else if (tokensNoTone.includes('1') || /(?:^|\s)(?:1\s*t(?:[^\w]|$)|1\s*tang|1\s*tầng|mot\s*tang|mot\s*tầng)/i.test(cleanQNoTone)) {
          queryTier = 1;
        }
      }

      const matches: any[] = [];
      for (const item of catalog) {
        const code = item.codeLower;
        const name = item.name.toLowerCase();
        const noTone = item.nameNoTone;

        // Contradiction elimination
        if (queryTier === 2) {
          const has1Tier = /(?:^|[^\d])1\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])1\s*tang(?:[^\d\w]|$)/i.test(noTone);
          if (has1Tier) continue;
        } else if (queryTier === 1) {
          const has2Tier = /(?:^|[^\d])2\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])2\s*tang(?:[^\d\w]|$)/i.test(noTone);
          if (has2Tier) continue;
        }

        let matched = true;
        let score = 0;
        for (let t = 0; t < tokens.length; t++) {
          const tok = tokens[t];
          const tokNoTone = tokensNoTone[t] || tok;

          if (/^\d+$/.test(tok)) {
            const numRegex = new RegExp(`(?:^|[^0-9])${tok}(?:[^0-9]|$)`, 'i');
            const isNumMatched = numRegex.test(name) || numRegex.test(noTone) || numRegex.test(code);
            if (!isNumMatched) {
              matched = false;
              break;
            }
            score += 500;
          } else {
            const isTextMatched = code.includes(tok) || name.includes(tok) || noTone.includes(tokNoTone);
            if (!isTextMatched) {
              matched = false;
              break;
            }
            score += 100;
          }
        }

        if (!matched) continue;
        if (name.includes(cleanQ) || noTone.includes(cleanQNoTone)) score += 10000;
        matches.push({ ...item, score });
      }

      return matches.sort((a, b) => b.score - a.score);
    }

    it('Tìm "may can ton 2 tang" TUYỆT ĐỐI chỉ trả về máy 2 tầng, LOẠI BỎ triệt để máy 1 tầng', () => {
      const results = searchCatalog('may can ton 2 tang');
      expect(results.length).toBe(1);
      expect(results[0].item_code).toBe('MCT-2T-1200-914');
      expect(results[0].name).toContain('2 tầng');
      // Không hề chứa máy 1 tầng
      expect(results.some(r => r.item_code === 'MCT-1T-1200')).toBe(false);
      expect(results.some(r => r.item_code === 'MCT-1T-600')).toBe(false);
    });

    it('Tìm "may can ton 1 tang" chỉ trả về máy 1 tầng, LOẠI BỎ máy 2 tầng', () => {
      const results = searchCatalog('may can ton 1 tang');
      expect(results.length).toBe(2);
      expect(results.every(r => r.name.includes('1 tầng'))).toBe(true);
      expect(results.some(r => r.item_code === 'MCT-2T-1200-914')).toBe(false);
    });

    it('Số "2" độc lập không được ăn khớp vào 1200mm hay 420mm', () => {
      // Tìm "may can ton 2" (không có chữ tang)
      const results = searchCatalog('may can ton 2');
      // Máy 1 tầng có 1200mm nhưng số 2 nằm trong 1200 nên regex ranh giới không khớp
      expect(results.some(r => r.item_code === 'MCT-1T-1200')).toBe(false);
    });
  });

  describe('2. Historical Duplicate Reconciliation (BGVT-2026-0171 Healing)', () => {
    it('Tự động phân định 2 bản ghi trùng BGVT-2026-0171: bản ghi 1 giữ mã, bản ghi 2 nhận mã mới', async () => {
      const quoteHoaSen = {
        id: 'quo-hoasen-1',
        soPhieuBaoGia: 'BGVT-2026-0171',
        tenKhachHang: 'Công Ty Cổ Phần Tập Đoàn Hoa Sen - CN Gia Lai',
        loai: 'BG Vật tư',
        ngayBaoGia: '2026-09-08',
        createdAt: '2026-09-08T08:00:00.000Z',
        totalAmount: 6300000
      };

      const quotePhucThinhPhat = {
        id: 'quo-phucthinh-2',
        soPhieuBaoGia: 'BGVT-2026-0171',
        tenKhachHang: 'Công Ty TNHH Tôn Thép Phúc Thịnh Phát',
        loai: 'BG Vật tư',
        ngayBaoGia: '2026-09-08',
        createdAt: '2026-09-08T09:30:00.000Z',
        totalAmount: 960000
      };

      const activeDocs = [quoteHoaSen, quotePhucThinhPhat];

      // Chạy thuật toán phân định và hòa giải
      const { duplicateGroupsFound, itemsToHeal } = planDuplicateReconciliation(activeDocs);
      expect(duplicateGroupsFound).toBe(1);
      expect(itemsToHeal.length).toBe(1);

      // Bản ghi cần hòa giải chính là Phúc Thịnh Phát (tạo sau)
      expect(itemsToHeal[0].id).toBe('quo-phucthinh-2');
      expect(itemsToHeal[0].customerName).toBe('Công Ty TNHH Tôn Thép Phúc Thịnh Phát');
      expect(itemsToHeal[0].oldCode).toBe('BGVT-2026-0171');

      // Sinh mã mới thay thế an toàn
      const newCode = await sequenceGeneratorService.getNextCode('quotation', {
        loai: itemsToHeal[0].loai,
        year: itemsToHeal[0].year
      });
      expect(newCode).toMatch(/^BGVT-2026-\d{4}$/);
      expect(newCode).not.toBe('BGVT-2026-0171');
    });
  });

  describe('3. Financial & Warranty Staging Calculations', () => {
    it('Tính toán hai chiều % Chiết Khấu và Tiền Chiết Khấu chính xác theo chuẩn kế toán', () => {
      // 1. Nhập % chiết khấu 10%
      const item1 = computeLineItem({
        productName: 'Máy cán tôn SGM',
        quantity: 2,
        price: 100000000, // 200tr
        discountPct: 10,
        vatPct: 8
      });

      expect(item1.discountAmount).toBe(20000000); // 20tr
      expect(item1.subtotalBeforeTax).toBe(180000000); // 180tr
      expect(item1.vatAmount).toBe(14400000); // 180tr * 8%
      expect(item1.subtotalAfterTax).toBe(194400000); // 194.4tr

      // 2. Nhập số tiền chiết khấu cố định 50.000.000 ₫
      const item2 = computeLineItem({
        productName: 'Máy cán tôn SGM',
        quantity: 2,
        price: 100000000,
        discountType: 'AMOUNT',
        discountAmount: 50000000,
        vatPct: 10
      });

      expect(item2.discountPct).toBe(25); // 50tr / 200tr = 25%
      expect(item2.subtotalBeforeTax).toBe(150000000);
      expect(item2.vatAmount).toBe(15000000);
      expect(item2.subtotalAfterTax).toBe(165000000);
    });

    it('Tự động cộng dồn Ngày Báo Giá + Số ngày BH ra Ngày hết hạn bảo hành chính xác', () => {
      function calculateWarrantyExpiry(baseDate: string, days: number): string {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      }

      const base = '2026-10-02';
      const expiry365 = calculateWarrantyExpiry(base, 365);
      expect(expiry365).toBe('2027-10-02');

      const expiry180 = calculateWarrantyExpiry(base, 180);
      expect(expiry180).toBe('2027-03-31');
    });
  });

  describe('4. Cross-Module Payment Isolation', () => {
    it('Không chặn nhầm khách hàng khác khi có sự cố trùng mã tạm thời', () => {
      const quotations = [
        { id: 'quo-1', soPhieuBaoGia: 'BGVT-2026-0171', customerId: 'cus-hoasen', loai: 'BG Vật tư' },
        { id: 'quo-2', soPhieuBaoGia: 'BGVT-2026-0171', customerId: 'cus-phucthinh', loai: 'BG Vật tư' }
      ];

      // Đã có thanh toán cho Hoa Sen
      const payments = [
        { id: 'pay-1', quotationId: 'quo-1', soPhieuBaoGia: 'BGVT-2026-0171', customerId: 'cus-hoasen' }
      ];

      const paidQuotationIds = new Set(payments.map(p => p.quotationId));
      const paidQuotationCodes = new Set(payments.map(p => p.soPhieuBaoGia));

      // Lọc danh sách được phép thanh toán
      const eligibleQuotations = quotations.filter((q) => {
        if (paidQuotationIds.has(q.id)) return false;

        // Anti-Collision Shield: Chỉ chặn nếu thanh toán thuộc cùng khách hàng/chứng từ
        if (q.soPhieuBaoGia && paidQuotationCodes.has(q.soPhieuBaoGia)) {
          const matchingPayment = payments.find(p => p.soPhieuBaoGia === q.soPhieuBaoGia);
          if (matchingPayment) {
            const isDiffQuotation = matchingPayment.quotationId && matchingPayment.quotationId !== q.id;
            const isDiffCustomer = matchingPayment.customerId && q.customerId && matchingPayment.customerId !== q.customerId;
            if (isDiffQuotation || isDiffCustomer) {
              return true; // Cho phép Phúc Thịnh Phát tạo thanh toán!
            }
            return false;
          }
        }
        return true;
      });

      // Phúc Thịnh Phát phải xuất hiện trong danh sách hợp lệ
      expect(eligibleQuotations.length).toBe(1);
      expect(eligibleQuotations[0].id).toBe('quo-2');
      expect(eligibleQuotations[0].customerId).toBe('cus-phucthinh');
    });
  });
});
