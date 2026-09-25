# Hướng Dẫn Onboarding Cho Developer Mới (SGM OS v15)

Chào mừng bạn đến với đội ngũ Phát triển Product SGM OS! Hướng dẫn này được thiết kế để giúp bạn làm quen, dựng máy chạy ứng dụng và thực hiện Pull Request (PR) đầu tiên thành công chỉ trong vòng **30 phút**.

---

## ⏱️ Thời Gian Biểu 30 Phút Dựng Môi Trường

### Phút 1–5: Tìm Hiểu Thiết Lập Môi Trường Local
1. **Clone dự án** và truy cập thư mục gốc:
   ```bash
   git clone <repo-url>
   cd sgm-os
   ```
2. **Cài đặt Node.js**: Hãy đảm bảo bạn đang dùng Node.js v20+ hoặc v22+.
3. **Cài đặt Dependencies**:
   ```bash
   npm install
   ```

### Phút 5–10: Cấu Hình Biến Môi Trường (ENV)
1. Tạo file `.env` từ mẫu có sẵn:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` và đảm bảo các cài đặt cục bộ đã sẵn sàng.
   - Để tích hợp Gemini AI hoặc ZNS Webhook, hãy điền các khóa API tương ứng.
   - Nhắc nhở: Không tạo các trường nhập API keys trên giao diện UI để tránh rò rỉ hoặc vi phạm chính sách bảo mật Client.

### Phút 10–15: Chạy Ứng Dụng Môi Trường Cục Bộ
1. Khởi chạy dev server:
   ```bash
   npm run dev
   ```
2. Mở trình duyệt tại địa chỉ [http://localhost:3000](http://localhost:3000).
3. Đăng nhập thử bằng tài khoản giả lập hoặc thông tin tài khoản admin mặc định.

### Phút 15–20: Thử Nghiệm Quy Trình Nghiệp Vụ Cơ Bản
Hãy nhấp chuột trải nghiệm luồng nghiệp vụ xương sống của hệ thống:
1. Vào **Báo giá (Quotations)** -> Thêm báo giá mới -> Chọn khách hàng mẫu.
2. Từ báo giá này, bấm **Chốt báo giá** để kích hoạt ZNS tự động (bản mock).
3. Hệ thống sẽ tự động gợi ý tạo **Hợp đồng (Contract)** dựa trên thông tin báo giá đã chốt.
4. Chuyển tiếp hợp đồng qua trạng thái Ký kết, sau đó tạo **Phiếu thu (Payment)** và cuối cùng thực hiện **Giao hàng (Delivery)**.

---

## 🚀 Hướng Dẫn Thực Hiện PR Đầu Tiên (Sample PR)

Để kiểm tra xem bạn đã nắm vững quy trình phát triển và kiểm soát chất lượng của dự án hay chưa, hãy thực hiện một PR bổ sung tính năng nhỏ theo các bước sau đây:

### Bài tập PR: Bổ sung lý do từ chối giao hàng trong `DeliveryDetailDrawer`

Chúng ta cần cho phép hiển thị lý do từ chối (nếu có) trên panel chi tiết giao nhận khi đơn hàng ở trạng thái hủy.

#### Bước 1: Tạo nhánh Git mới
```bash
git checkout -b feature/onboarding-delivery-reject-reason
```

#### Bước 2: Thực hiện sửa mã nguồn
1. Mở file `/src/features/deliveries/components/DeliveryDetailDrawer.tsx`.
2. Tìm nơi hiển thị trạng thái hủy (`tinhTrangGiaoHang === 'HUY'`) hoặc tương đương.
3. Thêm một block hiển thị trường thông tin lý do từ chối (được lấy từ field `ghiChu` hoặc một thuộc tính custom từ draft) với phong cách Linear tinh tế:
   ```tsx
   {isCancelled && drawerDelivery.ghiChu && (
     <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-mono">
       <strong>Lý do huỷ:</strong> {drawerDelivery.ghiChu}
     </div>
   )}
   ```

#### Bước 3: Kiểm tra tuân thủ quy tắc thiết kế (Design System Validation)
- Đảm bảo **KHÔNG** chứa bất kỳ màu tím nào (`purple-500`, `indigo-600`...).
- Dùng đúng button hoặc status pill từ `@/ds/` thay vì tự viết button nguyên bản.
- Đảm bảo có aria-labels đầy đủ cho các tương tác mới.

#### Bước 4: Chạy linter và compiler cục bộ để rà soát lỗi
Trước khi commit, máy của bạn PHẢI vượt qua bước kiểm tra nghiêm ngặt này:
```bash
# Rà soát lỗi cú pháp & styling format
npm run lint

# Rà soát lỗi kiểu Type-Check (Strict Mode)
npm run compile
```

Nếu rà soát báo thành công và không sinh ra bất kỳ lỗi đỏ nào, chúc mừng bạn đã viết code chuẩn chỉnh!

#### Bước 5: Chạy bộ kiểm thử tự động
```bash
npm run test
```

#### Bước 6: Commit và đẩy lên repository
Sử dụng chuẩn Commit của dự án:
```bash
git add .
git commit -m "feat(onboarding): add delivery cancel reason to detail drawer"
git push origin feature/onboarding-delivery-reject-reason
```
Tạo Pull Request trên GitHub hướng về nhánh `main` và tag Tech Lead của bạn vào review!

---

## 📜 Checklist Cần Nhớ Khi Viết Code Ở Dự Án SGM OS
- [ ] **Màu sắc**: Tuyệt đối CẤM sử dụng các màu tone tím/hồng như `purple`, `violet`, `fuchsia`, `pink`, `magenta`, `indigo` trong class Tailwind. (Chỉ dùng slate, blue, emerald, amber, red, cyan/teal).
- [ ] **Sử dụng paths**: Trong dự án sử dụng relative path liên kết, có thể dùng TypeScript module resolution. Ưu tiên tái sử dụng primitives từ `src/design-system` và component đóng gói từ `src/widgets`.
- [ ] **Zero any & ts-ignore**: Tất cả các types tự tạo phải tường minh. Tuyệt đối không chèn `any` hay dùng `@ts-ignore` để lấp liếm lỗi của TSC compiler. Zod schema (`src/domain/schema`) là nguồn chân lý duy nhất.
- [ ] **Data Mutations**: Không thay đổi Firestore doc bằng raw calls ở component. Bắt buộc gọi qua hooks mutator (`useMutation`) trong thư mục features và quản lý SWR cache tương ứng để tránh race conditions.
- [ ] **Idempotent / Submitting states**: Khi người dùng click nút submit (tạo hợp đồng, thanh toán, gửi tin...), nút đó phải bị disabled ngay lập tức kèm theo hiệu ứng loading mượt mà. Đảm bảo thao tác lưu form an toàn.
