/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyCell } from './CurrencyCell';
import { getQuotationColumns } from '@/src/modules/sales/ui/columns.config';
import { getContractColumns } from '@/src/modules/contracts/ui/columns.config';

type AnyColumn = { id?: string; accessorKey?: string; size?: number; minSize?: number };
const asFactory = (f: unknown) => f as (...args: unknown[]) => AnyColumn[];

describe('CurrencyCell và cột Trị giá – Đợt 0A (BG01): không cắt chữ số đầu', () => {
  it('7.160.000.000 ₫ nằm trong một span không xuống dòng, có title số đầy đủ; thẻ bọc không dùng items-end', () => {
    const { container } = render(<CurrencyCell value={7_160_000_000} subText="11 Máy • 10 Phụ kiện" />);
    const amount = screen.getByText('7.160.000.000 ₫');
    expect(amount.className).toMatch(/whitespace-nowrap/);
    expect(amount.className).toMatch(/text-ellipsis/);
    expect(amount.getAttribute('title')).toBe('7.160.000.000 ₫');
    expect((container.firstChild as HTMLElement).className).not.toMatch(/items-end/);
    expect((container.firstChild as HTMLElement).className).toMatch(/min-w-0/);
  });

  it('dòng phụ "11 Máy • 10 Phụ kiện" có class truncate (cắt bên phải, không cắt bên trái)', () => {
    render(<CurrencyCell value={1_000} subText="11 Máy • 10 Phụ kiện" />);
    expect(screen.getByText('11 Máy • 10 Phụ kiện').className).toMatch(/truncate/);
  });

  it('cột giaTri của báo giá rộng ≥ 170 (minSize ≥ 150); cột tongGiaTri của hợp đồng ≥ 150', () => {
    const quoteCols = asFactory(getQuotationColumns)([], [], [], vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn());
    const giaTri = quoteCols.find(c => c.id === 'giaTri');
    expect(giaTri?.size).toBeGreaterThanOrEqual(170);
    expect(giaTri?.minSize).toBeGreaterThanOrEqual(150);
    const contractCols = asFactory(getContractColumns)([], [], [], vi.fn(), vi.fn(), vi.fn(), vi.fn());
    const tongGiaTri = contractCols.find(c => c.id === 'tongGiaTri' || c.accessorKey === 'tongGiaTri');
    expect(tongGiaTri?.size).toBeGreaterThanOrEqual(150);
  });
});
