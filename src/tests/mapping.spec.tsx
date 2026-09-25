/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { InlineEntityLabel } from '../design-system';

// Mock the hook
vi.mock('@/src/shared/utils/useEntityReference', () => ({
  useEntityReference: (entityType: string, entityId: string, snapshotData?: any) => {
    if (snapshotData) return { label: snapshotData.label, isLoading: false };
    if (entityId === 'no-data-id') return { label: 'Chưa có số phiếu', isLoading: false };
    if (entityId === 'loading-id') return { label: '', isLoading: true };
    return { label: 'Mapped Name', isLoading: false };
  }
}));

describe('InlineEntityLabel Mapping Tests', () => {
  it('does not render doc.id when data is missing but fallback string is provided from resolver', () => {
    const { container } = render(
      <InlineEntityLabel entityType="quotation" entityId="no-data-id" />
    );
    // It should render "Chưa có số phiếu"
    expect(container.textContent).toContain('Chưa có số phiếu');
    // It should NOT render the actual ID in visible text
    expect(container.textContent).not.toContain('no-data-id');
  });

  it('renders "Đang tải..." when loading, without showing id', () => {
    const { container } = render(
      <InlineEntityLabel entityType="customer" entityId="loading-id" />
    );
    expect(container.textContent).toContain('Đang tải...');
    expect(container.textContent).not.toContain('loading-id');
  });
});
