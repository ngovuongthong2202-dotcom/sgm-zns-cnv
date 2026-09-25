# ADR 0010: System Refactor Strategy (Phase 6)

## Context
Hệ thống phát triển nhanh, gây đứt gãy kiến trúc, duplicate components, hardcode business logic, và bundle size tăng do thiếu lazy loading mảng lớn. Cần một đợt Refactor dứt điểm để làm nền cho các phase Multi-Tenant hoặc SaaS hoá.

## Decision
Chiến lược Refactor dựa trên các tính chất:
1. **Incremental:** Không đập đi xây lại 1 lần toàn bộ. Modulization từng module `src/features/*`.
2. **Reversible (Dual Write):** Mọi migration (VD: đổi String status sang Enum) đều chạy ngầm kịch bản patch để đảm bảo cũ mớ chạy song song 1 thời gian trước khi deprecate hẳn code cũ.
3. **Type-Safe Zod làm gốc:** Zod schema thay thế mọi interface tay.
4. **DataView & UI Design System:** Cô lập ~24 component core và dùng cho mọi Table/List view. Tích hợp TanStack Virtual + Table.

## Consequences
- Xoá xổ code thừa, tăng tính consistence, dễ onboard dev mới.
- Bắt buộc dev mới phải tuân theo Blueprint (`features/*`, `DataView`, `detail drawer`).
