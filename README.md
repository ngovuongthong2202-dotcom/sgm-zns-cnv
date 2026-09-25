# SGM OS (v15) - Hệ Thống Quản Trị Bán Hàng B2B & ZNS

Hệ thống cốt lõi quản trị bán hàng B2B chuyên nghiệp tích hợp động cơ Zalo Notification Service (ZNS). Được thiết kế tối ưu hiệu năng và an toàn giao dịch cấp doanh nghiệp.

## 👥 Sổ Tay Nghiệp Vụ (Dành Cho Người Cập Nhật/Sử Dụng)

Hệ thống xoay quanh 5 luồng chính. Dưới đây là hướng dẫn cơ bản cho người không chuyên:

1. **Khách Hàng (Customers)**: Nơi lưu trữ toàn bộ thông tin người mua.
   - Thêm mới: Nhập tên, số điện thoại, địa chỉ thật chuẩn xác.
   - Liên kết: Mỗi khách hàng sẽ gắn liền với lịch sử mua hàng, công nợ.

2. **Báo Giá (Quotations)**: Nơi khởi tạo thỏa thuận giá cả.
   - 3 Loại báo giá: *BG Máy* (dài hạn, sang hợp đồng), *BG Vật tư* & *BG Dịch vụ* (ngắn hạn, nhảy thẳng qua thanh toán/giao hàng).
   - Tương tác: Bấm "Chốt báo giá" để chuyển trạng thái. Hệ thống có thể gửi thông báo ZNS cho khách hàng hoặc sếp tổng duyệt.

3. **Hợp Đồng (Contracts)**: Chỉ áp dụng với đơn Máy.
   - Xác nhận pháp lý, điều khoản thanh toán dài hạn. 
   - Quản lý các mốc thu tiền theo tiến độ phần trăm.

4. **Biên Bản Thanh Toán (Payments)**:
   - Giao dịch thực tế để ghi nhận số tiền khách đã trả.
   - Các phiếu thu sẽ cấn trừ trực tiếp vào tổng tiền hợp đồng/báo giá.

5. **Lệnh Giao Hàng (Deliveries)**:
   - Ký kết phiếu xuất kho ảo.
   - Sau khi giao, bộ phận kho sẽ chuyển trạng thái hoàn tất để ghi nhận kết thúc vòng đời đơn hàng.

6. **Zalo ZNS**: 
   - Tự động thay mặt công ty gửi tin nhắn cho khách hàng qua Zalo.
   - Báo cáo chi tiết tin nào gửi "Thành công", tin nào "Lỗi mạng" trong thẻ *Lịch sử*.

7. **Bảng Điều Khiển (Dashboard) & Xuất File (Export)**:
   - Dashboard: Cấp quản lý xem tổng quan số lượng báo giá, doanh thu, hành động ưu tiên. Số liệu được tổng hợp định kỳ tự động.
   - Xuất File: Ở các bảng danh sách hoặc trong chi tiết, bạn có thể chọn "Xuất Excel/PDF" để làm báo cáo hoặc in ấn bằng menu "Hành động" (Action Menu).

---

## 🎨 Phong Cách Thiết Kế (Linear/Notion/Vercel Hybrid)

SGM OS tuân thủ triệt để ngôn ngữ thiết kế tinh giản, hiệu quả cao:
- **Surface**: `bg-white` (sáng), `bg-slate-50` (soft sub-surface). Tránh xa các gradient sặc sỡ.
- **Bảng Màu Accent (TỐI KỴ TÍM)**:
  - Bảng màu hợp lệ: `blue-600` (accent chính), `cyan-600`/`teal-600`, `emerald-600`, `amber-600`, `red-600`, `slate-*`.
- **Typography & Layout**: Fonts "Inter" (Sans) & "JetBrains Mono" (dữ liệu số/log).
- **Trạng thái Density**: Compact, Cozy, Comfortable - Chuyển đổi từ góc trên màn hình.

---

## 📂 Cơ Cấu Dự Án (File Tree)

```text
src/
├── backend/                       # Server-side APIs, cron jobs, metrics, webhook ZNS
├── components/                    # UI Components dùng chung (tabs, layouts)
├── design-system/                 # Primitives UI (Button, Input, DataView Engine)
├── domain/                        # Schemas (Zod), Enums, Business Rules & Policies
├── features/                      # Modules nghiệp vụ (Quotations, Contracts, Payments...)
├── hooks/                         # React Hooks thao tác dữ liệu, UI events
├── shared/                        # Utils, constants, realtime-store, swr-fetchers
├── widgets/                       # Các khối kết hợp UI & logic hiển thị tái lập
└── main.tsx                       # React mounting entry point
```

---

## 🛠️ Trình Tự Triển Khai (Môi trường Dev & Production)

### 1. Khởi động môi trường và cài đặt dependencies:
```bash
npm install
```

### 2. Thiết lập Biến môi trường:
```bash
cp .env.example .env
```
Cập nhật đúng biến môi trường, đặc biệt `GEMINI_API_KEY` nếu dùng chức năng AI.

### 3. Khởi chạy Development Server:
```bash
npm run dev
```
Truy cập qua cổng `3000`. Cổng này bắt buộc cho hạ tầng Docker/Cloud.

### 4. Build & Deploy (Production):
Khi đưa mã nguồn lên môi trường thực tế:
```bash
# Đóng gói frontend & biên dịch backend
npm run build 

# Khởi chạy bản production (Node.js) tại thư mục dist
npm run start
```

---

## 🧪 Hệ Thống Lệnh Kiểm Thử & Kiểm Soát

```bash
# Kiểm soát Type-Safety (0 lỗi)
npm run compile

# Kiểm tra lỗi Linters
npm run lint

# Chạy Unit Tests
npm run test

# Chạy E2E Tests (Playwright)
npm run test:e2e

# Smoke test xác minh sức khoẻ server trước khi merge
npm run smoke:test
```

---

## 🛡️ Phân Tích Sự Cố Thường Gặp (Troubleshooting Top 5)

1. **"Missing or insufficient permissions"**: Đảm bảo Firebase Auth đã tải xong trước khi thực hiện queries (`useAuth` guard) và kiểm tra lại `firestore.rules`.
2. **Dashboard Cháy Quota Firestore**: Cron task server-side rollup `/api/cron/metrics` chưa chạy để đồng bộ aggregates.
3. **Lỗi ZNS Rate Limit**: Hệ thống chặn >50 tin/phút. Dùng cơ chế Replay DLQ ở trang Quản trị ZNS.
4. **Không nhận dạng cột trong DataView**: Sửa schema Zod trong `src/domain/schema` chưa khớp với phần cấu hình trong cột (columns.config.tsx).
5. **Workflow "Transition not found"**: Schema State machine đang chặn. Tham khảo `gate.policy.ts`.
