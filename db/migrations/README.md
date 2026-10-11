# Tệp SQL của SGM OS (`db/migrations/`)

Quy ước (nguyên tắc 6 của kế hoạch tổng thể, mã CSDL05): mỗi thay đổi cơ sở dữ liệu là **một tệp SQL đánh số** (`NNNN_ten-viec.sql`), đi kèm **tệp hoàn tác** (`NNNN_ten-viec.rollback.sql`) và, khi cần, **tệp kiểm tra trước** (`NNNN_ten-viec.precheck.sql`). Tệp kiểm tra trước **chỉ đọc**: không sửa gì và không có `BEGIN`/`COMMIT`. Tệp chạy và tệp hoàn tác là một khối `BEGIN; … COMMIT;` — lỗi ở một câu lệnh thì cả khối không có hiệu lực. Người chạy là **chủ sở hữu hoặc IT**, trong Supabase SQL editor (mặc định chạy bằng vai quản trị `postgres`), ngoài giờ làm việc. Tác tử không chạy SQL trên cơ sở dữ liệu thật. Không ghi khóa, mật khẩu hay địa chỉ dự án vào thư mục này.

## Sao lưu trước khi chạy

Cần có bản sao lưu cơ sở dữ liệu gần nhất. Nếu dự án dùng gói trả phí, vào **Database › Backups** và kiểm có bản sao lưu gần nhất; nếu không, nhờ IT sao lưu (`pg_dump`) trước. 0001 chỉ đổi quyền, không đổi dữ liệu, và có tệp hoàn tác; 0002 tự chép dòng `zns_config` sang dòng sao lưu trước khi sửa. Ghi giờ sao lưu vào cột "Sao lưu lúc" của sổ theo dõi ở cuối trang.

## Dùng SQL editor

- Dán truy vấn vào ô soạn, **bôi đen đúng một truy vấn** rồi bấm **Run**. Nếu để nhiều truy vấn rồi bấm Run, có thể chỉ thấy kết quả của truy vấn cuối.
- Các truy vấn kiểm tra trong sổ tay này chỉ in `true`/`false` hoặc tên bảng, không in bí mật. **Không sao chép, xuất hay dán nội dung dòng `zns_config` (hoặc dòng sao lưu của nó) ở bất cứ đâu** — dòng đó chứa khóa bí mật.

## Ba loại bảng (để đọc kết quả kiểm tra)

- **Bảng nghiệp vụ và nhật ký** (0001 chỉ thu quyền *xóa*): `customers`, `quotations`, `contracts`, `payments`, `deliveries`, `audit_logs`.
- **Các bảng chỉ máy chủ ghi** (0001 thu mọi quyền *ghi*, trình duyệt chỉ còn đọc): `zns_messages`, `counters`, `zns_callbacks`, `zns_dead_letters`, `workflow_events`, `telegram_sent_log`, `job_heartbeats`, `system_locks`, `idempotency_keys`, `metrics_rollup`, `cross_entity_sync_jobs`.
- **Bảng trình duyệt còn ghi và xóa** (0001 không đụng, để tới đợt bảo mật sau): `users`, `settings`, `zns_templates`, `notifications`, `drafts`, `presence`.

## Thứ tự và điều kiện

| Tệp | Làm gì | Chạy khi | Hoàn tác |
|---|---|---|---|
| `0001_b0c_cam_xoa_cung_khoa_cong_khai.sql` | Khóa công khai (`anon`, `authenticated`) không còn **xóa** được bảng nghiệp vụ, nhật ký, tin ZNS, bộ đếm; không còn **ghi** được các bảng chỉ máy chủ ghi; hai hàm dọn dẹp/hạn mức chỉ máy chủ gọi được | Sau khi: (a) Sao lưu; (b) chạy `0001_…precheck.sql` và xử lý bảng lạ; (c) Render › Environment có `SUPABASE_SERVICE_ROLE_KEY` (máy chủ chạy bằng khóa công khai sẽ mất mọi lệnh ghi) | `0001_…rollback.sql` |
| `0002_don_zns_config_long.sql` | Bỏ lớp cấu hình Zalo cũ bị lồng trong `settings/zns_config`, có bản sao `zns_config__bak_0002` | Sau khi bản có danh sách ô cho phép của trang Vendor & Webhook đã lên máy chủ và "Kiểm tra kết nối → Lưu" nghiệm thu xong; **trước** khi đổi khóa Zalo (B6) | `0002_…rollback.sql` |

## Cách chạy 0001 (từng bước)

