# ADR 0008: Config-Driven Template Engine cho ZNS

## Context
Gửi ZNS cần map dữ liệu nội bộ (ví dụ: `Contract`) sang format Zalo mong muốn (`ZaloTemplateData`). 
Ngày trước, việc mapping bị hardcode cứng, mỗi template id hardcode một bộ quy đổi, rất dễ vỡ và phải deploy lại khi sale mua thêm template hoặc sửa template mẫu.

## Decision
Áp dụng cơ chế **Config-Driven Template Engine**:
1. Single Source of Truth cho metadata của các field là `zod-field-extractor` kết hợp với Schema (type-safe).
2. Xây dựng Builder tách biệt: Đầu vào là Source Data, đầu ra là Map field-value; sau đó Template Renderer lấy config template để nhặt fields cần thiết và chuyển Zalo.
3. Giao diện (ZNS Hub) cung cấp công cụ Map-to-ZNS (kênh kéo-thả hoặc dropdown) lưu cấu hình (field path -> zns payload key) xuống Firestore (`znsTemplates`).
4. Dual-write/Reversible: Vẫn lưu toàn bộ oldValues/newValues xuống DB để Debug và Retry.

## Consequences
- **Positive:** Mọi chỉnh sửa template, map field đều làm bên UI không cần chạm code.
- **Negative:** Payload build phức tạp hơn, có nguy cơ parse lỗi nếu schema thay đổi (cần snapshot test chặn regression).
