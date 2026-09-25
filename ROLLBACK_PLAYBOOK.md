# ROLLBACK PLAYBOOK & CHECKLIST VẬN HÀNH (v15)

Tài liệu này hướng dẫn cách xử lý sự cố khẩn cấp trên Production sau khi go-live Phase 23, kèm theo checklist vận hành hàng ngày.

## 1. Mức độ ưu tiên và Phân loại sự cố (Severity Levels)

*   **SEV-1 (Critical):** Hệ thống sập, mất mát dữ liệu diện rộng, toàn bộ user không thể login hoặc thao tác cơ bản (Tạo KH, Báo Giá, Hợp Đồng) bị crash.
*   **SEV-2 (High):** Một tính năng cốt lõi ngừng hoạt động (ví dụ: ZNS không gửi được, Export báo cáo lỗi), hoặc một luồng làm việc chính bị block.
*   **SEV-3 (Medium):** Lỗi UI/UX gây khó chịu nhưng có cách workaround, hoặc hiệu năng chậm ở một vài trang cụ thể.
*   **SEV-4 (Low):** Lỗi hiển thị nhỏ, typo, màu sắc không đúng chuẩn (nhưng không ảnh hưởng nghiệp vụ).

## 2. Kịch bản Xử lý (Runbooks)

### 2.1. Bug ảnh hưởng tiến trình (Crash UI diện rộng, Không gửi form)
**Hành động:** Rollback Cloud Run về revision mang tính ổn định gần nhất.
1. Vào Cloud Console > Cloud Run > chọn Service hiện tại.
2. Chuyển sang tab **Revisions**.
3. Chọn revision của lần release ổn định trước đó và click **Manage Traffic**.
4. Chuyển 100% traffic về revision đó.
5. Thông báo trên Telegram: `[HOT-FIX] Đã rollback về bản trước do lỗi <mô tả>. Đang khắc phục.`

### 2.2 Bug nhẹ (Gãy UI tinh chỉnh, Sai text, Sai luồng thứ yếu)
**Hành động:** Hotfix và Redeploy.
1. Fix code ở nhánh hotfix.
2. Kiểm tra `npm run compile` và `npm run lint` đảm bảo 0 lỗi.
3. Đợi CI chạy pass bộ test > Merge và Deploy ngay bản patch.

### 2.3. Data Corruption (Dữ liệu rác do lỗi Code/Migration)
**Hành động:** Sử dụng bản sao lưu để phục hồi.
1. **Chặn chỉnh sửa:** Cập nhật `firestore.rules` khóa chức năng Write tạm thời.
2. Lấy bản backup tự động mới nhất từ Cloud Storage hoặc tải bản manual JSON.
3. Chạy script phục hồi (restore) vào Firestore theo Collection.
4. Mở lại `firestore.rules`.
5. Đánh giá lượng dữ liệu tổn thất và tiến hành nhập bù thủ công bằng logs hệ thống nếu cần.

### 2.4 Hỏng kết nối ZNS (Vendor Zalo ZNS / Webhook sập)
**Hành động:** Bật chế độ Maintenance ZNS.
1. Vô hiệu hóa Cron Job gửi ZNS (Cloud Scheduler).
2. Thông báo nội bộ: `Hệ thống Zalo đang gián đoạn. Các thông báo sẽ được gửi sau`.
3. Tin nhắn ZNS rơi vào queue lỗi, chờ vendor online lên thì thực hiện Replay (Gửi lại) ở Cài đặt ZNS.

### 2.5 Hết Quota Firestore (Cảnh báo Firestore)
**Hành động:** Lập tức nâng hạn mức thanh toán / chặn cron job bất thường.
1. Vào Firebase Console > Billing.
2. Mở rộng trần chi phí tạm thời. Đảm bảo cảnh báo ngân sách ở mức 70%.
3. Tắt các hàm metrics rollup (như `/api/cron/metrics`) nếu đang đọc quá nhiều chưa tối ưu.

---

## 3. Checklist Vận Hành Hàng Ngày (Operations)

Dành cho Admin hệ thống:
- [ ] **Sáng 8:00 AM**: Kiểm tra nhóm Telegram nhận báo cáo định kỳ; xác nhận số liệu đồng bộ đúng (Rollup chạy thành công).
- [ ] **Dashboard Kiểm Tra**: Mở thẻ "Lịch sử hệ thống / Audit log" lướt qua xem có lỗi 500 hoặc hành động phá hoại không.
- [ ] **Kiểm tra ZNS Error**: Truy cập Hub ZNS, chọn bộ lọc "Lỗi" để Replay các tin nhắn bị nghẽn mạng đêm trước.
- [ ] **Dọn dẹp DB (Cuối tuần)**: Tạo bản xuất Export Database (Backup) từ menu Cài Đặt lưu trữ ngoại tuyến. Lịch Cloud Storage giữ bản snapshot 7 ngày tự động.

---

## 4. Liên hệ Khẩn cấp

*   **Principal Engineer/Tech Lead:** [Your Name / Số ĐT]
*   **Customer Success ZNS / CNV:** [Số điện thoại Đối tác ZNS]
