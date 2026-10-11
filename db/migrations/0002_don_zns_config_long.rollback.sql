-- Hoàn tác 0002: đưa lại các khóa mà 0002 đã bỏ khỏi zns_config (lớp lồng `data`, `id`, `updated_at`, `success`) từ dòng sao lưu zns_config__bak_0002.
-- Hợp nhất `b.data || s.data`: khóa nào hiện đang có trong zns_config thì GIỮ giá trị hiện tại (vế phải thắng), nên mã làm mới/mã truy cập Zalo mới
-- và mọi chỉnh sửa sau khi chạy 0002 KHÔNG bị ghi đè bằng giá trị cũ trong bản sao lưu; chỉ các khóa đang vắng mới được lấy lại từ bản sao lưu.
-- Không xóa dòng nào. Nếu dòng zns_config__bak_0002 không còn thì câu lệnh không làm gì (0 dòng): nếu dòng đã được đổi tên thành zns_config__bak_0002_cu thì đổi tên ngược lại rồi chạy lại; nếu không còn dòng sao lưu nào thì dừng lại và báo người soạn (không tự khôi phục cả CSDL).
BEGIN;
UPDATE public.settings AS s
   SET data = b.data || s.data, updated_at = NOW()
  FROM public.settings AS b
 WHERE s.id = 'zns_config' AND b.id = 'zns_config__bak_0002';
COMMIT;
