import { describe, it, expect } from 'vitest';
import {
  isVietnamSunday,
  isVietnamHoliday,
  isVietnamWorkingDay,
  addVietnamWorkingDays,
  countVietnamWorkingDays,
  getFirstInstallment,
  checkProductionTriggerThreshold,
  checkWeekendDeliveryRisk,
  computeContractCompletionTimeline,
  VIETNAM_COMPENSATORY_WORKDAYS_SET,
} from './vietnamBusinessDays';

describe('Vietnam Business Days & Working Calendar Engine (Apex Sovereign 15.0)', () => {
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

  describe('isVietnamWorkingDay & Compensatory Workdays', () => {
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

    it('nhận diện chính xác Ngày làm bù (Compensatory Workday) theo quyết định của Chính phủ', () => {
      // 04/05/2024 là Thứ Bảy làm bù cho dịp 30/4 - 1/5
      const compensatorySat = new Date(2024, 4, 4);
      expect(VIETNAM_COMPENSATORY_WORKDAYS_SET.has('2024-05-04')).toBe(true);
      // Kể cả khi cấu hình không làm Thứ Bảy (includeSaturday: false), ngày làm bù vẫn là ngày làm việc!
      expect(isVietnamWorkingDay(compensatorySat, { includeSaturday: false })).toBe(true);
    });
  });

  describe('addVietnamWorkingDays', () => {
    it('bỏ qua Chủ Nhật khi cộng ngày làm việc', () => {
      const result = addVietnamWorkingDays('2026-09-25', 2);
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(28);
      expect(result?.getMonth()).toBe(8); // Tháng 9 (0-indexed)
      expect(result?.getFullYear()).toBe(2026);
    });

    it('bỏ qua các ngày Lễ/Tết khi cộng ngày làm việc', () => {
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

  describe('checkProductionTriggerThreshold (Động cơ Ngưỡng Cọc Sản Xuất)', () => {
    const contractAmount = 500000000; // 500 triệu, ngưỡng 30% = 150 triệu

    it('chưa kích hoạt sản xuất nếu chỉ mới cọc giữ chỗ nhỏ (ví dụ 50 triệu < 150 triệu)', () => {
      const mockPayments = [
        {
          id: 'PT-1',
          cacDotThu: [{ lanThu: 1, ngayThu: '2026-09-20', soTien: 50000000 }],
        },
      ];

      const res = checkProductionTriggerThreshold(mockPayments, contractAmount, 30);
      expect(res.isTriggered).toBe(false);
      expect(res.totalPaid).toBe(50000000);
      expect(res.requiredThresholdAmount).toBe(150000000);
      expect(res.statusLabel).toBe('Chờ đủ cọc khởi động');
    });

    it('chính thức kích hoạt sản xuất khi nộp tiếp đợt 2 vượt ngưỡng 30%', () => {
      const mockPayments = [
        {
          id: 'PT-1',
          cacDotThu: [
            { lanThu: 1, ngayThu: '2026-09-20', soTien: 50000000 },
            { lanThu: 2, ngayThu: '2026-09-24', soTien: 120000000 }, // Tổng = 170 triệu > 150 triệu
          ],
        },
      ];

      const res = checkProductionTriggerThreshold(mockPayments, contractAmount, 30);
      expect(res.isTriggered).toBe(true);
      expect(res.totalPaid).toBe(170000000);
      expect(res.triggerDate).toBe('2026-09-24'); // Lấy ngày của đợt thu giúp đạt ngưỡng
      expect(res.statusLabel).toBe('Đã kích hoạt sản xuất');
    });
  });

  describe('checkWeekendDeliveryRisk (Cảnh báo Giao Hàng Cuối Tuần)', () => {
    it('bật cảnh báo nếu ngày đích rơi vào Thứ Bảy', () => {
      const saturday = new Date(2026, 9, 31); // 31/10/2026 là Thứ Bảy
      const check = checkWeekendDeliveryRisk(saturday);
      expect(check.isRisk).toBe(true);
      expect(check.dayOfWeek).toBe(6);
      expect(check.notice).toContain('Thứ 7');
    });

    it('không bật cảnh báo nếu ngày đích rơi vào ngày trong tuần (Thứ Hai - Thứ Sáu)', () => {
      const thursday = new Date(2026, 9, 29); // 29/10/2026 là Thứ Năm
      const check = checkWeekendDeliveryRisk(thursday);
      expect(check.isRisk).toBe(false);
    });
  });

  describe('computeContractCompletionTimeline (Omni-Nexus Apex Sovereign)', () => {
    const mockContract = {
      id: 'CT-026',
      soHopDong: '026/KD1-SGM/TN-CT/26',
      ngayKy: '2026-09-18',
      soNgayDuKienHoanThanh: 30,
      giaTriSauThue: 580000000,
    };

    it('ưu tiên tính từ Ngày thu Đợt 1 nếu đã có thanh toán và đạt ngưỡng', () => {
      const mockPayments = [
        {
          id: 'PT-1',
          paymentId: 'PT-2026-1249',
          cacDotThu: [{ lanThu: 1, ngayThu: '2026-09-24', soTien: 174000000 }], // 174tr = 30% của 580tr
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
      expect(timeline.productionTrigger?.isTriggered).toBe(true);
      expect(timeline.executionStage).toBe('DANG_CHE_TAO');
    });

    it('tính từ Ngày ký HĐ nếu chưa có thanh toán đợt 1 và gắn cờ Chờ cọc khởi động', () => {
      const timeline = computeContractCompletionTimeline(mockContract, [], '2026-09-27');

      expect(timeline.baseDateType).toBe('NGAY_KY');
      expect(timeline.baseDateFormatted).toBe('18/09/2026');
      expect(timeline.completionDateFormatted).toBe('23/10/2026');
      expect(timeline.baseDateLabel).toContain('Từ Ngày ký HĐ (18/09/2026)');
      expect(timeline.workingDaysRemaining).toBe(23);
      expect(timeline.executionStage).toBe('CHO_COC_KHOI_DONG');
    });

    it('hỗ trợ Phụ lục Gia hạn tiến độ (Contract Addendum Extension) không bị phạt quá hạn', () => {
      const contractWithAddendum = {
        ...mockContract,
        soNgayGiaHan: 10, // Gia hạn thêm 10 ngày làm việc
        lyDoGiaHan: 'Khách hàng thay đổi bản vẽ khuôn dập máy ngói',
      };

      const mockPayments = [
        {
          id: 'PT-1',
          cacDotThu: [{ lanThu: 1, ngayThu: '2026-09-24', soTien: 200000000 }],
        },
      ];

      // Khi ngày hiện tại là 30/10/2026 (đã quá hạn gốc 29/10/2026):
      const timeline = computeContractCompletionTimeline(contractWithAddendum, mockPayments, '2026-10-30');

      expect(timeline.hasAddendumExtension).toBe(true);
      expect(timeline.extendedWorkingDays).toBe(10);
      expect(timeline.effectiveWorkingDays).toBe(40);
      expect(timeline.originalCompletionDateFormatted).toBe('29/10/2026');
      expect(timeline.completionDateFormatted).toBe('10/11/2026'); // 40 ngày làm việc từ 24/09/2026
      expect(timeline.isDelayed).toBe(false); // Chưa quá hạn mới!
      expect(timeline.addendumReason).toBe('Khách hàng thay đổi bản vẽ khuôn dập máy ngói');
    });

    it('chuyển sang trạng thái Hoàn thành bàn giao khi deliveryPercentage >= 100%', () => {
      const timeline = computeContractCompletionTimeline(
        mockContract,
        [{ id: 'PT-1', soTien: 580000000, ngayThanhToan: '2026-09-24' }],
        '2026-09-27',
        { deliveryPercentage: 100 }
      );

      expect(timeline.executionStage).toBe('DA_NGHIEM_THU_BAN_GIAO');
      expect(timeline.statusText).toBe('Hoàn thành bàn giao');
    });
  });
});
