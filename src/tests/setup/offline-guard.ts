// Chốt an toàn Đợt 0A: không worker kiểm thử nào được trỏ tới Supabase thật.
// Chạy trước mọi tệp spec (vitest.config.ts → setupFiles). Chỉ đọc process.env, không nhập module nào khác.
const URL_KEYS = ['VITE_SUPABASE_URL', 'SUPABASE_URL'] as const;

for (const key of URL_KEYS) {
  const value = String(process.env[key] || '');
  if (/^https?:\/\//i.test(value)) {
    throw new Error(
      `[offline-guard] ${key} đang trỏ tới "${value}". Bộ kiểm thử chỉ được chạy ở chế độ offline ` +
      '(xem test.env trong vitest.config.ts). Dừng để không ghi vào cơ sở dữ liệu thật.'
    );
  }
}
