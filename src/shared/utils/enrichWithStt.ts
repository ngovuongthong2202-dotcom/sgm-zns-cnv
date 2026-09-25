import React from 'react';
import { ColumnDef } from '@tanstack/react-table';

/**
 * Utility đánh số thứ tự (STT) tự động tăng dần theo thời gian tạo (1..N).
 * Khi sắp xếp theo STT giảm dần (desc), dữ liệu mới nhất (STT cao nhất) luôn nằm trên cùng.
 */
export function enrichWithStt<T extends Record<string, any>>(items: T[]): (T & { stt: number })[] {
  if (!items || items.length === 0) return [];

  // Tạo bản sao sắp xếp theo thời gian tạo tăng dần (cũ nhất đến mới nhất) để đánh STT 1..N
  const indexed = items.map((item, originalIndex) => {
    const rawTime = item.createdAt || item.ngayTao || item.ngayKy || item.ngayBaoGia || item.ngayThanhToan || item.ngayGiaoMay || item.ngayCapNhat || 0;
    const time = new Date(rawTime).getTime() || 0;
    return {
      originalIndex,
      time,
      id: String(item.id || item.code || item.maKh || originalIndex),
      stt: typeof item.stt === 'number' && item.stt > 0 ? item.stt : undefined
    };
  });

  // Sort asc by time
  indexed.sort((a, b) => {
    if (a.stt !== undefined && b.stt !== undefined) return a.stt - b.stt;
    if (a.time !== b.time) return a.time - b.time;
    return a.id.localeCompare(b.id);
  });

  const sttMap = new Map<number, number>();
  indexed.forEach((entry, idx) => {
    sttMap.set(entry.originalIndex, entry.stt !== undefined ? entry.stt : (idx + 1));
  });

  return items.map((item, originalIndex) => ({
    ...item,
    stt: sttMap.get(originalIndex) || (originalIndex + 1)
  }));
}

/**
 * Định nghĩa cột STT nằm ở vị trí đầu tiên của bảng Dataview.
 */
export function createSttColumn<T = any>(): ColumnDef<T, any> {
  return {
    id: 'stt',
    accessorFn: (row: any) => row.stt,
    header: () => React.createElement('div', { className: 'text-center w-full font-bold' }, 'STT'),
    size: 60,
    enableSorting: true,
    cell: (info: any) => {
      const val = info.getValue() as number;
      return React.createElement(
        'div',
        { className: 'w-full text-center' },
        React.createElement(
          'span',
          { className: 'font-mono text-2xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200' },
          val !== undefined && val !== null ? val : (info.row.index + 1)
        )
      );
    }
  } as unknown as ColumnDef<T, any>;
}
