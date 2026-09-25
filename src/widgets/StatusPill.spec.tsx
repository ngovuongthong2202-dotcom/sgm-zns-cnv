import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

describe('StatusPill', () => {
  it('renders THÀNH CÔNG for "Gửi tin thành công"', () => {
    const { getByText, container } = render(<StatusPill statusStr="Gửi tin thành công" animate={false} />);
    expect(getByText('THÀNH CÔNG')).toBeDefined();
    // Color emerald
    expect(container.innerHTML).toContain('emerald');
  });

  it('renders CHƯA GỬI for "chưa gửi"', () => {
    const { getByText } = render(<StatusPill statusStr="chưa gửi" animate={false} />);
    expect(getByText(EntityZnsStatus.CHUA_GUI)).toBeDefined();
  });

  it('renders VƯỢT HẠN MỨC for "VƯỢT HẠN MỨC"', () => {
    const { getByText } = render(<StatusPill statusStr="VƯỢT HẠN MỨC" animate={false} />);
    expect(getByText('VƯỢT HẠN MỨC')).toBeDefined();
  });

  it('renders ĐÃ ĐẨY - CHỜ KQ for legacy "ĐÃ GỬI"', () => {
    const { getByText } = render(<StatusPill statusStr="ĐÃ GỬI" animate={false} />);
    expect(getByText('ĐÃ ĐẨY - CHỜ KQ')).toBeDefined();
  });

  it('renders enum exact THẤT BẠI', () => {
    const { getByText } = render(<StatusPill statusStr="THẤT BẠI" animate={false} />);
    expect(getByText('THẤT BẠI')).toBeDefined();
  });

  it('renders CHƯA GỬI for undefined', () => {
    const { getByText } = render(<StatusPill statusStr={undefined} animate={false} />);
    expect(getByText(EntityZnsStatus.CHUA_GUI)).toBeDefined();
  });

  it('renders CHƯA GỬI for raw INIT', () => {
    const { getByText } = render(<StatusPill statusStr="INIT" animate={false} />);
    expect(getByText(EntityZnsStatus.CHUA_GUI)).toBeDefined();
  });

  it('renders CHƯA GỬI for raw PENDING', () => {
    const { getByText } = render(<StatusPill statusStr="PENDING" animate={false} />);
    expect(getByText(EntityZnsStatus.CHUA_GUI)).toBeDefined();
  });
});
