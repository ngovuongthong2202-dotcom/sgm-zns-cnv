import React, { useState } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { useConfirm } from '@/src/design-system/Confirm';
import { Sparkles, Eye, CheckCircle, RefreshCw, DatabaseZap } from 'lucide-react';
import { Button } from '@/src/design-system/Button';

export default function DataStandardizationPanel() {
  const [entityType, setEntityType] = useState('customers');
  const { confirm } = useConfirm();

  // Deterministic standardization states
  const [standardizing, setStandardizing] = useState(false);
  const [standardizeResult, setStandardizeResult] = useState<{
    scannedCount: number;
    affectedDocs: Array<{ id: string; code: string; oldVal: any; newVal: any }>;
    isDryRun: boolean;
    executed: boolean;
  } | null>(null);

  const runStandardization = async (dryRun: boolean) => {
    if (!dryRun) {
      if (!(await confirm({
        title: 'Xác nhận chuẩn hóa dữ liệu',
        message: `Hệ thống sẽ chạy chuẩn hóa ĐỒNG LOẠT (Proper Case, xóa khoảng trắng thừa, chuẩn hóa SĐT) cho toàn bộ ${entityType}. Bạn có chắc chắn muốn thực hiện?`
      }))) return;
    }

    setStandardizing(true);
    setStandardizeResult(null);
    try {
      const res = await fetch('/api/migration/standardize-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, dryRun })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yêu cầu chuẩn hóa thất bại');

      if (!dryRun) {
        notify.success(`Chuẩn hóa hoàn tất! Cập nhật ${data.updatedCount} bản ghi thành công.`);
      } else {
        notify.success(`Rà soát (Dry Run) hoàn tất! Phát hiện ${data.updatedCount} bản ghi cần chuẩn hóa.`);
      }

      setStandardizeResult(data);
    } catch (err: any) {
      notify.error('Lỗi: ' + err.message);
    } finally {
      setStandardizing(false);
    }
  };

  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityType(e.target.value);
    setStandardizeResult(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/80 p-6 animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <Sparkles size={24} className="text-emerald-600" />
        </div>
        <div className="space-y-5 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">Trung tâm Chuẩn hoá Dữ liệu (Data Hygiene)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Phát hiện, dọn dẹp và chuẩn hoá các định dạng lưu trữ sai lệch. Áp dụng cho mọi bộ dữ liệu cốt lõi (Khách hàng, Hợp đồng, Báo giá, ...).
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
             <span className="text-sm font-medium text-slate-700">Chọn bộ dữ liệu:</span>
             <select 
               value={entityType}
               onChange={handleEntityChange}
               className="bg-white border border-slate-300 rounded text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
             >
               <option value="customers">Khách hàng</option>
               <option value="quotations">Báo giá</option>
               <option value="contracts">Hợp đồng</option>
               <option value="payments">Thanh toán</option>
               <option value="deliveries">Giao hàng</option>
             </select>
          </div>
          
          <div className="space-y-4">
            {/* Deterministic Tools */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DatabaseZap size={14}/> Chuẩn hoá Cơ bản (Deterministic)
              </h4>
              <p className="text-xs text-slate-600">Loại bỏ quy tắc khoảng trắng đầu cuối, tự động set Proper Case, format +84 sđt.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button aria-label="Nút Dry Run Chuẩn Hóa" 
                  onClick={() => runStandardization(true)}
                  disabled={standardizing}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-8 px-3 rounded text-sm transition-all shadow-sm"
                >
                  <Eye size={14} /> Chạy thử (Dry Run)
                </Button>
                <Button aria-label="Nút Lưu Chuẩn Hóa" 
                  onClick={() => runStandardization(false)}
                  disabled={standardizing}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-600 hover:text-white font-medium h-8 px-3 rounded text-sm transition-all shadow-sm"
                >
                  <CheckCircle size={14} /> Áp dụng Cập nhật
                </Button>
              </div>

              {standardizing && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono animate-pulse mt-2">
                  <RefreshCw className="animate-spin" size={12} /> Đang chạy rà soát thuật toán...
                </div>
              )}
            </div>

            {/* Deterministic Results */}
            {standardizeResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>Kết quả {standardizeResult.isDryRun ? 'Quét thử' : 'Thực Tế'} ({entityType})</span>
                  <span>Phát hiện: {standardizeResult.affectedDocs?.length || 0}</span>
                </div>
                {standardizeResult.affectedDocs?.length > 0 ? (
                  <div className="max-h-[150px] overflow-auto border border-slate-200 bg-white rounded divide-y divide-slate-100">
                     {standardizeResult.affectedDocs.map((item, idx) => (
                       <div key={idx} className="p-2 text-2xs font-mono grid grid-cols-2 gap-2">
                          <div className="text-red-650 truncate">{JSON.stringify(item.oldVal)}</div>
                          <div className="text-emerald-700 truncate">{JSON.stringify(item.newVal)}</div>
                       </div>
                     ))}
                  </div>
                ) : <span className="text-xs text-slate-500 italic">Dữ liệu hoàn toàn sạch sẽ!</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