1. **Sao lưu** như mục trên.
2. Mở `0001_b0c_cam_xoa_cung_khoa_cong_khai.precheck.sql` (chỉ đọc), chạy **từng truy vấn một**:
   - Truy vấn 1 phải **trống** ("Success. No rows returned"). Nếu ra bảng nào (ví dụ `gatebypasses`, `clienterrors`), gửi tên bảng cho người soạn để phân loại và bổ sung vào 0001 trước; **không** chạy 0001 khi còn bảng lạ.
   - Truy vấn 2–4: dán kết quả vào báo cáo cổng mục 8.6 (không có bí mật).
3. Xác nhận không có tự động hóa ngoài (Make/n8n/Zapier, bot Telegram, script chạy tay) đang ghi `zns_messages`/`counters`… hoặc xóa chứng từ bằng khóa công khai.
4. Dán toàn bộ `0001_b0c_cam_xoa_cung_khoa_cong_khai.sql` vào SQL editor, bôi đen tất cả (Ctrl+A) rồi bấm Run. Kết quả mong đợi: "Success. No rows returned".
5. **Kiểm ngay** — chạy hai truy vấn dưới đây (mỗi lần bôi đen đúng một truy vấn). Truy vấn quyền:
   ```sql
   select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
   from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon','authenticated')
   group by grantee, table_name
   order by table_name, grantee;
   ```
   Mỗi bảng hiện hai dòng (`anon` và `authenticated`); đọc cột `privs` (cột này có thể còn liệt kê `REFERENCES`, `TRIGGER` và `MAINTAIN` ở bản Postgres mới — bỏ qua các quyền đó):
   - 6 bảng nghiệp vụ và nhật ký: **không còn** `DELETE` và `TRUNCATE`; vẫn còn `INSERT`, `UPDATE`, `SELECT`;
   - 11 bảng chỉ máy chủ ghi: **không còn** `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`; vẫn còn `SELECT`;
   - 6 bảng trình duyệt còn ghi và xóa: giữ nguyên như trước (vẫn còn `DELETE`);
   - **mọi** bảng đều còn `SELECT`.

   Truy vấn hai hàm (chỉ máy chủ được chạy):
   ```sql
   select has_function_privilege('anon', 'public.cleanup_expired_system_data()', 'EXECUTE') as anon_cleanup,
          has_function_privilege('authenticated', 'public.cleanup_expired_system_data()', 'EXECUTE') as authenticated_cleanup,
          has_function_privilege('service_role', 'public.cleanup_expired_system_data()', 'EXECUTE') as service_cleanup,
          has_function_privilege('anon', 'public.decrement_zns_quota(integer)', 'EXECUTE') as anon_quota,
          has_function_privilege('authenticated', 'public.decrement_zns_quota(integer)', 'EXECUTE') as authenticated_quota,
          has_function_privilege('service_role', 'public.decrement_zns_quota(integer)', 'EXECUTE') as service_quota;
   ```
   Mong đợi một dòng, theo thứ tự cột: `false, false, true, false, false, true`.
6. **Thử bị từ chối** — chỉ chạy trong SQL editor, **từng dòng một** (bôi đen đúng một dòng rồi bấm Run). Mỗi dòng nằm trong một giao dịch tự hoàn tác (`begin; … rollback;`) và dùng id không tồn tại, nên không thể để lại gì. Thử với khóa công khai (`anon`):
   ```sql
   begin; set local role anon; delete from public.quotations where id = '__b0c_probe__'; rollback;
   begin; set local role anon; delete from public.payments where id = '__b0c_probe__'; rollback;
   begin; set local role anon; delete from public.audit_logs where id = '__b0c_probe__'; rollback;
   begin; set local role anon; insert into public.counters (id) values ('__b0c_probe__'); rollback;
   begin; set local role anon; update public.zns_messages set status = 'x' where id = '__b0c_probe__'; rollback;
   ```
   → mỗi dòng phải báo lỗi `permission denied for table …` (mã `42501`, tên bảng lần lượt là `quotations`, `payments`, `audit_logs`, `counters`, `zns_messages`). Báo lỗi này là **đạt**. **Nếu một dòng thử hiện "Success. No rows returned" thay vì lỗi `permission denied`, thì dòng đó không bị từ chối và 0001 chưa có hiệu lực — dừng lại, báo người soạn.** Nếu lần chạy kế tiếp báo `current transaction is aborted`, chạy riêng lệnh `rollback;` một lần rồi chạy lại.

   Lặp lại với `authenticated` (người đã đăng nhập), ví dụ:
   ```sql
   begin; set local role authenticated; delete from public.quotations where id = '__b0c_probe__'; rollback;
   ```
   rồi làm tương tự cho bốn dòng còn lại (chỉ đổi `anon` thành `authenticated`).
