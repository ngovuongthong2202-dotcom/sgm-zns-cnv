// Chốt an toàn Đợt 0A: không worker kiểm thử nào được trỏ tới Supabase thật.
// Chạy trước mọi tệp spec (vitest.config.ts → setupFiles). Chỉ đọc process.env, không nhập module nào khác.
const URL_KEYS = ['VITE_SUPABASE_URL', 'SUPABASE_URL'] as const;

for (const key of URL_KEYS) {
  const value = String(process.env[key] || '');
  // Rộng ít nhất bằng điều kiện client dùng để kết nối thật: value.trim().startsWith('http') (ở đây thêm không phân biệt hoa thường).
  if (/^\s*http/i.test(value)) {
    throw new Error(
      `[offline-guard] ${key} đang trỏ tới "${value}". Bộ kiểm thử chỉ được chạy ở chế độ offline ` +
      '(xem test.env trong vitest.config.ts). Dừng để không ghi vào cơ sở dữ liệu thật.'
    );
  }
}

// Tệp là module chứ không phải script toàn cục: URL_KEYS không lọt ra phạm vi chung và offline-guard.spec.ts nạp lại được bằng import().
export {};
