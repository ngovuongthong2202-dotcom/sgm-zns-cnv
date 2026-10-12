import { describe, it, expect } from 'vitest';
import { buildPaymentZnsNote, collectPaymentLedger, isLegacyAutoSettledNote, isSettlementClaim, PAYMENT_ZNS_NOTE_MAX } from './paymentZnsNote';

const inst = (lanThu: number, soTien: number, ngayThu = '2026-10-01', ghiChu = `Thu tiền đợt ${lanThu} - HĐ 004`) => ({ lanThu, soTien, ngayThu, ghiChu });

describe('paymentZnsNote – Đợt 0A (TT01/§9.11)', () => {
  it('đợt thu 30 %, chỉ số 0, "Công nợ", congNoConLai không có → ok, "Thanh toán đợt 1" (không bao giờ "Tất toán")', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', totalAmount: 100_000_000, cacDotThu: [inst(1, 30_000_000)], ghiChu: 'FT26161873245 link chứng từ' }, 0);
    expect(r).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: 0, installmentNumber: 1, collected: 30_000_000 });
  });

  it('chỉ số 2 của ba đợt → "Thanh toán đợt 3"', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(1, 10), inst(2, 10), inst(3, 10)] }, 2);
    expect(r.ok && r.ghiChu).toBe('Thanh toán đợt 3');
  });

  it('nhãn "Tất toán" + congNoConLai 0 → câu vẫn "Thanh toán đợt N", không chứa "Tất toán"', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Tất toán', congNoConLai: 0, totalAmount: 10, cacDotThu: [inst(1, 10)] });
    expect(r.ok && r.ghiChu).toBe('Thanh toán đợt 1');
    expect(JSON.stringify(r)).not.toContain('Tất toán');
  });

  it('ghi chú nội bộ của phiếu và của đợt bị bỏ qua hoàn toàn', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', ghiChu: 'FT26161873245 link chứng từ', cacDotThu: [inst(1, 5, '2026-10-01', 'Thu tiền đợt 1 - HĐ 004')] }, 0);
    expect(JSON.stringify(r)).not.toMatch(/FT2616|Thu tiền đợt/);
  });

  it('không chọn đợt, ba đợt có tiền → N = đợt mới nhất (3), installmentIndex 2', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(1, 10), inst(2, 10), inst(3, 10)] });
    expect(r).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 3', installmentIndex: 2, installmentNumber: 3 });
  });

  it('không chọn đợt, không cacDotThu, soTien 50 triệu, "Công nợ" (phiếu một khoản) → ok, "Thanh toán đợt 1", installmentIndex null', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', soTien: 50_000_000 });
    expect(r).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: null, collected: 50_000_000 });
  });

  it('soTien 0, không cacDotThu, "Chưa TT" → ok:false PAYMENT_NOT_COLLECTED, lý do nhắc "Ghi nhận đợt thu"', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Chưa TT', soTien: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('PAYMENT_NOT_COLLECTED');
      expect(r.reason).toBe('Phiếu thu chưa ghi nhận khoản thu nào nên không gửi được tin xác nhận thanh toán. Ghi nhận đợt thu trước.');
    }
  });

  it('nhãn "Tất toán" nhưng soTien 0 và không có đợt (dấu vết TT04) → ok:false (tính theo tiền, không theo nhãn)', () => {
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Tất toán', soTien: 0, cacDotThu: [] }).ok).toBe(false);
  });

  it('nhãn "Chưa TT" nhưng soTien > 0 không có đợt (dữ liệu lệch) → ok:false (theo §4.7.1, phải ghi nhận đợt thu)', () => {
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Chưa TT', soTien: 5_000_000 }).ok).toBe(false);
  });

  it('phiếu "Hủy" có tiền → ok:false; phiếu xóa mềm (deletedAt / deleted_at / isDeleted) → ok:false', () => {
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Hủy', soTien: 30_000_000, cacDotThu: [inst(1, 30_000_000)] }).ok).toBe(false);
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', deletedAt: '2026-10-01T00:00:00Z', cacDotThu: [inst(1, 10)] }).ok).toBe(false);
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', deleted_at: '2026-10-01T00:00:00Z', cacDotThu: [inst(1, 10)] }).ok).toBe(false);
    expect(buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', isDeleted: true, cacDotThu: [inst(1, 10)] }).ok).toBe(false);
  });

  it('đợt có soTien 0/undefined bị bỏ qua khi đếm tiền và khi chọn "mới nhất"', () => {
    const ledger = collectPaymentLedger({ tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(1, 10), { lanThu: 2, soTien: 0, ngayThu: '' }, { lanThu: 3 }] });
    expect(ledger.collected).toBe(10);
    expect(ledger.entries.map(e => e.lanThu)).toEqual([1]);
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(1, 10), { lanThu: 2, soTien: 0 }] });
    expect(r.ok && r.ghiChu).toBe('Thanh toán đợt 1');
  });

  it('chỉ số ngoài phạm vi (5 của 2) hoặc trỏ vào đợt chưa có tiền → ok:false INVALID_INSTALLMENT', () => {
    const p = { tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(1, 10), { lanThu: 2, soTien: 0 }] };
    const r1 = buildPaymentZnsNote(p, 5);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.code).toBe('INVALID_INSTALLMENT');
    const r2 = buildPaymentZnsNote(p, 1);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe('INVALID_INSTALLMENT');
    expect(buildPaymentZnsNote(p, Number.NaN).ok).toBe(false);
  });

  it('độ dài câu ≤ 30 với N từ 1 tới 999; không bao giờ chứa "(Còn lại"', () => {
    for (const n of [1, 9, 10, 99, 100, 999]) {
      const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', congNoConLai: 70_000_000, cacDotThu: [inst(n, 10)] }, 0);
      expect(r.ok && r.ghiChu.length).toBeLessThanOrEqual(PAYMENT_ZNS_NOTE_MAX);
      expect(JSON.stringify(r)).not.toContain('(Còn lại');
    }
  });

  it('isLegacyAutoSettledNote: đúng với câu tự điền cũ và bản cắt 30 ký tự; sai với "Thanh toán đợt 2"', () => {
    expect(isLegacyAutoSettledNote('Tất toán 100% hợp đồng - Hoàn tất thanh toán')).toBe(true);
    expect(isLegacyAutoSettledNote('Tất toán 100% hợp đồng - Hoàn')).toBe(true);
    expect(isLegacyAutoSettledNote('  tất toán 100% HỢP ĐỒNG')).toBe(true);
    expect(isLegacyAutoSettledNote('Thanh toán đợt 2')).toBe(false);
    expect(isLegacyAutoSettledNote('')).toBe(false);
  });

  it('collectPaymentLedger loại đợt của phiếu hủy/xóa mềm và sắp theo lanThu rồi thứ tự mảng', () => {
    const ledger = collectPaymentLedger({ tinhTrangThanhToan: 'Công nợ', cacDotThu: [inst(2, 20), inst(1, 10), { soTien: 5, ngayThu: '2026-10-03' }] });
    expect(ledger.entries.map(e => [e.lanThu, e.soTien])).toEqual([[1, 10], [2, 20], [3, 5]]);
    expect(ledger.collected).toBe(35);
    expect(collectPaymentLedger({ tinhTrangThanhToan: 'Đã hủy', cacDotThu: [inst(1, 10)] })).toMatchObject({ collected: 0, cancelled: true });
    expect(collectPaymentLedger(null)).toEqual({ collected: 0, entries: [], cancelled: false, deleted: false });
  });

  it('phiếu chỉ có số tiền đầu phiếu (cacDotThu rỗng hoặc không có) + chỉ số 0 (dòng "Đợt 1" tự dựng của ngăn chi tiết) → ok, "Thanh toán đợt 1", installmentIndex null', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', soTien: 50_000_000, cacDotThu: [] }, 0);
    expect(r).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: null, installmentNumber: 1, collected: 50_000_000 });
    const r2 = buildPaymentZnsNote({ tinhTrangThanhToan: 'Tất toán', soTien: 50_000_000 }, 0);
    expect(r2).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: null, installmentNumber: 1, collected: 50_000_000 });
  });

  it('phiếu chỉ có số tiền đầu phiếu + chỉ số khác 0 (1, 2, -1, NaN) → vẫn ok:false INVALID_INSTALLMENT', () => {
    for (const index of [1, 2, -1, Number.NaN]) {
      const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', soTien: 50_000_000, cacDotThu: [] }, index);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('INVALID_INSTALLMENT');
    }
  });

  it('cacDotThu có dòng nhưng không dòng nào có tiền + số tiền đầu phiếu 50 triệu + chỉ số 0 → ok, "Thanh toán đợt 1"', () => {
    const r = buildPaymentZnsNote({ tinhTrangThanhToan: 'Công nợ', soTien: 50_000_000, cacDotThu: [{ lanThu: 1, soTien: 0 }] }, 0);
    expect(r).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: null, installmentNumber: 1, collected: 50_000_000 });
  });

  it('chỉ số là chỉ số mảng gốc của cacDotThu, không phải vị trí sau khi sắp theo lanThu', () => {
    const p = { tinhTrangThanhToan: 'Công nợ', cacDotThu: [{ lanThu: 2, soTien: 20_000_000, ngayThu: '2026-10-05' }, { lanThu: 1, soTien: 30_000_000, ngayThu: '2026-10-01' }] };
    expect(buildPaymentZnsNote(p, 0)).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 2', installmentIndex: 0, installmentNumber: 2 });
    expect(buildPaymentZnsNote(p, 1)).toMatchObject({ ok: true, ghiChu: 'Thanh toán đợt 1', installmentIndex: 1, installmentNumber: 1 });
  });

  // Rà soát cuối (TT01): câu "tất toán" do nhân viên tự gõ cũng là lời báo đã thu đủ, không chỉ câu tự điền cũ.
  it('isSettlementClaim: đúng với câu có "tất toán" (không dấu, hoa/thường, viết liền, dạng Unicode tách dấu, câu tự điền cũ)', () => {
    for (const s of ['Tất toán', 'Đã tất toán HĐ', 'Tất toán đợt cuối', 'TAT TOAN', 'tat toan', 'tấttoán', 'Đã tất toán'.normalize('NFD'), 'Tất toán 100% hợp đồng - Hoàn tất thanh toán']) {
      expect(isSettlementClaim(s), s).toBe(true);
    }
  });

  it('isSettlementClaim: sai với "chưa tất toán" (có hoặc không dấu), câu thanh toán thường và chuỗi rỗng', () => {
    for (const s of ['Chưa tất toán', 'chua tat toan', 'Thanh toán đợt 1', '']) {
      expect(isSettlementClaim(s), s).toBe(false);
    }
  });
});
