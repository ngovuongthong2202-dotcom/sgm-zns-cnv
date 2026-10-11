-- Hoàn tác 0002: chép lại data của zns_config từ dòng sao lưu. Không xóa dòng nào.
BEGIN;
UPDATE public.settings AS s
   SET data = b.data, updated_at = NOW()
  FROM public.settings AS b
 WHERE s.id = 'zns_config' AND b.id = 'zns_config__bak_0002';
COMMIT;
