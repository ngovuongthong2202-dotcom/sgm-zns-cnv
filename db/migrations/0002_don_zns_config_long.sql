-- Đợt 0A – việc 0A.1/Z0.3 (ZNS05 dọn dữ liệu). Chạy SAU KHI bản có danh sách ô cho phép của POST /api/zns/config đã lên máy chủ
-- và "Kiểm tra kết nối → Lưu" đã nghiệm thu; TRƯỚC B6 (đổi khóa Zalo). Sao lưu toàn bộ CSDL trước khi chạy.
-- Vấn đề: mỗi lần lưu trang Vendor & Webhook cũ, shim DocRef.get trải cột của dòng lên jsonb nên khóa `data` (cả bản cấu hình cũ
-- kèm bí mật), `id`, `updated_at` bị ghi lồng vào settings.data của zns_config; dữ liệu thật đã có ít nhất một lớp lồng.
-- Cách làm: (1) chép nguyên dòng zns_config sang dòng zns_config__bak_0002 (nguồn hoàn tác; giữ bản sao lưu đầu tiên; chạy lại không ghi đè); (2) bỏ các khóa đi vòng.
BEGIN;
INSERT INTO public.settings (id, data, updated_at)
SELECT 'zns_config__bak_0002', data, NOW() FROM public.settings WHERE id = 'zns_config'
ON CONFLICT (id) DO NOTHING;
UPDATE public.settings
   SET data = data - 'data' - 'id' - 'updated_at' - 'success', updated_at = NOW()
 WHERE id = 'zns_config';
COMMIT;
-- KIỂM CHỨNG (không có bí mật trong kết quả; README có bản chạy sẵn). Chạy TRƯỚC 0002 (chỉ đọc) và SAU 0002:
-- select id, (data ? 'data') as con_lop_long, (data ? 'id') as con_khoa_id, (data ? 'zaloRefreshToken') as co_ma_lam_moi
--   from public.settings where id in ('zns_config', 'zns_config__bak_0002') order by id;
-- Trước: chỉ một dòng zns_config với con_lop_long = true (nếu đã có dòng zns_config__bak_0002 thì DỪNG và hỏi người soạn).
-- Sau (2 dòng): zns_config: con_lop_long false, con_khoa_id false, co_ma_lam_moi true;
--   zns_config__bak_0002: con_lop_long true (bản gốc còn lớp lồng), co_ma_lam_moi true.
-- Chạy lại 0002 an toàn: giữ bản sao lưu đầu tiên (không ghi đè) và gỡ lớp lồng thêm lần nữa.
-- Hoàn tác: 0002_don_zns_config_long.rollback.sql — chỉ đưa lại lớp lồng cũ, giữ nguyên các khóa Zalo hiện tại.
-- Sau khi gửi thử 1 tin ZNS thành công và việc đổi khóa Zalo (B6) xong: nên ĐỔI TÊN dòng sao lưu (xem README) thay vì xóa; chỉ xóa khi chắc chắn,
--   vì xóa rồi thì không hoàn tác 0002 bằng tệp hoàn tác được nữa. Không sao chép/xuất nội dung dòng zns_config hay dòng sao lưu (chứa bí mật).
