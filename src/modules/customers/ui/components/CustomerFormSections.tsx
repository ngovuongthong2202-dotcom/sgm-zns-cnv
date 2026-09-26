import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Building2, Users, Lock, Check, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { useAuth } from '@/src/modules/iam';
import { isAdministratorRole } from '@/src/shared/utils/userProfile';
import { autoDetectBusinessName, STANDARDIZED_BUSINESS_TYPES } from './CustomerFormHelpers';

import { sanitizeTaxCode } from '@/src/shared/utils/inputSanitizer';

interface ProfileSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  nameInputRef: React.MutableRefObject<HTMLInputElement | null> | undefined;
  isAiFormatting: boolean;
  smartFormatNameAI: (name: string) => Promise<void>;
  isLookingUp: boolean;
  lookupStatus: 'idle' | 'success' | 'error';
  handleTaxLookup: () => Promise<void>;
  PROVINCES: string[];
}

export function CustomerFormProfileSection({
  register,
  errors,
  watch,
  setValue,
  nameInputRef,
  isAiFormatting,
  smartFormatNameAI,
  isLookingUp,
  lookupStatus,
  handleTaxLookup,
  PROVINCES
}: ProfileSectionProps) {
  const isIndividual = watch('loaiHinhDoanhNghiep') === 'CÁ NHÂN' || watch('loaiKh') === 'Cá nhân';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {isIndividual ? <Users size={16} className="text-blue-600" /> : <Building2 size={16} className="text-slate-800" />}
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {isIndividual ? '1. Profile Khách Hàng Cá Nhân' : '1. Profile Pháp Nhân'}
          </h3>
        </div>
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setValue('loaiHinhDoanhNghiep', 'CÔNG TY TNHH', { shouldDirty: true });
              if (watch('loaiKh') === 'Cá nhân') {
                setValue('loaiKh', 'Khách lẻ', { shouldDirty: true });
              }
            }}
            className={`px-2.5 py-1 rounded-md text-2xs font-bold transition-all flex items-center gap-1 ${
              !isIndividual ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={11} />
            Doanh nghiệp
          </button>
          <button
            type="button"
            onClick={() => {
              setValue('loaiHinhDoanhNghiep', 'CÁ NHÂN', { shouldDirty: true });
              setValue('loaiKh', 'Cá nhân', { shouldDirty: true });
              setValue('maSoThue', '', { shouldDirty: true });
              const currentName = watch('tenKhachHang');
              if (currentName) {
                setValue('nguoiDaiDien', currentName, { shouldDirty: true });
              }
            }}
            className={`px-2.5 py-1 rounded-md text-2xs font-bold transition-all flex items-center gap-1 ${
              isIndividual ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={11} />
            Cá nhân (Nhanh 10s)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2 relative">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="tenKhachHang">
            {isIndividual ? 'Họ và tên Khách hàng (Cá nhân)' : 'Tên KH / Pháp nhân'} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="tenKhachHang"
              autoComplete="off"
              {...register('tenKhachHang')}
              ref={(e) => {
                register('tenKhachHang').ref(e);
                if (nameInputRef) {
                  (nameInputRef as any).current = e;
                }
              }}
              onBlur={(e) => {
                register('tenKhachHang').onBlur(e);
                if (isIndividual) {
                  const cleaned = cleanProperVietnameseText(e.target.value);
                  if (cleaned !== e.target.value) {
                    setValue('tenKhachHang', cleaned, { shouldDirty: true });
                  }
                  if (!watch('nguoiDaiDien')) {
                    setValue('nguoiDaiDien', cleaned, { shouldDirty: true });
                  }
                } else {
                  const { loaiHinh, tenNgayNgan } = autoDetectBusinessName(e.target.value);
                  if (loaiHinh) {
                    setValue('loaiHinhDoanhNghiep', loaiHinh, { shouldDirty: true });
                  }
                  if (tenNgayNgan && e.target.value !== tenNgayNgan) {
                     setValue('tenKhachHang', tenNgayNgan, { shouldDirty: true });
                  }
                }
              }}
              className="w-full placeholder:text-slate-300 h-8 border border-slate-200 rounded-lg pl-3 pr-8 text-sm"
              placeholder={isIndividual ? "Ví dụ: Nguyễn Văn An, Trần Thị Bích..." : "Mô tả và tên đầy đủ của doanh nghiệp..."}
            />
            {isAiFormatting ? (
              <Loader2 className="w-4 h-4 text-blue-500 absolute right-2 top-2 animate-spin" />
            ) : (
              <Button 
                type="button" 
                onClick={() => smartFormatNameAI(watch('tenKhachHang') || '')}
                className="absolute right-1.5 top-1.5 p-1 text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                title="Dùng AI chuẩn hoá tên (vắt cụm từ)"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {errors.tenKhachHang && <p className="text-xs text-red-650 mt-1">{errors.tenKhachHang.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="loaiHinhDoanhNghiep">
            Loại hình DN / Tổ chức
          </label>
          <select
            id="loaiHinhDoanhNghiep"
            {...register('loaiHinhDoanhNghiep')}
            className="w-full bg-white h-8 border border-slate-200 rounded-lg px-3 text-sm text-slate-800"
          >
            <option value="">Chọn loại hình</option>
            {STANDARDIZED_BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            {watch('loaiHinhDoanhNghiep') && !STANDARDIZED_BUSINESS_TYPES.some(type => type.toUpperCase() === (watch('loaiHinhDoanhNghiep') || '').toUpperCase()) && (
              <option value={watch('loaiHinhDoanhNghiep')}>{watch('loaiHinhDoanhNghiep')}</option>
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="maKh">
            Mã Khách Hàng
          </label>
          <div className="relative">
            <input
              id="maKh"
              {...register('maKh')}
              className="w-full font-mono bg-slate-50 border border-slate-200 text-slate-500 cursor-not-allowed h-8 rounded-lg px-3 text-sm"
              readOnly
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={12} />
            </div>
          </div>
        </div>

        {isIndividual ? (
          <div className="space-y-1 sm:col-span-2">
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-lg p-2.5 flex items-center justify-between text-2xs text-blue-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Users size={13} className="text-blue-600" />
                Khách hàng cá nhân không bắt buộc Mã số thuế (MST) & VietQR. Đã tối ưu tạo nhanh.
              </span>
              <span className="text-3xs font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                CHẾ ĐỘ RÚT GỌN
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 sm:col-span-2">
            <label className="text-2xs font-medium uppercase text-slate-500 flex items-center gap-1.5" htmlFor="maSoThue">
              Mã Số Thuế <span className="text-2xs text-slate-500 font-normal lowercase">(10-13 chữ số)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="maSoThue"
                  autoComplete="off"
                  {...register('maSoThue')}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text) {
                      e.preventDefault();
                      const clean = sanitizeTaxCode(text);
                      setValue('maSoThue', clean, { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  onBlur={(e) => {
                    register('maSoThue').onBlur(e);
                    const clean = sanitizeTaxCode(e.target.value);
                    if (clean !== e.target.value) {
                      setValue('maSoThue', clean, { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  className="w-full font-mono font-semibold h-8 border border-slate-200 rounded-lg px-3 text-sm placeholder:text-slate-300"
                  placeholder="Ví dụ: 0102030405..."
                />
                {isLookingUp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {lookupStatus === 'success' && !isLookingUp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                    <Check size={16} />
                  </div>
                )}
                {lookupStatus === 'error' && !isLookingUp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">
                    <AlertCircle size={16} />
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleTaxLookup}
                disabled={isLookingUp}
                className="h-8 px-4 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 shrink-0 disabled:opacity-50 transition-colors"
              >
                {isLookingUp ? 'Đang tra...' : 'Điền thông tin pháp nhân'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="tinhThanh">
            Tỉnh / Thành phố <span className="text-red-500">*</span>
          </label>
          <select
            id="tinhThanh"
            {...register('tinhThanh')}
            className="w-full bg-white h-8 border border-slate-200 rounded-lg px-3 text-sm text-slate-800"
          >
            <option value="">-- Chọn Tỉnh thành --</option>
            {PROVINCES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
            {watch('tinhThanh') && !PROVINCES.includes(watch('tinhThanh')) && (
              <option value={watch('tinhThanh')}>{watch('tinhThanh')}</option>
            )}
          </select>
          {errors.tinhThanh && <p className="text-xs text-red-650 mt-1">{errors.tinhThanh.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="diaChi">
            Địa chỉ chi tiết <span className="text-red-500">*</span>
          </label>
          <input
            id="diaChi"
            autoComplete="off"
            {...register('diaChi')}
            onBlur={(e) => {
              register('diaChi').onBlur(e);
              setValue('diaChi', cleanProperVietnameseText(e.target.value), { shouldDirty: true });
            }}
            className="w-full h-8 border border-slate-200 rounded-lg px-3 text-sm placeholder:text-slate-300"
            placeholder="Số nhà, tên đường, khu công nghiệp..."
          />
          {errors.diaChi && <p className="text-xs text-red-650 mt-1">{errors.diaChi.message as string}</p>}
        </div>
      </div>
    </div>
  );
}

interface ClassificationSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch?: UseFormWatch<any>;
  nguoiPhuTrachList?: string[];
  loaiKhachHangList: string[];
  tags: string[];
  tagInput: string;
  setTagInput: (val: string) => void;
  handleAddTag: (val: string) => void;
  handleRemoveTag: (val: string) => void;
  currentUserName?: string;
}

export function CustomerFormClassificationSection({
  register,
  errors,
  watch,
  nguoiPhuTrachList: _nguoiPhuTrachList,
  loaiKhachHangList,
  tags,
  tagInput,
  setTagInput,
  handleAddTag,
  handleRemoveTag,
  currentUserName
}: ClassificationSectionProps) {
  const { user, userData } = useAuth();
  const isAdmin = isAdministratorRole(userData, user);
  const currentLoaiKh = watch ? watch('loaiKh') : undefined;

  const effectiveNguoiPhuTrachList = React.useMemo(() => {
    const list = [...(_nguoiPhuTrachList || [])];
    if (currentUserName && !list.includes(currentUserName)) {
      list.push(currentUserName);
    }
    const formVal = watch ? watch('nguoiPhuTrach') : undefined;
    if (formVal && !list.includes(formVal)) {
      list.push(formVal);
    }
    return list;
  }, [_nguoiPhuTrachList, currentUserName, watch]);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Users size={16} className="text-slate-800" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          2. Chăm Sóc & Phân Loại
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="nguoiPhuTrach">
            Người phụ trách {isAdmin && <span className="text-blue-500 font-bold ml-1 text-[10px]">(Admin)</span>}
          </label>
          {isAdmin ? (
            <select
              id="nguoiPhuTrach"
              aria-label="Người phụ trách"
              {...register('nguoiPhuTrach')}
              className="w-full bg-blue-50/30 border border-blue-200 rounded-lg px-3 text-sm text-slate-800 font-medium h-8 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="">-- Chọn người phụ trách --</option>
              {effectiveNguoiPhuTrachList.map((pic: string) => (
                <option key={pic} value={pic}>{pic}</option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <input
                id="nguoiPhuTrach"
                {...register('nguoiPhuTrach')}
                value={watch ? (watch('nguoiPhuTrach') || currentUserName || '') : (currentUserName || '')}
                className="w-full font-medium bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed h-8 rounded-lg pl-3 pr-8 text-sm select-none"
                readOnly
                title="Người phụ trách tự động lấy theo user đang tạo và không được phép thay đổi"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={12} />
              </div>
            </div>
          )}
          {errors.nguoiPhuTrach && <p className="text-xs text-red-650 mt-1">{errors.nguoiPhuTrach.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="loaiKh">
            Phân loại khách hàng <span className="text-red-500">*</span>
          </label>
          <select
            id="loaiKh"
            {...register('loaiKh')}
            className="w-full bg-white h-8 border border-slate-200 rounded-lg px-3 text-sm text-slate-800"
          >
            <option value="">-- Chọn đại lý / hình thức khách --</option>
            {loaiKhachHangList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            {currentLoaiKh && !loaiKhachHangList.includes(currentLoaiKh) && (
              <option value={currentLoaiKh}>{currentLoaiKh}</option>
            )}
          </select>
          {errors.loaiKh && <p className="text-xs text-red-650 mt-1">{errors.loaiKh.message as string}</p>}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="tagInput">
            Phân khúc khách hàng (Tags)
          </label>
          <div className="p-2 border border-slate-200 rounded-lg bg-white space-y-2">
             <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                   <span key={tag} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                      {tag}
                      <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveTag(tag)} />
                   </span>
                ))}
             </div>
             <input
                id="tagInput"
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                   if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                   }
                }}
                onBlur={() => handleAddTag(tagInput)}
                placeholder="Nhập tag rồi ấn Enter (Ví dụ: VIP, Xưởng mộc, ...)"
                className="w-full h-8 text-sm outline-none px-1 placeholder:text-slate-300"
             />
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-2xs font-medium uppercase text-slate-500" htmlFor="nhuCauKhachHang">
            Ghi chú vận hành chi tiết
          </label>
          <textarea
            id="nhuCauKhachHang"
            {...register('nhuCauKhachHang')}
            rows={4}
            className="w-full resize-none p-3 border border-slate-200 rounded-lg text-sm placeholder:text-slate-300"
            placeholder="Các yêu cầu chăm sóc, thông tin tiến độ, hay lưu ý khác..."
          />
        </div>
      </div>
    </div>
  );
}

interface CrossCheckPanelProps {
  watch: UseFormWatch<any>;
  currentUserName?: string;
}

export function CustomerFormCrossCheckPanel({ watch, currentUserName }: CrossCheckPanelProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
          Thông tin rà soát chéo
        </h3>
      </div>
      <div className="flex flex-col gap-3 text-xs font-semibold text-slate-705">
         <div>
           <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Định danh doanh nghiệp</span>
           <p className="text-slate-950 text-sm font-bold text-balance">{watch('tenKhachHang') || '---'}</p>
           <p className="mt-0.5">Mã KH: <span className="font-mono text-slate-800 font-bold">{watch('maKh') || '---'}</span></p>
           <p className="mt-0.5">MST: <span className="font-mono text-slate-800 font-bold">{watch('maSoThue') || '---'}</span></p>
         </div>
         <div className="pt-2 border-t border-slate-100">
           <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Phân loại & Chăm sóc</span>
           <p>Loại KH: <span className="text-slate-800 font-bold">{watch('loaiKh') || '---'}</span></p>
           <p className="mt-0.5">Phụ trách: <span className="text-slate-800 font-bold">{watch('nguoiPhuTrach') || currentUserName || '---'}</span></p>
         </div>
      </div>
    </div>
  );
}
