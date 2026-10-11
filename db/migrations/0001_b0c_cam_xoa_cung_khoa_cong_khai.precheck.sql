-- Kiểm tra TRƯỚC khi chạy 0001 (chỉ đọc). Chạy trong Supabase SQL editor; dán kết quả (không có bí mật) vào báo cáo cổng mục 8.6.
-- 1) Bảng thật ngoài 23 bảng của supabase_schema.sql (ví dụ gatebypasses, clienterrors): PHẢI phân nhóm và bổ sung vào 0001 trước khi chạy.
select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
  and table_name not in ('customers','quotations','contracts','payments','deliveries','users','settings','zns_messages',
    'zns_templates','zns_callbacks','zns_dead_letters','workflow_events','audit_logs','notifications','drafts','presence',
    'telegram_sent_log','counters','job_heartbeats','system_locks','idempotency_keys','metrics_rollup','cross_entity_sync_jobs')
order by table_name;
-- 2) Quyền hiện tại của anon/authenticated (mong đợi trước khi chạy: đủ DELETE, INSERT, UPDATE, SELECT vì Supabase cấp ALL mặc định)
select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
group by grantee, table_name
order by table_name, grantee;
-- 3) Quyền chạy hai hàm (mong đợi trước khi chạy: true, true)
select has_function_privilege('anon', 'public.cleanup_expired_system_data()', 'EXECUTE') as anon_cleanup,
       has_function_privilege('anon', 'public.decrement_zns_quota(integer)', 'EXECUTE') as anon_quota;
-- 4) Dòng khóa chỉnh sửa và các khóa cấu hình nằm trong settings (lý do nhóm C giữ nguyên quyền)
select id, updated_at from public.settings order by updated_at desc limit 50;
