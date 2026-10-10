/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('swr', () => ({
  default: () => ({ data: { heartbeats: [], errors: [], clientErrors: [] }, error: null, mutate: vi.fn(), isValidating: false }),
}));
// SystemPage nạp barrel design-system → kéo theo client Supabase (không dùng trong spec này); giả lập để không nạp SDK thật.
vi.mock('@/src/shared/config/supabase.client', () => ({ isSupabaseConfigured: false, supabase: {}, default: {} }));
vi.mock('./BackupPage', () => ({ default: () => <div>BackupPage giả lập</div> }));
vi.mock('../components/SgmHaControlStudio', () => ({ default: () => <div>SgmHaControlStudio giả lập</div> }));

import SystemPage from './SystemPage';

describe('SystemPage – tab Cron & Worker sau Đợt 0A', () => {
  it('không còn thẻ "Sync Customer Snapshots" / "Process ZNS Outbox" hay nút "Đối soát & Chạy"; chỉ còn bảng giám sát heartbeat', () => {
    render(<SystemPage />);
    expect(screen.queryByText('Sync Customer Snapshots')).toBeNull();
    expect(screen.queryByText('Process ZNS Outbox')).toBeNull();
    expect(screen.queryByText(/Đối soát & Chạy/i)).toBeNull();
    expect(screen.getByText('Không có dữ liệu heartbeat.')).toBeTruthy();
  });

  it('ba tab vẫn chuyển được', () => {
    render(<SystemPage />);
    fireEvent.click(screen.getByText('Sao lưu & Dữ liệu'));
    expect(screen.getByText('BackupPage giả lập')).toBeTruthy();
    fireEvent.click(screen.getByText('Hiệu năng & Đồng bộ'));
    expect(screen.getByText('SgmHaControlStudio giả lập')).toBeTruthy();
    fireEvent.click(screen.getByText('Cron & Worker'));
    expect(screen.getByText('Không có dữ liệu heartbeat.')).toBeTruthy();
  });
});
