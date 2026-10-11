# Tệp SQL của SGM OS (`db/migrations/`)

Quy ước (nguyên tắc 6 của kế hoạch tổng thể, mã CSDL05): mỗi thay đổi cơ sở dữ liệu là **một tệp SQL đánh số** (`NNNN_ten-viec.sql`), đi kèm **tệp hoàn tác** (`NNNN_ten-viec.rollback.sql`) và, khi cần, **tệp kiểm tra trước** chỉ đọc (`NNNN_ten-viec.precheck.sql`). Người chạy là **chủ sở hữu hoặc IT**, trong Supabase SQL editor (vai `postgres`), ngoài giờ làm việc, **sau khi sao lưu toàn bộ CSDL** bằng công cụ của Supabase. Tác tử không chạy SQL trên CSDL thật. Không ghi khóa, mật khẩu hay URL dự án vào thư mục này. Mỗi tệp là một khối `BEGIN; … COMMIT;` — lỗi ở một câu lệnh thì cả khối không có hiệu lực.

## Thứ tự và điều kiện

| Tệp | Làm gì | Chạy khi | Hoàn tác |
|---|---|---|---|
| `0001_b0c_cam_xoa_cung_khoa_cong_khai.sql` | Khóa công khai (`anon`, `authenticated`) không còn **xóa** được bảng nghiệp vụ, nhật ký, tin ZNS, bộ đếm; không còn **ghi** được các bảng trình duyệt chỉ đọc; hai hàm dọn dẹp/hạn mức chỉ máy chủ gọi được | Sau khi: (a) Sao lưu; (b) chạy `0001_…precheck.sql` và xử lý bảng lạ; (c) Render › Environment có `SUPABASE_SERVICE_ROLE_KEY` (máy chủ chạy bằng khóa anon sẽ mất mọi lệnh ghi) | `0001_…rollback.sql` |
| `0002_don_zns_config_long.sql` | Bỏ lớp cấu hình Zalo cũ bị lồng trong `settings/zns_config`, có bản sao `zns_config__bak_0002` | Sau khi bản có danh sách ô cho phép của trang Vendor & Webhook đã lên máy chủ và "Kiểm tra kết nối → Lưu" nghiệm thu xong; **trước** khi đổi khóa Zalo (B6) | `0002_…rollback.sql` |

## Cách chạy 0001 (từng bước)

1. **Sao lưu** toàn bộ CSDL (Supabase › Database › Backups, hoặc `pg_dump`). Ghi giờ sao lưu vào báo cáo cổng mục 8.6.
2. Mở `0001_b0c_cam_xoa_cung_khoa_cong_khai.precheck.sql`, chạy **từng truy vấn** (tất cả chỉ đọc):
   - Truy vấn 1 phải **trống**. Nếu ra bảng nào (ví dụ `gatebypasses`, `clienterrors`), gửi tên bảng cho người soạn để phân nhóm và bổ sung vào 0001 trước; **không** chạy 0001 khi còn bảng lạ.
   - Truy vấn 2–4: dán kết quả vào báo cáo (không có bí mật).
3. Xác nhận không có tự động hóa ngoài (Make/n8n/Zapier, bot Telegram, script chạy tay) đang ghi `zns_messages`/`counters`… hoặc xóa chứng từ bằng khóa anon.
4. Dán toàn bộ `0001_b0c_cam_xoa_cung_khoa_cong_khai.sql` vào SQL editor, chạy. Kết quả mong đợi: "Success. No rows returned".
5. **Kiểm ngay** (các truy vấn ở cuối tệp, phần `-- KIỂM CHỨNG`): quyền `DELETE` của `anon`/`authenticated` chỉ còn ở `users, settings, zns_templates, notifications, drafts, presence`; `INSERT`/`UPDATE` vắng ở nhóm B; `SELECT` còn ở mọi bảng; `has_function_privilege('anon', …)` = false.
6. **Thử bị từ chối** (dùng id không tồn tại nên không đụng dữ liệu):
   ```sql
   set role anon; delete from public.quotations where id = '__b0c_probe__'; reset role;
   ```
   → `ERROR: permission denied for table quotations`. Lặp lại với `payments`, `audit_logs` (delete), `counters` (insert), `zns_messages` (update); rồi với `set role authenticated`.
