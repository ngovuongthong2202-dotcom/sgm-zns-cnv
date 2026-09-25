import React from 'react';
import { Controller } from 'react-hook-form';
import { FileText } from 'lucide-react';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';

interface ProductsSectionProps {
  control: any;
  isEditMode: boolean;
  setValue: any;
  watch: any;
  disabled?: boolean;
}

export function PaymentRecordProductsSection({ control, isEditMode, setValue, watch, disabled }: ProductsSectionProps) {
  const currentSubTotal = Number(watch('subTotal')) || 0;
  const vatRate = Number(watch('vatRate')) || 0;
  const vatAmount = Number(watch('vatAmount')) || 0;
  const discountRate = Number(watch('discountRate')) || 0;
  const discountAmount = Number(watch('discountAmount')) || 0;
  const totalAmount = Number(watch('totalAmount')) || 0;

  return (
    <div className="w-full shrink-0 mt-6">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2 mb-4">
        <FileText size={14} /> DANH SÁCH SẢN PHẨM & DỊCH VỤ (KẾ THỪA)
      </h3>
      <Controller
        name="products"
        control={control}
        render={({ field }) => (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-hidden shadow-sm">
            <DrawerProductList 
              products={field.value || []} 
              hideTotals={true}
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 italic flex-[1]">(Thông tin sản phẩm và giá trị thừa kế từ Hợp đồng / Báo giá)</div>
              <div className="flex flex-col text-right min-w-[200px]">
                <div className="flex justify-end items-center gap-8 text-sm">
                  <span className="text-slate-500">Tạm tính:</span>
                  {isEditMode ? (
                    <input 
                      aria-label="Tạm tính" 
                      type="text" 
                      value={new Intl.NumberFormat('vi-VN').format(currentSubTotal)} 
                      disabled={disabled}
                      onChange={(e) => { 
                        const val = Number(e.target.value.replace(/[^0-9]/g, '')); 
                        setValue('subTotal', val, { shouldValidate: true }) 
                      }} 
                      className="premium-input w-32 font-bold font-mono text-slate-900 text-right py-1 disabled:bg-slate-50 disabled:opacity-75" 
                      placeholder="0"
                    />
                  ) : (
                    <span className="font-bold font-mono text-slate-900 w-32">{new Intl.NumberFormat('vi-VN').format(currentSubTotal)} đ</span>
                  )}
                </div>
                {vatAmount > 0 && (
                  <div className="flex justify-end gap-8 text-sm mt-2">
                    <span className="text-slate-500">VAT ({vatRate}%):</span>
                    <span className="font-bold font-mono text-slate-900 w-32">{new Intl.NumberFormat('vi-VN').format(vatAmount)} đ</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-end gap-8 text-sm mt-2 text-emerald-700">
                    <span className="text-emerald-700">Chiết khấu ({discountRate}%):</span>
                    <span className="font-bold font-mono w-32">-{new Intl.NumberFormat('vi-VN').format(discountAmount)} đ</span>
                  </div>
                )}
                <div className="flex justify-end gap-8 text-base mt-2 pt-2 border-t border-slate-200 border-dashed">
                  <span className="font-bold text-slate-700">Tổng cộng:</span>
                  <span className="font-bold font-mono text-brand-primary w-32">{new Intl.NumberFormat('vi-VN').format(totalAmount)} đ</span>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
