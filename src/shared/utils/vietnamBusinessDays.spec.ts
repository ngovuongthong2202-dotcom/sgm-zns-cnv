import { describe, it, expect } from 'vitest';
import {
  isVietnamSunday,
  isVietnamHoliday,
  isVietnamWorkingDay,
  addVietnamWorkingDays,
  countVietnamWorkingDays,
  getFirstInstallment,
  computeContractCompletionTimeline,
} from './vietnamBusinessDays';

describe('Vietnam Business Days & Working Calendar Engine', () => {
  describe('isVietnamSunday', () => {
    it('nhận diện chính xác ngày Chủ Nhật', () => {
      const sunday = new Date(2026, 8, 27); // 27/09/2026 là Chủ Nhật
      const saturday = new Date(2026, 8, 26); // 26/09/2026 là Thứ Bảy
      const monday = new Date(2026, 8, 28); // 28/09/2026 là Thứ Hai

      expect(isVietnamSunday(sunday)).toBe(true);
      expect(isVietnamSunday(saturday)).toBe(false);
      expect(isVietnamSunday(monday)).toBe(false);
    });
  });

  describe('isVietnamHoliday', () => {
    it('nhận diện chính xác các ngày lễ dương lịch cố định', () => {
      expect(isVietnamHoliday(new Date(2026, 0, 1))).toBe(true); // 01/01 Tết DL
      expect(isVietnamHoliday(new Date(2026, 3, 30))).toBe(true); // 30/04
      expect(isVietnamHoliday(new Date(2026, 4, 1))).toBe(true); // 01/05
      expect(isVietnamHoliday(new Date(2026, 8, 2))).toBe(true); // 02/09
      expect(isVietnamHoliday(new Date(2026, 8, 3))).toBe(true); // 03/09
    });

    it('nhận diện chính xác Tết Âm lịch và Giỗ Tổ Hùng Vương', () => {
      expect(isVietnamHoliday(new Date(2026, 1, 17))).toBe(true); // Mùng 1 Tết Bính Ngọ 2026 (17/02/2026)
      expect(isVietnamHoliday(new Date(2026, 3, 26))).toBe(true); // Giỗ Tổ 2026 (26/04/2026)
      expect(isVietnamHoliday(new Date(2026, 3, 27))).toBe(true); // Nghỉ bù Giỗ Tổ (27/04/2026)
    });

    it('ngày thường không phải là ngày lễ', () => {
      expect(isVietnamHoliday(new Date(2026, 8, 24))).toBe(false); // 24/09/2026
      expect(isVietnamHoliday(new Date(2026, 9, 15))).toBe(false); // 15/10/2026
    });
  });

  describe('isVietnamWorkingDay', () => {
    it('Thứ Bảy là ngày làm việc mặc định trong sản xuất cơ khí SGM', () => {
      const saturday = new Date(2026, 8, 26); // 26/09/2026 là Thứ Bảy
      expect(isVietnamWorkingDay(saturday)).toBe(true);
    });

    it('Chủ Nhật và Lễ/Tết không phải là ngày làm việc', () => {
      const sunday = new Date(2026, 8, 27); // Chủ Nhật
      const nationalDay = new Date(2026, 8, 2); // 02/09
      expect(isVietnamWorkingDay(sunday)).toBe(false);
      expect(isVietnamWorkingDay(nationalDay)).toBe(false);
    });
  });

  describe('addVietnamWorkingDays', () => {
    it('bỏ qua Chủ Nhật khi cộng ngày làm việc', () => {
      // Thứ Sáu 25/09/2026, +2 ngày làm việc:
      // +1 ngày: Thứ Bảy 26/09 (làm việc)
      // Chủ Nhật 27/09: Bỏ qua
      // +2 ngày: Thứ Hai 28/09 (làm việc) -> Đích đến là 28/09/2026
      const result = addVietnamWorkingDays('2026-09-25', 2);
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(28);
      expect(result?.getMonth()).toBe(8); // Tháng 9 (0-indexed)
      expect(result?.getFullYear()).toBe(2026);
    });

    it('bỏ qua các ngày Lễ/Tết khi cộng ngày làm việc', () => {
      // Thứ Tư 29/04/2026, +2 ngày làm việc:
      // 30/04: Nghỉ lễ (Bỏ qua)
      // 01/05: Nghỉ lễ (Bỏ qua)
      // 02/05: Thứ Bảy (Làm việc -> Ngày 1)
      // 03/05: Chủ Nhật (Bỏ qua)
      // 04/05: Thứ Hai (Làm việc -> Ngày 2) -> Đích đến là 04/05/2026
      const result = addVietnamWorkingDays('2026-04-29', 2);
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(4);
      expect(result?.getMonth()).toBe(4); // Tháng 5 (0-indexed)
    });

    it('tính chính xác 30 ngày làm việc từ ngày thu Đợt 1 (24/09/2026) -> 29/10/2026', () => {
      const result = addVietnamWorkingDays('2026-09-24', 30);
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(29);
      expect(result?.getMonth()).toBe(9); // Tháng 10 (0-indexed)
      expect(result?.getFullYear()).toBe(2026);
    });
  });

  describe('getFirstInstallment', () => {
    it('trích xuất đúng ngày thu Đợt 1 từ mảng cacDotThu', () => {
      const mockPayments = [
        {
          id: 'PT-1',
          paymentId: 'PT-2026-1249',
          cacDotThu: [
            { lanThu: 1, ngayThu: '2026-09-24', soTien: 174000000 },
            { lanThu: 2, ngayThu: '2026-10-15', soTien: 200000000 },
          ],
        },
      ];

      const dot1 = getFirstInstallment(mockPayments);
      expect(dot1).not.toBeNull();
      expect(dot1?.lanThu).toBe(1);
      expect(dot1?.ngayThu).toBe('2026-09-24');
      expect(dot1?.soTien).toBe(174000000);
    });

    it('fallback lấy ngayThanhToan nếu không có cacDotThu nhưng soTien > 0', () => {
      const mockPayments = [
        {
          id: 'PT-2',
          paymentId: 'PT-2026-0001',
          ngayThanhToan: '2026-08-10',
          soTien: 50000000,
        },
      ];

      const dot1 = getFirstInstallment(mockPayments);
      expect(dot1).not.toBeNull();
      expect(dot1?.ngayThu).toBe('2026-08-10');
    });

    it('trả về null nếu không có thanh toán nào', () => {
      expect(getFirstInstallment([])).toBeNull();
      expect(getFirstInstallment(undefined)).toBeNull();
    });
  });

  describe('computeContractCompletionTimeline', () => {
    const mockContract = {
      id: 'CT-026',
      soHopDong: '026/KD1-SGM/TN-CT/26',
      ngayKy: '2026-09-18',
      soNgayDuKienHoanThanh: 30,
    };

    it('ưu tiên tính từ Ngày thu Đợt 1 nếu đã có thanh toán', () => {
      const mockPayments = [
        {
          id: 'PT-1',
          paymentId: 'PT-2026-1249',
          cacDotThu: [{ lanThu: 1, ngayThu: '2026-09-24', soTien: 174000000 }],
        },
      ];

      const timeline = computeContractCompletionTimeline(mockContract, mockPayments, '2026-09-27');

      expect(timeline.baseDateType).toBe('DOT_1');
      expect(timeline.baseDateFormatted).toBe('24/09/2026');
      expect(timeline.completionDateFormatted).toBe('29/10/2026');
      expect(timeline.workingDaysTotal).toBe(30);
      expect(timeline.workingDaysElapsed).toBe(2); // 25/09 (T6) và 26/09 (T7)
      expect(timeline.workingDaysRemaining).toBe(28);
      expect(timeline.isDelayed).toBe(false);
      expect(timeline.timeProgressPercent).toBe(7);
      expect(timeline.baseDateLabel).toContain('Từ Ngày thu Đợt 1 (24/09/2026)');
    });

    it('tính từ Ngày ký HĐ nếu chưa có thanh toán đợt 1', () => {
      const timeline = computeContractCompletionTimeline(mockContract, [], '2026-09-27');

      expect(timeline.baseDateType).toBe('NGAY_KY');
      expect(timeline.baseDateFormatted).toBe('18/09/2026');
      expect(timeline.completionDateFormatted).toBe('23/10/2026');
      expect(timeline.baseDateLabel).toContain('Từ Ngày ký HĐ (18/09/2026)');
      expect(timeline.workingDaysRemaining).toBe(23);
    });
  });
});