7. **Thử qua API bằng khóa công khai** (khóa lấy từ Supabase › Settings › API lúc chạy, **không** ghi vào kho; thay `<project-ref>`, `<KHÓA_ANON>`):
   ```
   curl -i -X DELETE "https://<project-ref>.supabase.co/rest/v1/quotations?id=eq.__b0c_probe__" -H "apikey: <KHÓA_ANON>" -H "Authorization: Bearer <KHÓA_ANON>"
   ```
   → `HTTP/2 403` với thân có `"code":"42501"` (trước khi chạy 0001 cùng lệnh trả 204). `PATCH …/counters?id=eq.__b0c_probe__` → 403. `GET …/zns_messages?select=id&limit=1` → 200 (đọc vẫn được). `PATCH …/quotations?id=eq.__b0c_probe__` với thân `{"data":{}}` → 204 không dòng nào (ghi **vẫn mở** tới B3 — ghi vào báo cáo, không phải lỗi).
8. **Kiểm trên ứng dụng** (bản chạy thật, sau Bước 0 tải lại tab): mở rồi đóng form sửa của một khách hàng, một báo giá, một hợp đồng, một phiếu thu, một phiếu giao (khóa chỉnh sửa lấy/trả được; Console không có "Failed to release lock"); lưu rồi xóa một bản nháp; đánh dấu đã đọc một thông báo; tạo một khách thử (mã do máy chủ cấp — `counters` ghi bằng khóa service); gửi **một** tin ZNS lẻ tới số nội bộ (máy chủ ghi `zns_messages`, thấy trong ZNS Hub); xóa khách thử đó từ giao diện (máy chủ xóa cứng); Cài đặt › Người dùng và trang nhật ký mở được; một tab khác nhận báo giá mới không cần F5. **Lưu ý:** "ghi chú hoạt động" thêm từ ngăn chi tiết **vẫn lỗi như trước** vì lớp ghi của trình duyệt thêm cột `updated_at` mà `audit_logs` không có (HT02) — không do SQL này.
9. **Kiểm lại sau 24 giờ**: không có lỗi 42501 trong nhật ký máy chủ (Render › Logs, tìm `permission denied`); ZNS Hub vẫn có tin mới; số chứng từ vẫn cấp được.

## Hoàn tác 0001

Chạy `0001_b0c_cam_xoa_cung_khoa_cong_khai.rollback.sql` (cấp lại đúng các quyền đã thu). Nhân viên không thấy khác biệt. Chạy lại 0001 sau đó là an toàn (REVOKE bất biến).

## Cách chạy 0002

Sau sao lưu: chạy `0002_don_zns_config_long.sql`; kiểm bằng truy vấn ở cuối tệp (`con_lop_long` = false cho `zns_config`); vào Cài đặt › Vendor & Webhook bấm "Kiểm tra kết nối Zalo OpenAPI" rồi "Lưu toàn bộ cấu hình", gửi thử 1 tin ZNS lẻ tới số nội bộ. Hoàn tác: `0002_don_zns_config_long.rollback.sql`. Chỉ chạy 0002 **một lần**: nếu sau này phải hoàn tác rồi chạy lại, và trong lúc đó cấu hình Zalo đã được sửa, thì bản sao lưu **cũ** vẫn được giữ nguyên (không bị ghi đè); muốn có bản sao lưu mới, hãy đổi tên hoặc xóa dòng `zns_config__bak_0002` trước khi chạy lại. Dòng sao lưu `zns_config__bak_0002` chứa bí mật cũ — xóa tay sau khi B6 (đổi khóa) hoàn tất.

## Tập trước trên dự án tạm (khuyến nghị, A5 còn mở)

Tạo một dự án Supabase miễn phí, chạy `supabase_schema.sql`, rồi 0001, truy vấn kiểm chứng, rollback, 0001 lại (≈ 30 phút). Chưa có cơ sở dữ liệu thử riêng nên lần chạy đầu trên dữ liệu thật vẫn là "sau sao lưu".

## Sổ theo dõi

| Tệp | Ngày chạy | Người chạy | Sao lưu lúc | Kết quả kiểm chứng (dán vào báo cáo cổng mục 8.6) |
|---|---|---|---|---|
| 0001 | (chưa) | | | |
| 0002 | (chưa) | | | |
