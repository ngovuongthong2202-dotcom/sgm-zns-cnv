# ADR 0020: Firestore Query Map & Optimization Strategy (Tối ưu hóa Chi phí)

## Bối cảnh
Chi phí đọc/ghi (Read/Write OPS) của Firebase Firestore là mối bận tâm hàng đầu của chủ doanh nghiệp khi vận hành SGM OS. Thiết kế không kiểm soát có thể kéo theo hàng nghìn lượt đọc dư thừa mỗi khi người dùng tải lại trang, chuyển đổi tab, hoặc mở các drawer chi tiết. 

Tài liệu này hệ thống hóa toàn bộ các hoạt động đọc/ghi Firestore trong ứng dụng SGM OS, đồng thời cam kết các biện pháp giảm thiểu chi phí tối đa, loại bỏ hoàn toàn các lượt truy vấn dư thừa.

---

## 1. Bản Đồ Truy Vấn Firestore (Query Map)

| Danh mục | Collection | Phương thức truy vấn | Tần suất | Cơ chế tối ưu hiện tại & Đề xuất |
| :--- | :--- | :--- | :--- | :--- |
| **Nghiệp vụ Core** | `customers`, `quotations`, `contracts`, `payments`, `deliveries` | Realtime Multiplexed Listener (`useRealtimeCollection`) | Chỉ 1 listener cho mỗi collection hoạt động đồng thời trên toàn bộ ứng dụng | **Đã tối ưu**: Cơ chế Reference Counter tự động hủy đăng ký khi số lượng subscriber = 0. Chuyển tab không đọc lại (đọc từ cache local của `RealtimeStore`). |
| **Drawer Chi tiết** | `auditLogs`, `znsMessages` (ZNS History) | Khởi tạo onSnapshot scoped (`where('entityId', '==', entityId)`) khi drawer mở | Chỉ chạy khi Drawer cụ thể hiển thị | **Đã tối ưu**: Giới hạn dải dữ liệu được lắng nghe, không quét toàn bộ bảng. Hủy đăng ký ngay lập tức khi Drawer đóng. |
| **Auth & Cấu hình** | `users`, `userAccounts`, `admins`, `settings` (sharedFields) | Direct `getDoc` / Static Load | Tải 1 lần khi ứng dụng khởi chạy hoặc khi chuyển tới trang Cấu hình | **Đã tối ưu**: Tận dụng SWR caching, triệt tiêu việc đọc lặp. |
| **Trạng thái khóa & Hiện diện** | `systemLocks`, `presence` | Scoped listener trên document cụ thể | Chạy khi đang xem/sửa thực thể hoặc cập nhật trạng thái online | **Đã tối ưu**: Chỉ lắng nghe doc cụ thể (ví dụ: `systemLocks/{id}`). Tự động xóa lock khi rời giao diện chỉnh sửa để giữ lượng dữ liệu gọn nhẹ. |

---

## 2. Các Trụ Cột Tối Ưu Chi Phí Firestore Đã Áp Dụng

### A. Realtime Listener Multiplexing (Dùng chung 1 Listener)
Thay vì mỗi component gọi một listener `onSnapshot` độc lập gây bùng nổ số lượng reads (O(N*M) với N là số docs và M là số components), `src/shared/data/realtime-store.ts` sử dụng một Registry tập trung:
- Chặn đứng tình trạng đọc lại Firestore khi chuyển đổi giữa các tab Dashboard, Khách hàng, Báo giá, Hợp đồng...
- Tách biệt việc render và fetch data: Giao diện luôn mượt mà vì dữ liệu được cấp phát trực tiếp từ RAM đệm của Store.

### B. Single Writer & Server-Side Aggregation (Hạn chế Client Quét)
- Dashboard và các báo cáo doanh thu (`/api/analytics/today`) được phục vụ trực tiếp qua Express backend, truy vấn từ các bảng tổng hợp và cache, KHÔNG cho phép client tự tải toàn bộ dữ liệu hàng nghìn bản ghi về tự tính toán (Map-Reduce trên client là cấm kỵ vì tốn phí đọc cực lớn).
- Các workflow ghi đè liên đới (ví dụ: Tạo hợp đồng cần đóng băng báo giá, tạo giao hàng cần cập nhật tiến độ thanh toán) đều được gộp ghi dưới dạng **transaction/write batch** để đảm bảo tính toàn vẹn dữ liệu và an toàn nghiệp vụ tối đa.

---

## 3. Đề Xuất Composite Indexes cần thiết (`firestore.indexes.json`)
Để các truy vấn scoped chạy tối ưu trên Firestore, chúng ta cần đảm bảo các composite index sau luôn được bật:

```json
{
  "indexes": [
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "znsMessages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 4. Bảo Mật Firestore Cơ Bản (Base-Line Security Rule)
Cam kết áp dụng chính sách bảo mật tối giản nhưng vững chắc: **Đăng nhập hợp lệ là có quyền truy cập**, hoàn toàn miễn nhiễm với các lỗi "Missing or insufficient permissions" ngoài ý muốn:
- Kiểm tra `request.auth != null` chặt chẽ trên toàn bộ các collection nghiệp vụ.
- Thiết lập catch-all khóa chặt các collection hệ thống chưa được định nghĩa khác.
- Thêm TODO để tăng cường RBAC (phân quyền nâng cao) trong tương lai khi có yêu cầu nghiệp vụ cụ thể.
