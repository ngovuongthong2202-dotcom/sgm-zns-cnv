# Script đã lưu trữ (Đợt 0A – 10/2026)

Các tệp trong thư mục này là lệnh dùng một lần, đã gây hoặc có thể gây ghi đè dữ liệu sản xuất (gộp nhầm khách 30/09/2026,
ghi mã phiếu thu vào `deliveries.payment_id`). Không tệp nào chạy được, nhưng vì hai lý do khác nhau:

- Hai tệp `.ts`: Node nạp hết các `import` trước khi chạy dòng đầu tiên, mà các `import` tương đối `../src/...` không còn
  trỏ đúng sau khi chuyển thư mục, nên `tsx` dừng ngay với lỗi `ERR_MODULE_NOT_FOUND` (đã thử 10/10/2026). Dòng
  `process.exit(1)` ở đầu tệp chỉ là lớp chặn thứ hai, phòng khi ai sửa lại đường dẫn.
- Tệp `.cjs`: thoát ngay ở dòng `process.exit(1)` đầu tệp, trước mọi `require`.

Chỉ dùng để đọc lại logic khi dựng bộ máy gộp mới ở Đợt 2A. Không di chuyển trở lại `scripts/`.
