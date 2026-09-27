import React from 'react';
import { AsyncSearchableSelect } from '../design-system';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';
import { formatDate } from '@/src/shared/utils/formatDate';
import { normalizeLoai, QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

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
      renderOption={(q: any) => {
        const isMachine = normalizeLoai(q.loai) === QUOTATION_LOAI.MAY;
        const totalAmount = Number(q.totalAmount || q.tongTien || q.tongGiaTri || 0);
        const moneyFormatted = totalAmount > 0 ? `${new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫` : '---';
        const typeBadge = isMachine ? '⭐ [MÁY]' : '📦 [L/K & DV]';
        const qtyStr = `${q.slMay || q.products?.length || 0} máy/mục`;

        return {
          label: `${typeBadge} ${q.soPhieuBaoGia} — ${q.tenKhachHang || 'Khách hàng'}`,
          subLabel: `📅 ${q.ngayBaoGia ? formatDate(q.ngayBaoGia) : 'N/A'} • ${qtyStr} • 💰 ${moneyFormatted} • Phụ trách: ${q.nguoiPhuTrach || 'N/A'}`
        };
      }}
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
