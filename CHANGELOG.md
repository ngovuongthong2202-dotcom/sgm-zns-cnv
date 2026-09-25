# Changelog

## [3.1.3] - Hotfix: CNV Webhook Mapping Compat

### Fixed
- **CNV ZNS Block Validation**: Mapped required variables directly back into their original Vietnamese spreadsheet column headers (e.g. `Tên khách hàng`, `Số điện thoại`, `Số phiếu báo giá`...) in the outbound payload exactly. Điều này khắc phục lỗi `Response code: -1122 | Message: template data is missing a parameter customer_name` do Webhook flow trên CNV (base từ Google Sheets) không map được dữ liệu.

## [3.1.2] - ZNS Clean Payload & Pre-flight Checklist

### Added
- **Frontend Pre-flight Check**: FE chặn gửi sớm (block before backend call) qua toast UI nếu document thiếu thông tin bắt buộc theo quy định Zalo (VD: `customer_name`, `phone`).
- **Backend Builder Validation**: Cấu hình strict ZALO_REQUIRED_VARS chặn gửi với các biến required không được để rỗng (throw errors, ghi log FAILED ZNS chính xác do lỗi thiếu trường).
- Fallback chain chuẩn cho `resolveRelatedEntity`: (1) self snapshot -> (2) related entity lookup -> (3) explicit mapped fallback -> (4) empty.
- Script tự động re-seed `sourceEntity` sang `SELF` cho toàn bộ template chuẩn, tận dụng snapshot gốc thay vì query lồng, tránh N+1.

### Fixed
- **Remove Dead-fields**: FE đã xóa biến camelCase mock giả `customerName`, `customerPhone` bị gửi lạc danh vào payload gốc, bảo đảm Single Source of Truth snapshot duy nhất.
- Triệt để chặn gửi thiếu `customer_name` qua API Zalo (loại bỏ lỗi `-1122` ngầm).

## [3.1.1] - Template Truthful Mode

### Added
- **Template Truthful Mode**: Builder và Renderer giờ đây hoạt động ở chế độ Null-Preserving tuyệt đối. (Khắc phục ADR 0008). 
- **Strict Mode Toggle**: Tuỳ chọn block việc gửi ZNS nếu payload thiếu các biến bắt buộc định nghĩa trong template config (kèm UI cảnh báo rõ ràng).
- **Settings UI**: Thêm tab Preview Payload trong Cài đặt Mẫu Tin Nhắn để kiểm tra mapping thật trước khi gửi, hiển thị diff cho Version History.
- Tính năng Single Source of Truth cho template config: không có bất kỳ logic transform nghiệp vụ ngầm (No "magic spray") hay hardcoded bypass. Hệ thống chỉ lấy giá trị cấu hình do Admin setup.

### Fixed
- Fixed lỗi tự động điền `01/01/1970` hoặc `-` khi format date trường hợp giá trị bị rỗng.
- Xoá hoàn toàn fallback fallback nhét value mang ý nghĩa nghiệp vụ (hardcode "NV", "Máy 1", "Khách hàng"). Payload gửi qua CNV vendor chỉ bao gồm chính xác các biến do Config Server Renderer truyền xuống.
- Smoke cases 100% Passed. Đảm bảo No Regression cho các luồng đã có (Vitest & Cypress/Playwright).

## [7.0.0] - Phase 7G

### Added
- **Design System Polish**: Centralized color tokens, banned off-brand colors (`purple`, `violet`, etc). Enforced via CI. (ADR 0011)
- **Data Fetching Hooks**: Consolidated data fetching to reduce bundle size and improve caching. (ADR 0012)
- **Metrics Rollup Engine**: Added server-side cron aggregations to drastically reduce Firestore reads on dashboard. (ADR 0013)
- **Soft Gate Policies**: Updated workflow machine to allow exceptions that trigger audit logs rather than hard-blocking sales agents. (ADR 0014)
- **System Settings**: Complete administrative UI for Users, Backups, Cron schedules, Vendor configurations, and Workflow Gates.
- **Architectural Documentation**: Added comprehensive architecture visual diagram (Mermaid) to `ARCHITECTURE.md`.
- **Golden Rules**: Established rules 26-30 around Phase 7's core architectural decisions.

### Changed
- Standardized DataView Engine across all core features (Customers, Quotations, Contracts, Deliveries, Payments).
- Re-architected state machines to follow `XState`-like patterns inside `WorkflowEventService`.
- Major ZNS API improvements: Supports DLQ retry, vendor webhooks, and rate-limiting.

### Fixed
- Huge performance fixes regarding Dashboard loads. Time to interactive is now < 1.5s.
- Cleaned up obsolete utility scripts, unneeded templates, and unused configuration files.
- Addressed Axe accessibility violations (ARIA labels on icon buttons).

---
## Previous Phases
*(This project evolved rapidly through Phases 1-6 building the initial schema, FireStore connections, DataView Engine, and ZNS templating. See Git history for granular commits.)*
