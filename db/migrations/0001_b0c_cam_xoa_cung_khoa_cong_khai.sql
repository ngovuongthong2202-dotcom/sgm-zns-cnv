-- Đợt 0A – việc 0A.2 (B0c; mã CSDL01, K-SEC-1 một phần). Soạn theo 23 bảng của supabase_schema.sql tại main 59919be.
-- Mục đích: khóa công khai (vai anon và authenticated) KHÔNG còn xóa cứng được bảng nghiệp vụ, nhật ký, tin ZNS, bộ đếm;
--           và không còn ghi được các bảng mà trình duyệt chỉ đọc. KHÔNG đụng SELECT, KHÔNG đụng policy RLS, KHÔNG đụng service_role.
-- Chạy: Supabase SQL editor (vai postgres), SAU KHI sao lưu toàn bộ CSDL, SAU KHI chạy tệp .precheck.sql và đối chiếu
--       Render › Environment có SUPABASE_SERVICE_ROLE_KEY (máy chủ chạy bằng khóa anon sẽ mất mọi lệnh ghi sau tệp này).
-- Hoàn tác: 0001_b0c_cam_xoa_cung_khoa_cong_khai.rollback.sql. REVOKE là bất biến khi chạy lại (idempotent).
-- Quy ước tệp: một câu lệnh một dòng, dạng "REVOKE … ON TABLE public.<bảng> FROM <vai>;" để kiểm thử tĩnh đọc được
--              (src/tests/db-migrations/b0c-cam-xoa-cung.spec.ts).
BEGIN;
-- Nhóm A: trình duyệt còn upsert (INSERT+UPDATE giữ) – chỉ thu quyền xóa
REVOKE DELETE, TRUNCATE ON TABLE public.customers FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON TABLE public.quotations FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON TABLE public.contracts FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON TABLE public.payments FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON TABLE public.deliveries FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON TABLE public.audit_logs FROM anon, authenticated;
-- Nhóm B: trình duyệt chỉ đọc – thu mọi quyền ghi (SELECT giữ cho ZNS Hub, nhật ký, dòng thời gian)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.zns_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.counters FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.zns_callbacks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.zns_dead_letters FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.workflow_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.telegram_sent_log FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.job_heartbeats FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.system_locks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.idempotency_keys FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.metrics_rollup FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.cross_entity_sync_jobs FROM anon, authenticated;
-- Nhóm C (users, settings, zns_templates, notifications, drafts, presence): KHÔNG đụng – trình duyệt còn ghi/xóa (dòng khóa chỉnh sửa trong settings) tới B3/B4a.
-- Hàm: trình duyệt không gọi rpc; chỉ máy chủ (service_role) được chạy
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_system_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_system_data() TO service_role;
REVOKE EXECUTE ON FUNCTION public.decrement_zns_quota(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_zns_quota(integer) TO service_role;
COMMIT;
-- KIỂM CHỨNG: chạy ngay sau COMMIT và dán kết quả vào báo cáo cổng mục 8.6 (không có bí mật):
-- select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
--   from information_schema.role_table_grants
--  where table_schema = 'public' and grantee in ('anon','authenticated')
--  group by grantee, table_name order by table_name, grantee;
-- Mong đợi: DELETE/TRUNCATE chỉ còn ở nhóm C; INSERT/UPDATE vắng ở nhóm B; SELECT có ở mọi bảng.
-- select has_function_privilege('anon', 'public.cleanup_expired_system_data()', 'EXECUTE') as anon_cleanup,
--        has_function_privilege('service_role', 'public.cleanup_expired_system_data()', 'EXECUTE') as service_cleanup;
-- Mong đợi: false, true.
-- Thử bị từ chối (id không tồn tại nên không đụng dữ liệu; mỗi dòng nằm trong một giao dịch tự hoàn tác; chạy TỪNG DÒNG MỘT trong SQL editor;
--   nếu lần sau báo "current transaction is aborted", chạy riêng lệnh: rollback;):
-- begin; set local role anon; delete from public.quotations where id = '__b0c_probe__'; rollback;   -- ERROR: permission denied for table quotations
-- begin; set local role anon; insert into public.counters (id) values ('__b0c_probe__'); rollback; -- ERROR: permission denied for table counters
-- begin; set local role authenticated; update public.zns_messages set status = 'x' where id = '__b0c_probe__'; rollback; -- ERROR: permission denied for table zns_messages
