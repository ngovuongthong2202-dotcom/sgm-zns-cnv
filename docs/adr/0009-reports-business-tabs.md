# ADR 0009: Business-Centric Reporting Tabs

## Context
Các module báo cáo thường bị làm thành các Data Grid khổng lồ, query mệt mỏi và không đúng với "Flow của CEO". CEO muốn xem Insight tổng quan, biểu đồ xu hướng, dự báo, thay vì chỉ là filter data thô.

## Decision
Áp dụng phân tích dữ liệu theo chiều dọc (Business-Centric):
- Tách báo cáo thành nhiều Tab rõ rệt, mỗi Tab phục vụ 1 Insight or 1 Pipeline (VD: Insight, Doanh thu (VAT/Vật tư), ZNS Funnel, Report theo Khoản Chi).
- Cache Aggregations và Push down Filter xuống Data Store hoặc lưu ở Memory (Memory DataViews Engine).
- Tận dụng `DataView` component làm nền móng (có virtualize) kết hợp với các `MicroChart`.

## Consequences
- **Positive:** Cung cấp thông số tức thì cho CEO, thể hiện đúng metrics kinh doanh cần thiết. Code UI dễ bảo trì hơn từng Tab 1.
- **Negative:** Đánh đổi Memory ở Client do fetch nhiều dữ liệu cùng lúc, bù lại Firebase Realtime onSnapshot đã caching khá tốt ở local state. Cần kiểm soát bundle size và memory leak bằng `React.lazy`.
