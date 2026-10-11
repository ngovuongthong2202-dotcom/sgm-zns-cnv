-- Đợt 0A – việc 0A.1/Z0.3 (ZNS05 dọn dữ liệu). Chạy SAU KHI bản có danh sách ô cho phép của POST /api/zns/config đã lên máy chủ
-- và "Kiểm tra kết nối → Lưu" đã nghiệm thu; TRƯỚC B6 (đổi khóa Zalo). Sao lưu toàn bộ CSDL trước khi chạy.
-- Vấn đề: mỗi lần lưu trang Vendor & Webhook cũ, shim DocRef.get trải cột của dòng lên jsonb nên khóa `data` (cả bản cấu hình cũ
-- kèm bí mật), `id`, `updated_at` bị ghi lồng vào settings.data của zns_config; dữ liệu thật đã có ít nhất một lớp lồng.
-- Cách làm: (1) chép nguyên dòng zns_config sang dòng zns_config__bak_0002 (nguồn hoàn tác); (2) bỏ các khóa đi vòng.
BEGIN;
INSERT INTO public.settings (id, data, updated_at)
SELECT 'zns_config__bak_0002', data, NOW() FROM public.settings WHERE id = 'zns_config'
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
UPDATE public.settings
   SET data = data - 'data' - 'id' - 'updated_at' - 'success', updated_at = NOW()
 WHERE id = 'zns_config';
COMMIT;
-- KIỂM CHỨNG (không có bí mật trong kết quả):
-- select id, (data ? 'data') as con_lop_long, (data ? 'id') as con_khoa_id, (data ? 'zaloRefreshToken') as co_ma_lam_moi
--   from public.settings where id in ('zns_config', 'zns_config__bak_0002') order by id;
-- Mong đợi: zns_config: false, false, true; zns_config__bak_0002: true (hoặc như trước), …
-- Sau khi gửi thử 1 tin ZNS thành công và B6 xong, có thể xóa dòng sao lưu bằng tay (không nằm trong tệp này).
