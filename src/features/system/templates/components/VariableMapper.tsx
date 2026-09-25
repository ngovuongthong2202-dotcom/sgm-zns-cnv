import React from 'react';
import { ZnsTemplate, TemplateVariable } from '@/src/domain/schema/zns-template.schema';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Button } from '@/src/design-system/Button';
import { Save, AlertCircle } from 'lucide-react';

interface Props {
  template: ZnsTemplate;
  onSave: (variables: TemplateVariable[]) => Promise<void>;
  mockDataMap: Record<string, string>;
  setMockDataMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const COMMON_FIELDS = [
  'tenKhachHang',
  'dienThoai',
  'email',
  'diaChi',
  'maKhachHang',
  'soBaoGia',
  'tongTien',
  'soHopDong',
  'ngayKy',
];

const SELF_SNAPSHOT_FIELDS = [
  'tenKhachHang', 'sdt', 'soHopDong', 'soDonHang', 'soPhieuBaoGia',
  'soPhieuXuat', 'ngayBaoGia', 'ngayHetHan', 'ngayKy', 'ngayThanhToan',
  'ngayGiaoMay', 'slMay', 'soNgayDuKienHoanThanh', 'nguoiPhuTrach',
  'danhSachMaMay', 'dvt',
];

export function VariableMapper({ template, onSave, mockDataMap, setMockDataMap }: Props) {
  const methods = useForm<{ variables: TemplateVariable[] }>({
    defaultValues: {
      variables: template.variables || [],
    },
  });

  const { control, handleSubmit, reset, setValue } = methods;

  const currentVariables = useWatch({ control, name: 'variables' });

  // Cập nhật form state khi template đổi
  React.useEffect(() => {
    reset({ variables: template.variables || [] });
  }, [template, reset]);

  const onSubmit = async (data: { variables: TemplateVariable[] }) => {
    await onSave(data.variables);
  };

  const handleMockChange = (name: string, value: string) => {
    setMockDataMap((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col pt-2 h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Cấu hình Mapping Biến ({(template.variables || []).length})</h3>
        <Button size="sm" onClick={handleSubmit(onSubmit)} variant="primary" leftIcon={<Save size={16} />}>
          Lưu Mapping
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
        {(template.variables || []).map((v, index) => {
           const currentVar = currentVariables?.[index] || v;
           return (
             <div key={v.name} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
               <div className="flex items-center gap-2 mb-2">
                 <span className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                   {v.name}
                 </span>
                 <span className="text-sm font-medium text-slate-700">{v.label}</span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Source Entity */}
                 <div className="flex flex-col">
                   <label htmlFor={`sourceEntity-${v.name}`} className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center h-4">
                     Source Entity
                   </label>
                   <Controller
                     control={control}
                     name={`variables.${index}.sourceEntity`}
                     render={({ field }) => (
                       <select
                         {...field}
                         value={field.value || 'SELF'}
                         id={`sourceEntity-${v.name}`}
                         aria-label={`Source entity for ${v.name}`}
                         className="px-3 py-2 border border-slate-300 rounded-md text-sm w-full bg-white focus:ring-1 focus:ring-brand-primary h-9"
                       >
                         <option value="SELF">SELF</option>
                         <option value="CUSTOMER">CUSTOMER</option>
                         <option value="QUOTATION">QUOTATION</option>
                         <option value="CONTRACT">CONTRACT</option>
                         <option value="PAYMENT">PAYMENT</option>
                       </select>
                     )}
                   />
                 </div>

                 {/* Source Field */}
                 <div className="flex flex-col">
                   <label htmlFor={`sourceField-${v.name}`} className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center h-4">
                     Map (Lấy từ hệ thống)
                   </label>
                   <Controller
                     control={control}
                     name={`variables.${index}.sourceField`}
                     render={({ field }) => (
                       <input
                         {...field}
                         value={field.value || ''}
                         id={`sourceField-${v.name}`}
                         aria-label={`Source field for ${v.name}`}
                         list={`fields-${v.name}`}
                         className="px-3 py-2 border border-slate-300 rounded-md text-sm w-full focus:ring-1 focus:ring-brand-primary h-9"
                         placeholder="Ví dụ: tenKhachHang"
                       />
                     )}
                   />
                 </div>

                 {/* Format Field */}
                 <div className="flex flex-col">
                   <label htmlFor={`format-${v.name}`} className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center h-4">
                     Format
                   </label>
                   <Controller
                     control={control}
                     name={`variables.${index}.format`}
                     render={({ field }) => (
                       <select
                         {...field}
                         value={field.value || 'raw'}
                         id={`format-${v.name}`}
                         aria-label={`Format for ${v.name}`}
                         className="px-3 py-2 border border-slate-300 rounded-md text-sm w-full bg-white focus:ring-1 focus:ring-brand-primary h-9"
                       >
                         <option value="raw">Raw (giữ nguyên)</option>
                         <option value="date">Date (dd/MM/yyyy)</option>
                         <option value="number">Number</option>
                         <option value="currency">Currency (VND)</option>
                       </select>
                     )}
                   />
                 </div>

                 {/* Fallback */}
                 <div className="flex flex-col">
                   <label htmlFor={`fallback-${v.name}`} className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between h-4">
                     <span>Fallback (nếu rỗng)</span>
                   </label>
                   <Controller
                     control={control}
                     name={`variables.${index}.fallback`}
                     render={({ field }) => (
                       <input
                         {...field}
                         value={field.value || ''}
                         id={`fallback-${v.name}`}
                         aria-label={`Fallback for ${v.name}`}
                         className="px-3 py-2 border border-slate-300 rounded-md text-sm w-full focus:ring-1 focus:ring-brand-primary h-9"
                         placeholder="Để trống = KHÔNG fallback"
                       />
                     )}
                   />
                 </div>

                 {/* Live Preview Value */}
                 <div className="flex flex-col">
                   <label htmlFor={`mockField-${v.name}`} className="text-2xs font-bold uppercase tracking-wider mb-1.5 flex items-center h-4 text-emerald-700">
                     ● Live Mẫu Data
                   </label>
                   <input
                     id={`mockField-${v.name}`}
                     type="text"
                     aria-label={`Live Value for ${v.name}`}
                     className="px-3 py-2 border border-emerald-200 rounded-md text-sm w-full bg-emerald-50 text-slate-800 h-9 placeholder-emerald-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                     placeholder="Nhập giá trị test..."
                     value={mockDataMap[v.name] || ''}
                     onChange={(e) => handleMockChange(v.name, e.target.value)}
                   />
                 </div>
               </div>
               
               {currentVar.sourceEntity && currentVar.sourceEntity !== 'SELF' && SELF_SNAPSHOT_FIELDS.includes(currentVar.sourceField) && (
                 <div className="mt-1 flex items-start gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-2xs">
                   <AlertCircle size={12} className="shrink-0 mt-0.5" />
                   <span>
                     Field "{currentVar.sourceField}" đã có sẵn trên entity này (snapshot). 
                     Khuyến nghị đổi <strong>sourceEntity → SELF</strong> để giảm round-trip + tránh fail khi entity link thiếu.
                     <Button type="button" onClick={() => setValue(`variables.${index}.sourceEntity`, 'SELF')} className="ml-1 underline">
                       Sửa nhanh
                     </Button>
                   </span>
                 </div>
               )}

               <datalist id={`fields-${v.name}`}>
                 {COMMON_FIELDS.map(f => <option key={f} value={f} />)}
               </datalist>
             </div>
           );
        })}

        {(template.variables || []).length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
             Mẫu tin này không có biến động.
          </div>
        )}
      </div>
    </div>
  );
}


