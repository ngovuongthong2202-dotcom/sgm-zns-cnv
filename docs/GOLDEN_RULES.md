# The Golden Rules of SGM OS Development

1. **NO UI MOCK DATA**: Never use placeholder data for integrations, implement real API connections.
2. **IDEMPOTENCY IS MANDATORY**: Cron jobs, webhooks, and migrations must be safe to run twice.
3. **ZOD IS LAW**: If you need an interface, define it via `z.infer` from a Zod schema.
4. **NO PARALLEL ARRAYS OR DESTRUCTURING MESS**: Rely on strong typing and named attributes. Write maps cleanly.
5. **CONFIG DRIVEN OVER HARDCODED**: Keep complex translation and routing logic in configs or DB (e.g., Template Engine).
6. **INCREMENTAL MIGRATION**: Never drop tables or columns immediately. Migrate data to new schema, update all readers to support both, then update writers, lastly drop old field.
7. **NO TOASTING BUSINESS LOGIC**: Never use UI toast components to simulate backend processes. Do the real operation.
8. **LAZY EVERYTHING**: Split massive chunks using `React.lazy()` per Feature Route.
9. **OBSERVE PERFORMANCE**: Virtualize any list > 100 items (TanStack Virtual). Debounce heavy inputs (Search).  
10. **SINGLE WRITER PRINCIPLE**: The UI triggers the intent. The backend does the critical writes. Avoid complex client-side distributed writes.

(Added in Phase 6)
20. **TÔN TRỌNG TÊN MIỀN BÀI TOÁN**: Đừng xóa field hay column chỉ vì code "gọn". Các trường price/giaTriHopDong phục vụ báo cáo.
21. **TEST GOLDEN MASTER**: Payload engine và template changes require snapshot checks. 
22. **CẤM REGRESSION**: Mọi update phải duy trì Vitest xanh 100%. Type checks (`tsc`) 0 errors.
23. **XÓA CHI TRÚNG ĐÍCH**: Dọn mã thừa (import page, obsolete scripts) đảm bảo grep không sót reference.
24. **SECURE BY DEFAULT**: Firestore security rules phải validate the incoming request, always use composite indexes for complex filtering.
25. **DEPLOY CONFIDENCE**: Build size must be audited. Any changes to CI/CD require strict delta reporting.

(Added in Phase 7)
26. **SINGLE SOURCE OF TRUTH CHO MÀU SẮC**: Cấm dùng `purple`, `violet`, `fuchsia`, vv. Chỉ dùng màu trong Palette chuẩn (`blue`, `sky`, `emerald`, `amber`, `red`, `slate`).
27. **HOOKS CONSOLIDATION**: Dùng chung các core data hooks (ví dụ: `useFirestoreData`), tránh lặp code lấy dữ liệu trong mỗi domain.
28. **SERVER-SIDE AGGREGATION**: Mọi report/dashboard phải gọi từ Materialized views qua backend cron rollup, không map/reduce hàng nghìn docs bên phía Client.
29. **SOFT GATE WORKFLOW**: Workflow Engine cho phép exception (với audit log) thay vì hard-block mọi thao tác không chuẩn.
30. **ACCESSIBILITY LÀ BẮT BUỘC**: Đảm bảo Lighthouse A11y ≥ 95, mọi ảnh có `alt`, mọi button icon có `aria-label`.
