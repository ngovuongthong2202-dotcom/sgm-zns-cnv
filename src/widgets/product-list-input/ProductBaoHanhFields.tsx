import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';

interface ProductBaoHanhFieldsProps {
  product: ProductItem;
  viewType?: 'table' | 'card';
  disabled?: boolean;
  onChange: (field: 'soNgayBaoHanh', value: number | null) => void;
}

export function ProductBaoHanhFields({ product, viewType = 'card', disabled, onChange }: ProductBaoHanhFieldsProps) {
  return (
    <div className={`mt-2 ${viewType === 'card' ? 'pt-3 border-t border-slate-100' : 'pt-2'} grid grid-cols-2 gap-4 w-full md:max-w-md`}>
      <div className="space-y-1">
         <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">Ngày BH <span className="text-red-600">*</span></label>
         <input aria-label="Nhập thông tin"
           type="number"
           placeholder="VD: 365"
           required={true}
           value={product.soNgayBaoHanh || ''}
           readOnly={disabled}
           onChange={(e) => onChange('soNgayBaoHanh', parseInt(e.target.value) || null)}
           className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded focus:border-blue-400 p-1.5 focus:outline-none"
         />
      </div>
      <div className="space-y-1">
         <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">Hết hạn (Dự kiến)</label>
         <input aria-label="Nhập thông tin"
           type="date"
           readOnly={true}
           value={product.ngayHetHanBaoHanh || ''}
           className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 outline-none"
         />
      </div>
    </div>
  );
}
