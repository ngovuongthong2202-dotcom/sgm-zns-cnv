import React from 'react';
import { AsyncSearchableSelect } from '../design-system';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';

interface QuotationSmartSearchProps {
  value: string;
  onChange: (value: string, doc?: Record<string, unknown>) => void;
  error?: string;
  disabled?: boolean;
  excludeQuoIds?: string[];
  quotations?: Record<string, unknown>[]; // Keep for compatibility but unused
  filterOption?: (doc: any) => boolean;
  isOptionDisabled?: (doc: any) => { disabled: boolean; reason?: string };
}

export function QuotationSmartSearch({
  value,
  onChange,
  error,
  disabled,
  excludeQuoIds = [],
  quotations,
  filterOption,
  isOptionDisabled
}: QuotationSmartSearchProps) {
  return (
    <AsyncSearchableSelect
      collection="quotations"
      options={quotations}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="🔍 Tìm theo số BG, tên KH, mã KH..."
      error={error}
      renderOption={(q: any) => ({
        label: `⭐ ${q.soPhieuBaoGia} — ${q.tenKhachHang}`,
        subLabel: `📅 ${q.ngayBaoGia ? new Date(q.ngayBaoGia as string).toLocaleDateString('vi-VN') : 'N/A'} • ${q.slMay || 0} máy • Phụ trách: ${q.nguoiPhuTrach || 'N/A'}`
      })}
      filterOption={(q: any) => {
        if (excludeQuoIds.includes(q.id as string)) return false;
        if (filterOption && !filterOption(q)) return false;
        return true;
      }}
      isOptionDisabled={isOptionDisabled}
      renderItemWrapper={(q: any, children: React.ReactNode) => (
        <QuotationHoverCard quotationId={q.id as string}>
          {children}
        </QuotationHoverCard>
      )}
    />
  );
}
