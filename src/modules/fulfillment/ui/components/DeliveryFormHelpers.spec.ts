import { describe, it, expect } from 'vitest';
import { resolveWaiverPrefill, validateDeliveryBusinessRules } from './DeliveryFormHelpers';

const DEFAULT_STRINGS = ['Ban Giám Đốc', 'Kế thừa Đặc cách Ban Giám Đốc từ đợt giao trước', 'Kế thừa Đặc cách Ban Giám Đốc từ đơn hàng', 'Đặc cách giao hàng trước khi thanh toán', 'Giao hàng trước thanh toán theo phê duyệt của Lãnh đạo'];
const recorded = { dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: 'Giao theo tiến độ hợp đồng dự án' };
const baseForm = {
  soPhieuXuat: 'PXK-1', donViVanChuyen: 'Xe CNV', loai: 'BG Vật tư', slMay: 0,
  products: [{ productName: 'Lưỡi dao cắt tôn', quantity: 1, itemType: 'MATERIAL', unit: 'Bộ', danhSachMaMay: [] }],
};
const unpaidPayments = [{ id: 'pay-unpaid', tinhTrangThanhToan: 'Chưa TT' }];

describe('resolveWaiverPrefill – Đợt 0A (GH02): không bao giờ tự bật đặc cách hay điền người duyệt/lý do', () => {
  it('không có đặc cách ở chứng từ cha lẫn đợt trước → tắt, hai ô rỗng', () => {
    expect(resolveWaiverPrefill({ parents: [{ soHopDong: 'HD-01' }], previousDeliveries: [], current: null })).toEqual({ dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' });
    expect(resolveWaiverPrefill({})).toEqual({ dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' });
  });

  it('hợp đồng có đặc cách đã ghi nhận (cờ + người duyệt + lý do) → chép nguyên văn', () => {
    expect(resolveWaiverPrefill({ parents: [recorded] })).toEqual(recorded);
  });

  it('đợt giao trước có cờ đặc cách nhưng thiếu người duyệt → KHÔNG kế thừa, không có chữ "Kế thừa …", không có lãnh đạo mặc định', () => {
    const r = resolveWaiverPrefill({ parents: [{}], previousDeliveries: [{ dacCachGiaoTruoc: true, lyDoDacCach: 'x' }] });
    expect(r).toEqual({ dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' });
  });

  it('phiếu thu cha thiếu lý do nhưng đợt trước có đủ → lấy từ đợt trước; cha đủ thì cha thắng', () => {
    expect(resolveWaiverPrefill({ parents: [{ dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Thắng' }], previousDeliveries: [recorded] })).toEqual(recorded);
    expect(resolveWaiverPrefill({ parents: [{ ...recorded, nguoiPheDuyetDacCach: 'Sếp Tuấn' }], previousDeliveries: [recorded] }).nguoiPheDuyetDacCach).toBe('Sếp Tuấn');
  });

  it('nhân viên đã tích đặc cách trong form hiện tại → giữ nguyên lựa chọn của họ (kể cả khi ô còn trống để họ tự điền)', () => {
    const r = resolveWaiverPrefill({ parents: [recorded], current: { dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: '' } });
    expect(r).toEqual({ dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: '' });
  });

  it('không đầu vào nào sinh ra chuỗi mặc định cũ', () => {
    const inputs = [{}, { parents: [{ dacCachGiaoTruoc: true }] }, { previousDeliveries: [{ dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'A' }] }, { current: { dacCachGiaoTruoc: false } }];
    for (const input of inputs) {
      const r = resolveWaiverPrefill(input);
      for (const s of DEFAULT_STRINGS) {
        expect(r.nguoiPheDuyetDacCach).not.toBe(s);
        expect(r.lyDoDacCach).not.toBe(s);
      }
    }
  });
});

describe('validateDeliveryBusinessRules – Đợt 0A (GH02): đặc cách cần người duyệt + lý do; hợp đồng chưa có phiếu thu phải có đặc cách', () => {
  it('đặc cách bật, có lý do, người duyệt rỗng hoặc toàn khoảng trắng → không hợp lệ, câu báo nêu người duyệt', () => {
    for (const approver of ['', '   ', undefined]) {
      const r = validateDeliveryBusinessRules({ ...baseForm, contractId: 'c1', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: approver, lyDoDacCach: 'Giao gấp' }, [], {}, null);
      expect(r.valid).toBe(false);
      expect(r.error).toBe('Đặc cách giao trước cần chọn người duyệt cụ thể trong ô "Lãnh đạo phê duyệt".');
    }
  });

  it('đặc cách bật, có người duyệt, lý do rỗng → không hợp lệ (câu cũ giữ nguyên)', () => {
    const r = validateDeliveryBusinessRules({ ...baseForm, contractId: 'c1', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: '  ' }, [], {}, null);
    expect(r).toEqual({ valid: false, error: 'Vui lòng nhập căn cứ / lý do phê duyệt của Sếp khi áp dụng Đặc cách Giao trước' });
  });

  it('đặc cách đủ người duyệt + lý do → hợp lệ', () => {
    expect(validateDeliveryBusinessRules({ ...baseForm, contractId: 'c1', ...recorded }, [], {}, null)).toEqual({ valid: true });
  });

  it('ca lạm dụng: contractId có, paymentId rỗng, không đặc cách → không hợp lệ (trước đây lọt qua không chốt nào)', () => {
    const r = validateDeliveryBusinessRules({ ...baseForm, contractId: 'c1', paymentId: '', dacCachGiaoTruoc: false }, [], {}, null);
    expect(r).toEqual({ valid: false, error: 'Hợp đồng chưa có phiếu thu: bật Đặc cách, chọn người duyệt và ghi lý do, hoặc lập phiếu thu trước.' });
  });

  it('paymentId của phiếu thu chưa thanh toán, không đặc cách → không hợp lệ (luật cũ giữ nguyên)', () => {
    const r = validateDeliveryBusinessRules({ ...baseForm, contractId: 'c1', paymentId: 'pay-unpaid', dacCachGiaoTruoc: false }, unpaidPayments, {}, null);
    expect(r).toEqual({ valid: false, error: 'Không được tạo phiếu giao hàng đối với Giao dịch Chưa thanh toán' });
  });

  it('báo giá không có phiếu thu → hành vi không đổi (GH12 là Đợt 1): hợp lệ', () => {
    expect(validateDeliveryBusinessRules({ ...baseForm, quotationId: 'q1', paymentId: '' }, [], {}, null)).toEqual({ valid: true });
  });
});
