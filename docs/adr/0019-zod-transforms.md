# ADR 0019: Zod Transforms for Data Hygiene (Chống Copy-Paste lỗi)

## Bối cảnh
Người dùng thường xuyên copy-paste dữ liệu (Tên KH, Địa chỉ, Người đại diện) từ Zalo, Excel, hoặc các văn bản khác gây ra tình trạng thừa khoảng trắng (space đầu/cuối), ký tự rác ẩn, và sai lệch chuẩn viết hoa. Điều này dẫn đến data bẩn cho AI và báo cáo.

## Quyết định & Giải pháp
1. **Thiết lập Centralized Zod Transforms**: 
   - Tạo file `src/shared/utils/zod-transforms.ts`.
   - Các utility transform: `zProperString` (viết hoa Proper Case, xoá khoảng trắng), `zPhoneString` (định dạng SĐT chuẩn), `zSafeString` (chỉ xoá space & ký tự rác, giữ nguyên Case dùng cho email/ghi chú).
2. **Nguyên tắc "On-Input Normalization"**:
   - Tất cả các trường text quan trọng trong schema Zod (vd. `customer.schema.ts`, `contract.schema.ts`) PHẢI sử dụng schema block này. 
   - `cleanProperVietnameseText()` được gọi ngầm khi run `z.parse()` hoặc `z.safeParse()` trên form submit, đảm bảo mọi value đưa vào firestore là chuẩn mực.

## Ví dụ sử dụng
\`\`\`ts
import { z } from 'zod';
import { zProperString, zPhoneString, zSafeString } from '../utils/zod-transforms';

export const customerSchema = z.object({
  tenKhachHang: zProperString.min(1, 'Tên KH không được trống'),
  sdt: zPhoneString,
  ghiChu: zSafeString.optional(),
});
\`\`\`

## Hệ quả
- Dữ liệu luôn sạch trước khi lưu.
- Giảm tải cho các cron job chuẩn hóa.
- Form validation tự động sửa lỗi người dùng mà không cần popup phiền phức.
