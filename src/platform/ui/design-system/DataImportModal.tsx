import React, { useState, useRef } from 'react';
import { z } from 'zod';
import { Button } from './Button';
import { Download, Upload, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DataImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  schema: z.ZodType<T>;
  onImport: (data: T[]) => Promise<void>;
  templateData?: any[]; 
}

export function DataImportModal<T>({ isOpen, onClose, title = 'Import Data', schema, onImport, templateData }: DataImportModalProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ row: number; errors: string[] }[]>([]);
  const [validData, setValidData] = useState<T[]>([]);
  const [errorFileUrl, setErrorFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setErrors([]);
    setValidData([]);
    if (errorFileUrl) {
      URL.revokeObjectURL(errorFileUrl);
      setErrorFileUrl(null);
    }
  };

  const processFile = async (selectedFile: File) => {
    setLoading(true);
    reset();
    setFile(selectedFile);
    try {
      let parsedData: any[] = [];
      if (selectedFile.name.endsWith('.csv')) {
         const Papa = (await import('papaparse')).default;
         const text = await selectedFile.text();
         const result = Papa.parse(text, { header: true, skipEmptyLines: true });
         parsedData = result.data;
      } else if (selectedFile.name.endsWith('.xlsx')) {
         const XLSX = await import('xlsx');
         const buffer = await selectedFile.arrayBuffer();
         const wb = XLSX.read(buffer, { type: 'array' });
         const wsname = wb.SheetNames[0];
         const ws = wb.Sheets[wsname];
         parsedData = XLSX.utils.sheet_to_json(ws);
      } else {
         toast.error('Chỉ hỗ trợ file .csv và .xlsx');
         return;
      }

      const newValidData: T[] = [];
      const newErrors: { row: number; errors: string[] }[] = [];
      const errorRowsForExport: any[] = [];

      parsedData.forEach((row, index) => {
        const result = schema.safeParse(row);
        if (result.success) {
          newValidData.push(result.data);
        } else {
          const rowErrors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
          newErrors.push({ row: index + 2, errors: rowErrors });
          errorRowsForExport.push({ ...row, 'LỖI': rowErrors.join(' | ') });
        }
      });

      setValidData(newValidData);
      setErrors(newErrors);

      if (errorRowsForExport.length > 0) {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(errorRowsForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Errors");
        const b64 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([b64], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        setErrorFileUrl(URL.createObjectURL(blob));
      }

    } catch (e: any) {
      toast.error('Lỗi khi đọc file: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error('File có lỗi nghiêm trọng, vui lòng sửa và tải lên lại.');
      return;
    }
    setLoading(true);
    try {
      await onImport(validData);
      toast.success('Import thành công!');
      onClose();
    } catch (e: any) {
      toast.error('Lỗi khi lưu dữ liệu: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    if (!templateData) return;
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <Button onClick={onClose} className="text-slate-400 hover:text-slate-600" variant="ghost" iconOnly aria-label="Action button">
            <X size={20} />
          </Button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto space-y-4">
           {templateData && (
             <div className="flex justify-end">
               <Button variant="link" onClick={downloadTemplate} className="text-blue-600 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded text-sm">
                  <Download size={16} className="mr-2 inline" /> Tải template mẫu
               </Button>
             </div>
           )}

           <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 relative">
             <Upload className="w-10 h-10 text-slate-400 mb-3" />
             <p className="text-sm font-semibold text-slate-700">Kéo thả file .xlsx hoặc .csv vào đây</p>
             <p className="text-xs text-slate-500 mt-1 mb-4">hoặc click để chọn file</p>
             <Button onClick={() => fileInputRef.current?.click()} size="sm">Chọn File</Button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx" onChange={e => {
               if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
             }} />
           </div>

           {file && (
             <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                 <span className="text-sm font-medium text-slate-800">{file.name}</span>
                 <span className="text-xs text-slate-500">{validData.length} hợp lệ, {errors.length} lỗi</span>
               </div>

               {errors.length > 0 && (
                 <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                   <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                     <AlertCircle size={16} /> <span>Phát hiện {errors.length} dòng lỗi</span>
                   </div>
                   <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-auto mb-3 pl-5 list-disc">
                      {errors.slice(0, 20).map((err, i) => (
                        <li key={i}>Dòng {err.row}: {err.errors.join(', ')}</li>
                      ))}
                      {errors.length > 20 && <li>...và {errors.length - 20} lỗi khác</li>}
                   </ul>
                   {errorFileUrl && (
                     <a href={errorFileUrl} download="rows_with_errors.xlsx" className="inline-flex items-center gap-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-md font-medium transition-colors">
                       <Download size={14} /> Tải file chi tiết lỗi
                     </a>
                   )}
                 </div>
               )}
             </div>
           )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
           <Button variant="ghost" onClick={onClose}>Hủy</Button>
           <Button variant="primary" onClick={handleImport} disabled={loading || !file || errors.length > 0 || validData.length === 0}>
             {loading ? 'Đang xử lý...' : `Import ${validData.length} bản ghi`}
           </Button>
        </div>
      </div>
    </div>
  );
}