7. **Thử qua API bằng khóa công khai** — chạy trong **Windows PowerShell** và gõ `curl.exe` (trong PowerShell, `curl` là một lệnh khác). Lấy khóa `anon` ở Supabase › Settings › API ngay lúc chạy, thay vào `<KHÓA_ANON>`; thay `<project-ref>` bằng mã dự án; **không** ghi khóa hay mã dự án vào kho hay báo cáo.
   ```
   curl.exe -i -X DELETE "https://<project-ref>.supabase.co/rest/v1/quotations?id=eq.__b0c_probe__" -H "apikey: <KHÓA_ANON>" -H "Authorization: Bearer <KHÓA_ANON>"
   ```
   → mong đợi mã 401 (dòng đầu là `HTTP/1.1 401 Unauthorized` hoặc `HTTP/2 401`) và thân có `"code":"42501"` cùng `permission denied for table quotations` (trước khi chạy 0001, cùng lệnh trả mã 204). Vì sao là 401 chứ không phải 403: khóa công khai được tính là "chưa đăng nhập", nên hệ thống trả 401. Điều quyết định là phần thân có `"code":"42501"` và `permission denied for table …`. Nếu thân báo lỗi về khóa thay vì `42501`, kiểm lại khóa đã dán.
   ```
   curl.exe -i "https://<project-ref>.supabase.co/rest/v1/zns_messages?select=id&limit=1" -H "apikey: <KHÓA_ANON>" -H "Authorization: Bearer <KHÓA_ANON>"
   ```
   → mong đợi mã 200 (dòng đầu là `HTTP/1.1 200 OK` hoặc `HTTP/2 200`; đọc vẫn được). Khóa công khai vẫn còn thêm và sửa được dữ liệu ở các bảng nghiệp vụ (khách hàng, báo giá, hợp đồng, phiếu thu, phiếu giao) cho tới đợt bảo mật sau — đó là điều dự kiến, không phải lỗi, nên ở đây không thử.
8. **Kiểm trên ứng dụng** (bản đang chạy thật; mọi người đã tải lại các tab đang mở bằng Ctrl+F5 để dùng bản mới nhất). Làm lần lượt:
   - mở rồi đóng form sửa của một khách hàng, một báo giá, một hợp đồng, một phiếu thu, một phiếu giao (khóa chỉnh sửa — không cho hai người sửa cùng lúc — lấy và trả được; bảng Console của trình duyệt, phím F12, không có dòng "Failed to release lock");
   - lưu rồi xóa một bản nháp; đánh dấu đã đọc một thông báo;
   - tạo một khách thử (mã do máy chủ cấp; máy chủ ghi bộ đếm bằng khóa riêng của nó);
   - gửi **một** tin ZNS lẻ tới số nội bộ (máy chủ ghi `zns_messages`, thấy trong ZNS Hub);
   - xóa khách thử đó từ giao diện (máy chủ xóa hẳn);
   - Cài đặt › Người dùng và trang nhật ký mở được; một tab khác nhận báo giá mới không cần F5.

   **Lưu ý (lỗi đã biết, mã HT02):** "ghi chú hoạt động" thêm từ ngăn chi tiết **vẫn lỗi như trước**, vì ứng dụng gửi kèm cột `updated_at` mà bảng `audit_logs` không có nên cơ sở dữ liệu từ chối. Lỗi này có từ trước, **không do SQL này**, và chưa được sửa trong đợt này.
9. **Kiểm lại sau 24 giờ**: không có lỗi 42501 trong nhật ký máy chủ (Render › Logs, tìm `permission denied`); ZNS Hub vẫn có tin mới; số chứng từ vẫn cấp được.

## Hoàn tác 0001

Chạy `0001_b0c_cam_xoa_cung_khoa_cong_khai.rollback.sql` (cấp lại đúng các quyền đã thu). Nhân viên không thấy khác biệt. Sau đó vẫn chạy lại 0001 được; chạy lại nhiều lần vẫn an toàn.

**Kiểm sau khi hoàn tác:** chạy lại truy vấn quyền ở bước 5 của mục trên. `anon` và `authenticated` phải có lại `DELETE`, `INSERT`, `UPDATE` ở các bảng đã bị thu: 6 bảng nghiệp vụ và nhật ký có lại `DELETE`; 11 bảng chỉ máy chủ ghi có lại `INSERT`, `UPDATE`, `DELETE`. Truy vấn hai hàm phải trả `true` ở cả sáu cột.

## Cách chạy 0002

Chạy sau khi đủ điều kiện ở bảng trên và đã có bản sao lưu. Truy vấn kiểm tra dùng cho cả lúc trước và lúc sau (chỉ đọc, chỉ in `true`/`false`):

```sql
select id, (data ? 'data') as con_lop_long, (data ? 'id') as con_khoa_id, (data ? 'zaloRefreshToken') as co_ma_lam_moi
from public.settings where id in ('zns_config', 'zns_config__bak_0002') order by id;
```

