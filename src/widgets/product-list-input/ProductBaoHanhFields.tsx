import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';

interface ProductBaoHanhFieldsProps {
  product: ProductItem;
  viewType?: 'table' | 'card';
  disabled?: boolean;
  baseDateForBaoHanh?: string;
  onChange: (field: 'soNgayBaoHanh' | 'ngayHetHanBaoHanh', value: any) => void;
}

export function ProductBaoHanhFields({ product, viewType = 'card', disabled, baseDateForBaoHanh, onChange }: ProductBaoHanhFieldsProps) {
  // Tự động làm sạch số ngày bảo hành (khử sạch số âm như -1365)
  const rawDays = product.soNgayBaoHanh;
  const sanitizedDays = (rawDays !== undefined && rawDays !== null && Number(rawDays) > 0)
    ? Number(rawDays)
    : (rawDays !== undefined && rawDays !== null && Number(rawDays) < 0 ? Math.abs(Number(rawDays)) : 0);

  const displayExpiry = React.useMemo(() => {
    if (product.ngayHetHanBaoHanh) return product.ngayHetHanBaoHanh;
    const days = sanitizedDays > 0 ? sanitizedDays : (product.soNgayBaoHanh && product.soNgayBaoHanh > 0 ? product.soNgayBaoHanh : 0);
    if (days > 0) {
      const base = baseDateForBaoHanh ? new Date(baseDateForBaoHanh) : new Date();
      if (!isNaN(base.getTime())) {
        const exp = new Date(base.getTime() + days * 86400000);
        return exp.toISOString().split('T')[0];
      }
    }
    return '';
  }, [product.ngayHetHanBaoHanh, product.soNgayBaoHanh, sanitizedDays, baseDateForBaoHanh]);

  const handleDaysChange = (days: number | null) => {
    onChange('soNgayBaoHanh', days);
    if (days && days > 0) {
      const base = baseDateForBaoHanh ? new Date(baseDateForBaoHanh) : new Date();
      if (!isNaN(base.getTime())) {
        const exp = new Date(base.getTime() + days * 86400000);
        onChange('ngayHetHanBaoHanh', exp.toISOString().split('T')[0]);
      }
    } else {
      onChange('ngayHetHanBaoHanh', null);
    }
  };

  const warrantyPresets = [
    { label: '6T', days: 180 },
    { label: '12T (Chuẩn)', days: 365 },
    { label: '24T', days: 730 },
    { label: '36T', days: 1095 }
  ];

  return (
    <div className={`mt-2 ${viewType === 'card' ? 'pt-3 border-t border-slate-100' : 'pt-2'} grid grid-cols-2 gap-4 w-full md:max-w-md`}>
      <div className="space-y-1">
         <div className="flex items-center justify-between">
           <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">Ngày BH <span className="text-red-600">*</span></label>
           <span className="text-3xs text-slate-600 font-medium">Bấm chọn nhanh</span>
         </div>
         <input aria-label="Nhập thông tin"
           type="number"
           min="0"
           placeholder="VD: 365"
           required={true}
           value={product.soNgayBaoHanh !== undefined && product.soNgayBaoHanh !== null ? Math.max(0, product.soNgayBaoHanh) : ''}
           readOnly={disabled}
           onChange={(e) => {
             const parsed = parseInt(e.target.value);
             handleDaysChange(isNaN(parsed) ? null : Math.max(0, parsed));
           }}
           className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded focus:border-blue-400 p-1.5 focus:outline-none"
         />
         {/* Quick Warranty Presets */}
         <div className="flex flex-wrap gap-1 pt-1">
           {warrantyPresets.map((preset) => {
             const isSelected = product.soNgayBaoHanh === preset.days;
             return (
               <button
                 key={preset.days}
                 type="button"
                 disabled={disabled}
                 onClick={() => handleDaysChange(preset.days)}
                 className={`text-3xs px-1.5 py-0.5 rounded font-bold border transition-colors cursor-pointer ${
                   isSelected
                     ? 'bg-blue-600 text-white border-blue-700'
                     : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                 }`}
               >
                 {preset.label}
               </button>
             );
           })}
         </div>
      </div>
      <div className="space-y-1">
         <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">Hết hạn (Dự kiến)</label>
         <input aria-label="Nhập thông tin"
           type="date"
           readOnly={true}
           value={displayExpiry}
           className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 outline-none font-mono"
         />
         <p className="text-3xs text-slate-600 font-medium italic pt-1">
           {displayExpiry ? `Kích hoạt đến ${new Date(displayExpiry).toLocaleDateString('vi-VN')}` : 'Chưa xác định mốc hạn'}
         </p>
      </div>
    </div>
  );
}
