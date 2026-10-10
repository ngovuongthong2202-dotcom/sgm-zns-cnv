/**
 * Giới hạn nạp danh sách phía trình duyệt (Đợt 0A – lô 2; bản tạm cho tới khi có phân trang/tổng hợp phía máy chủ).
 * PostgREST cắt mọi truy vấn ở 1000 dòng, nên cửa sổ lõi phải nạp theo trang bằng .range() thay vì .limit(n > 1000).
 * Có thể hạ trần khi nghiệm thu trên dữ liệu thật (PowerShell): $env:VITE_CORE_PAGE_SIZE='50'; $env:VITE_CORE_HARD_CAP='100'; npm run dev
 * LƯU Ý: viết tên biến thành thuộc tính tĩnh ngay sau `import.meta.env` — đúng dạng `import.meta.env?.VITE_…` bên dưới
 * (cho phép `?.`; giống src/shared/config/supabase.client.ts:6, đang chạy thật) để Vite thay từng biến bằng hằng số lúc dựng.
 * KHÔNG dùng khóa tính toán `import.meta.env[key]`: Vite không thay từng biến mà chỉ nhúng cả đối tượng env vào gói.
 */
function readEnvInt(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
/** Làm tròn LÊN bội số của cỡ trang để trần luôn là số nguyên trang (không phụ thuộc giá trị người dùng đặt). */
function roundUpToPage(n: number, page: number): number {
  return Math.ceil(n / page) * page;
}

export const POSTGREST_MAX_ROWS = 1000;
export const CORE_PAGE_SIZE = Math.min(readEnvInt(import.meta.env?.VITE_CORE_PAGE_SIZE, 1000), POSTGREST_MAX_ROWS);
export const CORE_HARD_CAP = roundUpToPage(Math.max(CORE_PAGE_SIZE, readEnvInt(import.meta.env?.VITE_CORE_HARD_CAP, 2000)), CORE_PAGE_SIZE);
export const CORE_ABSOLUTE_CEILING = roundUpToPage(Math.max(CORE_HARD_CAP, readEnvInt(import.meta.env?.VITE_CORE_ABSOLUTE_CEILING, 5000)), CORE_PAGE_SIZE);
/** Ngưỡng cũ cho các bộ sưu tập ngoài nhóm lõi (zns_messages, notifications, …): không đổi ở lô này. */
export const DEFAULT_WINDOW_LIMIT = 500;

export const CORE_COLLECTIONS = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'] as const;
export type CoreCollection = (typeof CORE_COLLECTIONS)[number];

export function isCoreCollection(name: string): name is CoreCollection {
  return (CORE_COLLECTIONS as readonly string[]).includes(name);
}