1. **Sao lưu** như mục trên.
2. **Kiểm trước** (chỉ đọc): chạy truy vấn kiểm tra ở trên. Mong đợi: **chỉ một dòng** `zns_config` với `con_lop_long` = `true`. Nếu đã có dòng `zns_config__bak_0002`, hoặc không có dòng nào, hoặc `con_lop_long` là `false`: **dừng lại và hỏi người soạn**, không chạy tiếp.
3. Dán toàn bộ `0002_don_zns_config_long.sql` vào SQL editor, bôi đen tất cả (Ctrl+A) rồi bấm Run. Kết quả mong đợi: "Success. No rows returned".
4. **Kiểm sau**: chạy lại đúng truy vấn kiểm tra. Mong đợi **hai dòng**:
   - dòng `zns_config`: `con_lop_long` = `false`, `con_khoa_id` = `false`, `co_ma_lam_moi` = `true`;
   - dòng `zns_config__bak_0002`: `con_lop_long` = `true` (đây là bản gốc còn lớp lồng) và `co_ma_lam_moi` = `true` (`con_khoa_id` là `true` hay `false` đều không quan trọng).

   Khác các giá trị này thì đừng làm bước tiếp theo, báo người soạn.
5. Vào Cài đặt › Vendor & Webhook, bấm "Kiểm tra kết nối Zalo OpenAPI" rồi "Lưu toàn bộ cấu hình", gửi thử **1** tin ZNS lẻ tới số nội bộ.

**Chạy lại 0002 là an toàn:** nó giữ bản sao lưu đầu tiên (không ghi đè) và gỡ lớp lồng thêm một lần nữa.

### Hoàn tác 0002

Chạy `0002_don_zns_config_long.rollback.sql`. Hoàn tác chỉ **đưa lại lớp lồng cũ** (các khóa `data`, `id`, `updated_at`, `success` mà 0002 đã bỏ) và **giữ nguyên các khóa Zalo hiện tại** (mã Zalo mới và mọi chỉnh sửa sau khi chạy 0002), không thay các khóa đang dùng bằng khóa cũ (lớp lồng cũ được đưa lại vẫn chứa bí mật cũ, như trước khi chạy 0002).

**Kiểm sau khi hoàn tác:** chạy lại truy vấn kiểm tra; `zns_config` phải có `con_lop_long` = `true`. Nếu **không thấy dòng `zns_config__bak_0002`** trong kết quả thì hoàn tác chưa làm được gì: nếu dòng sao lưu đã được đổi tên thành `zns_config__bak_0002_cu` thì đổi tên ngược lại (câu lệnh ở mục "Dòng sao lưu" bên dưới) rồi chạy lại hoàn tác; nếu không còn dòng sao lưu nào, **dừng lại và báo người soạn — không tự khôi phục cả cơ sở dữ liệu** (làm vậy sẽ mất mọi dữ liệu đã nhập từ lúc sao lưu).

### Dòng sao lưu `zns_config__bak_0002`

Dòng này chứa bí mật cũ. Sau khi gửi thử 1 tin ZNS thành công và việc đổi khóa Zalo (B6) đã xong, nên **đổi tên** dòng thay vì xóa (khuyến nghị — dữ liệu vẫn còn):

```sql
update public.settings set id = 'zns_config__bak_0002_cu' where id = 'zns_config__bak_0002';
```

Chỉ khi chắc chắn không cần hoàn tác nữa mới **xóa** hẳn:

```sql
delete from public.settings where id = 'zns_config__bak_0002';
```

**Lưu ý:** sau khi dòng sao lưu bị xóa, 0002 **không thể hoàn tác bằng tệp hoàn tác nữa**. Đổi tên cũng làm tệp hoàn tác không tìm thấy dòng (nó chỉ tìm đúng tên `zns_config__bak_0002`); muốn dùng lại bản đã đổi tên thì đổi tên ngược lại:

```sql
update public.settings set id = 'zns_config__bak_0002' where id = 'zns_config__bak_0002_cu';
```

## Tập trước trên dự án tạm (khuyến nghị; chờ có cơ sở dữ liệu thử nghiệm riêng)

Tạo một dự án Supabase miễn phí, chạy `supabase_schema.sql`, rồi 0001, truy vấn kiểm tra, hoàn tác (rollback), 0001 lại (≈ 30 phút). Chưa có cơ sở dữ liệu thử nghiệm riêng nên lần chạy đầu trên dữ liệu thật vẫn là "sau khi sao lưu".

## Sổ theo dõi

| Tệp | Ngày chạy | Người chạy | Sao lưu lúc | Kết quả kiểm chứng (dán vào báo cáo cổng mục 8.6) |
|---|---|---|---|---|
| 0001 | (chưa) | | | |
| 0002 | (chưa) | | | |
