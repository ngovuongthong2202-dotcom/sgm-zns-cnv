/**
 * Đợt 0A (GH15): ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh), không dùng toISOString() (UTC — trước 07:00 sáng sẽ ra ngày hôm trước).
 * Dùng cho ngày bàn giao thực tế và hai nút Hôm nay/Hôm qua; TI03 (Đợt 1) áp dụng cho các chỗ còn lại.
 */
const VN_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-MM-dd của thời điểm `date` theo giờ Việt Nam. */
export function getVietnamDateKey(date: Date = new Date()): string {
  return VN_DATE.format(date); // en-CA cho đúng dạng yyyy-MM-dd
}

/** Cộng/trừ ngày trên một khóa yyyy-MM-dd (tính theo lịch, không phụ thuộc múi giờ máy). */
export function shiftVietnamDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** true khi `key` là một ngày sau hôm nay (giờ Việt Nam). Chuỗi không đúng dạng → false (để schema báo lỗi riêng). */
export function isAfterVietnamToday(key: unknown, now: Date = new Date()): boolean {
  if (typeof key !== 'string' || !DATE_KEY.test(key)) return false;
  return key > getVietnamDateKey(now);
}
