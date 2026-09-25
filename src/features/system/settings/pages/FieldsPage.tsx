import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { mutate } from 'swr';
import { Save, X } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { Button } from '@/src/design-system/Button';
import { settingsRepo } from '@/src/data/repositories';

import {
  DEFAULT_LOAI_BAO_GIA,
  DEFAULT_LOAI_KHACH_HANG,
  DEFAULT_PHUONG_THUC_THANH_TOAN,
  DEFAULT_TINH_TRANG_THANH_TOAN,
  SWR_SYSTEM_RESOURCES_KEY
} from '@/src/hooks/useSharedFields';

function ArrayInput({ label, hint, value, onChange }: { label: string, hint?: string, value: string[], onChange: (v: string[]) => void }) {
  const [inputValue, setInputValue] = useState('');

  const add = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const remove = (item: string) => {
    onChange(value.filter(v => v !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-1.5 focus-within:relative">
      <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex bg-white border border-slate-200 rounded-lg p-2 gap-2 flex-wrap min-h-[48px] items-center focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
        {value.map(item => (
          <span key={item} className="bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1.5 hover:bg-slate-200/50 transition-colors">
            {item}
            <Button 
              variant="ghost" 
              size="xs" 
              iconOnly 
              aria-label={`Xóa tùy chọn ${item}`} 
              type="button" 
              onClick={() => remove(item)} 
              className="w-4 h-4 p-0 text-slate-400 hover:text-red-600 hover:bg-slate-200/60 rounded cursor-pointer"
            >
              <X size={12} />
            </Button>
          </span>
        ))}
        <input 
           aria-label="Thêm tùy chọn"
           type="text" 
           value={inputValue} 
           onChange={e => setInputValue(e.target.value)} 
           onKeyDown={handleKeyDown}
           onBlur={add}
           placeholder="Thêm lựa chọn..." 
           className="bg-transparent outline-none text-sm placeholder:text-slate-400 flex-1 min-w-[120px] px-1 h-8" 
        />
      </div>
    </div>
  );
}

export default function FieldsPage() {
  const { user } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaiBaoGiaList, setLoaiBaoGiaList] = useState<string[]>([]);
  const [loaiKhachHangList, setLoaiKhachHangList] = useState<string[]>([]);
  const [phuongThucThanhToanList, setPhuongThucThanhToanList] = useState<string[]>([]);
  const [tinhTrangThanhToanList, setTinhTrangThanhToanList] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsub = settingsRepo.subscribeSettings<any>('shared_fields', (doc) => {
      if (mounted) {
        if (doc) {
          setLoaiBaoGiaList(doc.loaiBaoGiaList?.length ? doc.loaiBaoGiaList : DEFAULT_LOAI_BAO_GIA);
          setLoaiKhachHangList(doc.loaiKhachHangList?.length ? doc.loaiKhachHangList : DEFAULT_LOAI_KHACH_HANG);
          setPhuongThucThanhToanList(doc.phuongThucThanhToanList?.length ? doc.phuongThucThanhToanList : DEFAULT_PHUONG_THUC_THANH_TOAN);
          setTinhTrangThanhToanList(doc.tinhTrangThanhToanList?.length ? doc.tinhTrangThanhToanList : DEFAULT_TINH_TRANG_THANH_TOAN);
        } else {
          setLoaiBaoGiaList(DEFAULT_LOAI_BAO_GIA);
          setLoaiKhachHangList(DEFAULT_LOAI_KHACH_HANG);
          setPhuongThucThanhToanList(DEFAULT_PHUONG_THUC_THANH_TOAN);
          setTinhTrangThanhToanList(DEFAULT_TINH_TRANG_THANH_TOAN);
        }
        setHasInitialized(true);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const newConfig = {
      loaiBaoGiaList,
      loaiKhachHangList,
      phuongThucThanhToanList,
      tinhTrangThanhToanList,
    };

    try {
      await settingsRepo.setSettings('shared_fields', {
        ...newConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || 'any'
      });
      await mutate(SWR_SYSTEM_RESOURCES_KEY);
      notify.success('Đã lưu cấu hình trường thông tin chung');
    } catch (err: any) { 
      notify.error('Lỗi lưu cấu hình: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !hasInitialized) return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1 tracking-tight">Trường thông tin chung</h2>
        <p className="text-sm text-slate-500">
          Quản lý các danh mục lựa chọn (dropdown) được sử dụng phổ biến trên toàn hệ thống.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative pb-16">
        <div className="p-6 space-y-8">
           <ArrayInput 
             label="Danh mục Loại báo giá (Workflow Routing)" 
             hint="Lưu ý: Các giá trị phân loại chính để điều hướng quy trình."
             value={loaiBaoGiaList} 
             onChange={setLoaiBaoGiaList} 
           />
           <ArrayInput 
             label="Danh mục Loại hình khách hàng" 
             value={loaiKhachHangList} 
             onChange={setLoaiKhachHangList} 
           />
           <ArrayInput 
             label="Danh mục Hình thức thanh toán" 
             value={phuongThucThanhToanList} 
             onChange={setPhuongThucThanhToanList} 
           />
           <ArrayInput 
             label="Danh mục Tình trạng thanh toán" 
             value={tinhTrangThanhToanList} 
             onChange={setTinhTrangThanhToanList} 
           />
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur flex justify-end gap-3 pointer-events-auto rounded-b-xl z-10">
           <Button variant="primary" aria-label="Lưu lựa chọn" type="submit" disabled={saving} className="bg-blue-600 text-white font-medium h-8 px-4 border-0 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
              <Save size={14} className={saving ? 'animate-pulse' : ''} />
              {saving ? 'Đang lưu...' : 'Lưu lựa chọn'}
           </Button>
        </div>
      </form>
    </div>
  );
}
