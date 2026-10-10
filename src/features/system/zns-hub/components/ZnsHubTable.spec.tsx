/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { t } from '@/src/i18n/vi';

vi.mock('@/src/design-system/InlineEntityLabel', () => ({
  InlineEntityLabel: ({ fallbackId }: any) => <span>{fallbackId}</span>,
}));

import ZnsHubTable from './ZnsHubTable';

describe('ZnsHubTable – không còn nút gửi lại (Đợt 0A)', () => {
  it('bản ghi DLQ đang mở chi tiết: panel vẫn mở nhưng không có "Thử gửi lại (Retry Workflow)" hay "Retry DLQ"', () => {
    const item = {
      id: 'm1', status: 'DLQ', entityType: 'QUOTATION', entityId: 'q1',
      createdAt: '2026-10-09T01:00:00.000Z', payload: { a: 1 }, errorLog: 'Lỗi thử nghiệm'
    };
    render(
      <ZnsHubTable
        activeTab="dlq"
        currentList={[item]}
        loading={false}
        expandedMsgId="m1"
        setExpandedMsgId={vi.fn()}
        hasMore={false}
        loadMore={vi.fn()}
        loadingMore={false}
      />
    );
    expect(screen.getByText(t('znshub.detail.payloadTitle'))).toBeTruthy();
    expect(screen.queryByText('Thử gửi lại (Retry Workflow)')).toBeNull();
    // Hàng danh sách không render dưới jsdom (virtualizer đo chiều cao 0) nên dòng này null kể cả ở HEAD;
    // việc xóa nút ở dòng 162-170 được cổng grep "Retry DLQ" ở Bước 4 bảo đảm. Giữ làm tài liệu ý định.
    expect(screen.queryByTitle('Retry DLQ')).toBeNull();
  });
});
