import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Building2, Users, Lock, Check, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { useAuth } from '@/src/modules/iam';
import { isAdministratorRole } from '@/src/shared/utils/userProfile';
import { autoDetectBusinessName, generateEnterpriseNameSuggestions, STANDARDIZED_BUSINESS_TYPES } from './CustomerFormHelpers';

import { sanitizeTaxCode, sanitizeText } from '@/src/shared/utils/inputSanitizer';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';
import { SmartTaxCodeInput } from '@/src/design-system';

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
  onMagicPaste?: (text: string) => void;
  existingCustomers?: any[];
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
  PROVINCES,
  onMagicPaste,
  existingCustomers = []
}: ProfileSectionProps) {
  const isIndividual = watch('loaiHinhDoanhNghiep') === 'CÁ NHÂN' || watch('loaiKh') === 'Cá nhân';
  const [magicPasteOpen, setMagicPasteOpen] = React.useState(false);
  const [magicPasteInput, setMagicPasteInput] = React.useState('');

  const currentTax = (watch('maSoThue') || '').trim();
  const currentPhone = (watch('sdt') || '').trim();
  const currentId = watch('id');

  const duplicateTax = React.useMemo(() => {
    if (!currentTax || currentTax.length < 10) return null;
    return (existingCustomers || []).find((c: any) => c.id !== currentId && c.maSoThue && c.maSoThue.trim() === currentTax);
  }, [currentTax, existingCustomers, currentId]);

  const duplicatePhone = React.useMemo(() => {
    if (!currentPhone || currentPhone.length < 9) return null;
    return (existingCustomers || []).find((c: any) => c.id !== currentId && c.sdt && c.sdt.trim() === currentPhone);
  }, [currentPhone, existingCustomers, currentId]);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Realtime Duplicate Warnings */}
      {(duplicateTax || duplicatePhone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 text-2xs text-amber-900 animate-fadeIn">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <span>
            ⚠️ <strong>Cảnh báo trùng lặp:</strong> {duplicateTax ? `MST ${currentTax} đã tồn tại cho khách hàng [${duplicateTax.tenKhachHang} - ${duplicateTax.maKh}]. ` : ''}
            {duplicatePhone ? `SĐT ${currentPhone} đã tồn tại cho khách hàng [${duplicatePhone.tenKhachHang} - ${duplicatePhone.maKh}].` : ''}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {isIndividual ? <Users size={16} className="text-blue-600" /> : <Building2 size={16} className="text-slate-800" />}
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {isIndividual ? '1. Profile Khách Hàng Cá Nhân' : '1. Profile Pháp Nhân'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onMagicPaste && (
            <button
              type="button"
              onClick={() => setMagicPasteOpen(!magicPasteOpen)}
              className="px-2.5 py-1 rounded-md text-2xs font-bold transition-all flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
              title="Dán một đoạn văn bản thô để tự động phân tích và điền các trường"
            >
              <Sparkles size={11} className="text-amber-600" />
              Magic Paste
            </button>
          )}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                if (watch('loaiHinhDoanhNghiep') === 'CÁ NHÂN') {
                  setValue('loaiHinhDoanhNghiep', 'CÔNG TY TNHH', { shouldDirty: true });
                }
                setValue('loaiKh', 'Doanh nghiệp', { shouldDirty: true });
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
      </div>

      {magicPasteOpen && onMagicPaste && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
              ✨ Magic Paste: Dán văn bản bất kỳ để tự trích xuất
            </span>
            <button
              type="button"
              onClick={() => setMagicPasteOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <textarea
            value={magicPasteInput}
            onChange={(e) => setMagicPasteInput(e.target.value)}
            placeholder="Ví dụ: Công ty TNHH Thiết Bị ABC - MST: 0312345678 - 123 Lê Duẩn, Q1, TP.HCM - SĐT: 0903123456 - a@gmail.com"
            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[60px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                onMagicPaste(magicPasteInput);
                setMagicPasteInput('');
                setMagicPasteOpen(false);
              }}
              disabled={!magicPasteInput.trim()}
              className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-2xs font-bold"
            >
              🚀 Phân tích & Tự điền
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2 relative">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-medium uppercase text-slate-500 flex items-center gap-1.5" htmlFor="tenKhachHang">
              {isIndividual ? 'Họ và tên Khách hàng (Cá nhân)' : 'Tên KH / Pháp nhân'} <span className="text-red-500">*</span>
              {!isIndividual && (
                <span className="text-3xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Pháp Lý ĐKKD / Hóa Đơn B2B
                </span>
              )}
            </label>
            {!isIndividual && (watch('tenZns' as any) || watch('tenKhachHang')) && (
              <span className="text-3xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Sparkles size={10} className="text-emerald-600" />
                Tên ZNS: <strong className="font-bold">{String(watch('tenZns' as any) || watch('tenKhachHang')).slice(0, 30)}</strong> ({Math.min(30, String(watch('tenZns' as any) || watch('tenKhachHang')).length)}/30 kt)
              </span>
            )}
          </div>
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
                const val = (e.target.value || '').trim();
                if (!val) return;
                if (isIndividual) {
                  const cleaned = cleanProperVietnameseText(val);
                  if (cleaned !== e.target.value) {
                    setValue('tenKhachHang', cleaned, { shouldDirty: true });
                  }
                  if (!watch('nguoiDaiDien')) {
                    setValue('nguoiDaiDien', cleaned, { shouldDirty: true });
                  }
                } else {
                  const { loaiHinh, tenZns, tenThuongMai } = autoDetectBusinessName(val);
                  if (loaiHinh && !watch('loaiHinhDoanhNghiep')) {
                    setValue('loaiHinhDoanhNghiep', loaiHinh, { shouldDirty: true });
                  }
                  if (tenZns && !watch('tenZns' as any)) {
                    setValue('tenZns' as any, tenZns, { shouldDirty: true });
                  }
                  if (tenThuongMai && !watch('tenThuongMai' as any)) {
                    setValue('tenThuongMai' as any, tenThuongMai, { shouldDirty: true });
                  }
                }
              }}
              className="w-full placeholder:text-slate-300 h-8 border border-slate-200 rounded-lg pl-3 pr-8 text-sm font-semibold text-slate-900"
              placeholder={isIndividual ? "Ví dụ: Nguyễn Văn An, Trần Thị Bích..." : "Tên đầy đủ theo ĐKKD: CÔNG TY TNHH TẬP ĐOÀN TÔN THIÊN TÂN..."}
            />
            {isAiFormatting ? (
              <Loader2 className="w-4 h-4 text-blue-500 absolute right-2 top-2 animate-spin" />
            ) : (
              <Button 
                type="button" 
                onClick={() => smartFormatNameAI(watch('tenKhachHang') || '')}
                className="absolute right-1.5 top-1.5 p-1 text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                title="Dùng AI trích xuất Tên ZNS và Tên Thương Mại"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {errors.tenKhachHang && <p className="text-xs text-red-650 mt-1">{errors.tenKhachHang.message as string}</p>}

          {/* Interactive Suggestion Chips */}
          {!isIndividual && (watch('tenKhachHang') || '').trim().length >= 3 && (() => {
            const identityResult = generateEnterpriseNameSuggestions(watch('tenKhachHang') || '');
            if (!identityResult?.suggestions || identityResult.suggestions.length === 0) return null;
            const currentVal = (watch('tenKhachHang') || '').trim();
            const currentZns = (watch('tenZns' as any) || '').trim();
            return (
              <div className="pt-1.5 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                <span className="text-3xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-500" /> Gợi ý định danh &amp; ZNS:
                </span>
                {identityResult.suggestions.map((sug) => {
                  const isSelected = sug.value.toLowerCase() === currentVal.toLowerCase() || sug.value.toLowerCase() === currentZns.toLowerCase();
                  return (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() => {
                        if (sug.category === 'LEGAL') {
                          setValue('tenKhachHang', sug.value, { shouldDirty: true });
                        } else {
                          setValue('tenZns' as any, sug.value, { shouldDirty: true });
                          setValue('tenThuongMai' as any, sug.value, { shouldDirty: true });
                        }
                        if (identityResult.loaiHinh && !watch('loaiHinhDoanhNghiep')) {
                          setValue('loaiHinhDoanhNghiep', identityResult.loaiHinh, { shouldDirty: true });
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-3xs font-bold border transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-900 border-blue-300 font-black' 
                          : `${sug.badgeClass} hover:scale-105 active:scale-95`
                      }`}
                      title={`Bấm để chọn: ${sug.label} (${sug.charCount} ký tự)`}
                    >
                      <span className="opacity-80 text-3xs font-normal">[{sug.badgeText}]</span>
                      <span>{sug.value}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
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
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <SmartTaxCodeInput
                  id="maSoThue"
                  value={watch('maSoThue')}
                  onChange={(tax: string) => {
                    setValue('maSoThue', tax, { shouldDirty: true, shouldValidate: true });
                  }}
                  onLookup={handleTaxLookup}
                  isLookingUp={isLookingUp}
                  error={Boolean(errors.maSoThue)}
                  compact
                />
              </div>
              <Button
                type="button"
                onClick={handleTaxLookup}
                disabled={isLookingUp || !watch('maSoThue')}
                className="h-8 px-4 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 shrink-0 disabled:opacity-50 transition-colors"
              >
                {isLookingUp ? 'Đang tra...' : 'Điền thông tin pháp nhân'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-700" htmlFor="tinhThanh">
              Tỉnh / Thành phố <span className="text-red-500">*</span>
            </label>
            {watch('tinhThanh') && (
              <span className="text-3xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                <Check size={10} className="text-emerald-700" /> Đã chọn
              </span>
            )}
          </div>
          <select
            id="tinhThanh"
            {...register('tinhThanh')}
            className="w-full bg-white h-8 border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 text-sm font-medium text-slate-900"
          >
            <option value="">-- Chọn Tỉnh thành --</option>
            {PROVINCES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
            {watch('tinhThanh') && !PROVINCES.includes(watch('tinhThanh')) && (
              <option value={watch('tinhThanh')}>{watch('tinhThanh')}</option>
            )}
          </select>
          {errors.tinhThanh && <p className="text-xs text-red-650 mt-1 font-semibold">{errors.tinhThanh.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase tracking-wider text-slate-700" htmlFor="diaChi">
            Địa chỉ chi tiết <span className="text-red-500">*</span>
          </label>
          <input
            id="diaChi"
            autoComplete="off"
            {...register('diaChi')}
            onChange={(e) => {
              register('diaChi').onChange(e);
              const val = e.target.value;
              const detected = detectProvinceFromAddress(val, PROVINCES);
              if (detected && detected !== watch('tinhThanh')) {
                setValue('tinhThanh', detected, { shouldDirty: true, shouldValidate: true });
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text) {
                e.preventDefault();
                const clean = cleanProperVietnameseText(sanitizeText(text));
                setValue('diaChi', clean, { shouldDirty: true, shouldValidate: true });
                const detected = detectProvinceFromAddress(clean, PROVINCES);
                if (detected && detected !== watch('tinhThanh')) {
                  setValue('tinhThanh', detected, { shouldDirty: true, shouldValidate: true });
                }
              }
            }}
            onBlur={(e) => {
              register('diaChi').onBlur(e);
              const clean = cleanProperVietnameseText(sanitizeText(e.target.value));
              setValue('diaChi', clean, { shouldDirty: true });
              const detected = detectProvinceFromAddress(clean, PROVINCES);
              if (detected && detected !== watch('tinhThanh')) {
                setValue('tinhThanh', detected, { shouldDirty: true, shouldValidate: true });
              }
            }}
            className="w-full h-8 border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400"
            placeholder="Số nhà, tên đường, khu công nghiệp, quận/huyện, tỉnh/thành..."
          />
          {errors.diaChi && <p className="text-xs text-red-650 mt-1 font-semibold">{errors.diaChi.message as string}</p>}
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
             <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
               <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Gợi ý nhanh:</span>
               {['VIP', 'Xưởng mộc', 'Cơ khí chế tạo', 'Đại lý phân phối', 'Nội thất & Decor', 'Bảo hành định kỳ']
                 .filter(s => !tags.includes(s))
                 .map(s => (
                   <button
                     key={s}
                     type="button"
                     onClick={() => handleAddTag(s)}
                     className="text-3xs font-medium bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2 py-0.5 rounded-full border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                   >
                     + {s}
                   </button>
                 ))}
             </div>
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
