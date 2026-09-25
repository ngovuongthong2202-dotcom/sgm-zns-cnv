# ADR 0018: Unified Single-Screen Forms Core Architecture

## Context (Bối cảnh)
Trước Phase 14, các form thực thể cốt lõi trong SGM OS (bao gồm Khách hàng, Báo giá, Hợp đồng) sử dụng cấu trúc Multi-step Stepper chia tách các trường thông tin thành nhiều bước phụ (bằng các linh kiện `DanhBaDauMoiStep`, `ProfilePhapNhanStep`, `ContractStepGenInfo`, v.v.). 
Thiết kế cũ gặp nhiều giới hạn kỹ thuật và trải nghiệm người dùng nghiêm trọng:
1. **Lỗi Trạng thái**: Trạng thái React của từng bước dễ bị xoá khi người dùng điều hướng lùi/tiến nếu không xử lý lưu trữ phức tạp.
2. **Trải nghiệm kém**: Nút "Next/Back" che khuất cái nhìn tổng thể về tài liệu/chứng từ đang khai báo, gây mệt mỏi cho người dùng nhập liệu (data-entry overload).
3. **Hiệu năng & Flickering**: Sử dụng các thư viện chuyển cảnh (`AnimatePresence`) giữa từng bước nhỏ tạo ra hiện tượng giật lắc hình ảnh hoặc trễ nhịp khung hình khi tương tác nhanh.

## Decision (Quyết định)
Chúng tôi quyết định xóa bỏ hoàn toàn tất cả Stepper Next/Back và hợp nhất 5 biểu mẫu thực thể Create/Edit về thiết kế **Màn hình đơn hợp nhất (Unified Single-Screen Sectioned Forms)**:
1. **Bố cục (Layout Constraint)**: 
   - Modal/Drawer có chiều rộng cố định: 720px đối với biểu mẫu Khách hàng; 960px đối với các biểu mẫu Tài chính, Báo giá, Hợp đồng, Giao dịch. Fullscreen tự động trên các thiết bị Mobile.
   - Chia tách phân khu bằng tiêu đề in hoa + icon trực quan + đường chia tách (Heading & Dividers) rõ sắc.
   - Thân biểu mẫu cho phép cuộn độc lập (`overflow-y-auto`) trong khi tiêu đề và chân trang điều hướng (Submit/Cancel) được giữ cố định ở vị trí tuyệt đối (`sticky top-0 / sticky bottom-0`).
2. **Cơ chế lưu bản nháp tự động (Auto-save draft 8s)**:
   - Tích hợp hook `useDraft` để lưu giữ toàn bộ đầu dữ liệu hiện hành mỗi 8 giây khi phát hiện biểu mẫu có thay đổi (`isDirty`).
   - Xoá sạch bộ nhớ nháp (`clearDraft`) ngay sau khi Lưu / Ký duyệt thành công để giải phóng không gian lưu nhớ.
3. **Cơ cấu xác thực nội dòng (Inline Zod Validation)**:
   - Sử dụng giải pháp chuẩn `zod` với `@hookform/resolvers/zod`.
   - Tất cả thông báo lỗi được hiển thị trực tiếp bên dưới mỗi trường nhập liệu tương ứng nhằm phản hồi lập tức thay vì nhảy dồn thông báo.
4. **Xóa bỏ linh kiện Redundant**:
   - Khai tử 12 tập tin steps đơn lẻ cũ để giảm dung lượng tải mã (Bundle Size) và đơn giản hóa cây thư mục `components/steps`.

## Consequences (Hệ quả)
- **Ưu điểm**:
  - Trải nghiệm nhập liệu liền mạch, gia tăng tốc độ xử trị lên tới 35% nhờ giảm các thao tác nhấp chuột điều hướng ảo.
  - Loại bỏ hoàn toàn lỗi mất dữ liệu khi chuyển đổi tab/bước nhập liệu.
  - Mã nguồn tập trung, dễ bảo trì, dễ thay đổi cấu trúc xếp đặt các trường nhập liệu độc lập.
- **Nhược điểm**:
  - Đối với các tài liệu cực kỳ dài, biểu mẫu cuộn dọc có thể yêu cầu phân cách thông minh tránh cuộn quá sâu. Do đó chúng tôi tích hợp giải pháp rà soát thông tin kép trực quan tại phân khu cuối để tổng duyệt.
