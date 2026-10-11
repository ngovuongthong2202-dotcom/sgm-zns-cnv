import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Bẫy hồi quy tĩnh (Đợt 0A TT01): zns-payload.builder.ts không được lấy ghi chú nội bộ (p.ghiChu) làm ghi_chu.
// Kiểm tĩnh vì buildPayload cho mẫu 646935 cần bộ biến bắt buộc đầy đủ mới chạy được trong môi trường offline.
describe('zns-payload.builder – không đọc ghi chú nội bộ', () => {
  it('không còn dòng nào gán ghi_chu từ p.ghiChu', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'zns-payload.builder.ts'), 'utf8');
    const offending = src.split(/\r?\n/).map((line, i) => ({ line, no: i + 1 })).filter(({ line }) => /ghi_chu/.test(line) && /\bghiChu\b/.test(line));
    expect(offending).toEqual([]);
  });
});
