import React, { useState, useMemo, useCallback } from 'react';
import { Phone, Plus, X, Star, Smartphone, Building2 } from 'lucide-react';
import { detectCarrier, formatPhoneDisplay, normalizePhone } from '@/src/platform/ui/design-system/form/SmartPhoneInput';
import { extractVietnamesePhones } from '../utils/vietnameseTelecomExtractor';

export interface SmartPolyPhoneInputProps {
  id?: string;
  primaryPhone?: string;
  phoneList?: string[];
  onChange: (allPhones: string[], primaryPhone: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

export function SmartPolyPhoneInput({
  id,
  primaryPhone = '',
  phoneList = [],
  onChange,
  disabled = false,
  placeholder = 'Nhập số điện thoại (hỗ trợ dán nhiều số dính chùm)...',
  error
}: SmartPolyPhoneInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);

  // Chuẩn hóa danh sách số điện thoại tổng hợp (gộp primaryPhone và phoneList, tự động bóc tách chuỗi dính chùm)
  const currentPhones = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const ingestRaw = (rawInput?: string) => {
      if (!rawInput || !rawInput.trim()) return;
      const extraction = extractVietnamesePhones(rawInput);
      if (extraction.phones && extraction.phones.length > 0) {
        extraction.phones.forEach(p => {
          if (p.cleaned && !seen.has(p.cleaned)) {
            seen.add(p.cleaned);
            list.push(p.cleaned);
          }
        });
      } else {
        const clean = normalizePhone(rawInput);
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    };

    if (primaryPhone) ingestRaw(primaryPhone);
    (phoneList || []).forEach(ingestRaw);

    return list;
  }, [primaryPhone, phoneList]);

  // Tìm số chính: ưu tiên số di động đầu tiên hoặc số khớp với primaryPhone
  const activePrimary = useMemo(() => {
    if (primaryPhone && currentPhones.includes(primaryPhone)) return primaryPhone;
    const mobile = currentPhones.find(p => p.length === 10 && /^0[35789]/.test(p));
    return mobile || currentPhones[0] || '';
  }, [primaryPhone, currentPhones]);

  // Hàm cập nhật danh sách
  const updateList = useCallback((newList: string[], newPrimary?: string) => {
    const primary = newPrimary && newList.includes(newPrimary) 
      ? newPrimary 
      : (newList.find(p => p.length === 10 && /^0[35789]/.test(p)) || newList[0] || '');
    
    // Đảm bảo số chính luôn đứng đầu danh sách
    const reordered = [primary, ...newList.filter(p => p !== primary)].filter(Boolean);
    onChange(reordered, primary);
  }, [onChange]);

  // Xử lý thêm 1 hoặc nhiều số (hỗ trợ cả chuỗi dính chùm)
  const handleAddRawInput = useCallback((raw: string) => {
    if (!raw || !raw.trim()) return;
    
    // Tự động bóc tách thông minh các chuỗi số dính chùm, cách nhau bởi gạch chéo, dấu phẩy, khoảng trắng
    const extraction = extractVietnamesePhones(raw);
    const extractedList = extraction.phones.map(p => p.cleaned).filter(Boolean);
    
    // Nếu bộ bóc tách không tìm thấy số chuẩn, fallback về chuẩn hóa thông thường
    const toAdd = extractedList.length > 0 ? extractedList : [normalizePhone(raw)].filter(Boolean);
    
    if (toAdd.length === 0) return;

    const updated = [...currentPhones];
    toAdd.forEach(num => {
      if (!updated.includes(num)) {
        updated.push(num);
      }
    });

    updateList(updated, activePrimary || updated[0]);
    setInputValue('');
  }, [currentPhones, activePrimary, updateList]);

  // Xóa 1 số
  const handleRemovePhone = useCallback((phoneToRemove: string) => {
    const remaining = currentPhones.filter(p => p !== phoneToRemove);
    const newPrimary = activePrimary === phoneToRemove ? (remaining[0] || '') : activePrimary;
    updateList(remaining, newPrimary);
  }, [currentPhones, activePrimary, updateList]);

  // Đặt làm số chính
  const handleSetPrimary = useCallback((newPrimaryPhone: string) => {
    updateList(currentPhones, newPrimaryPhone);
  }, [currentPhones, updateList]);

  // Xử lý paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handleAddRawInput(pasted);
  };

  // Xử lý phím Enter / Comma
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRawInput(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* Vùng hiển thị các chip số điện thoại đã nhập */}
      {currentPhones.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-lg min-h-[40px]">
          {currentPhones.map((phone, idx) => {
            const isPrimary = phone === activePrimary;
            const carrier = detectCarrier(phone);
            const isMobile = phone.length === 10 && phone.startsWith('0');
            const displayFormatted = formatPhoneDisplay(phone);

            return (
              <div
                key={phone}
                className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md text-xs font-mono font-semibold border transition-all ${
                  isPrimary
                    ? 'bg-blue-50/90 text-blue-900 border-blue-300 shadow-2xs'
                    : 'bg-white text-slate-800 border-slate-200 shadow-2xs'
                }`}
              >
                {/* Icon loại điện thoại */}
                {isMobile ? (
                  <Smartphone size={13} className={isPrimary ? 'text-blue-600' : 'text-slate-500'} />
                ) : (
                  <Building2 size={13} className="text-slate-400" />
                )}

                {/* Số điện thoại */}
                <span className="tracking-tight">{displayFormatted}</span>

                {/* Badge nhà mạng */}
                {carrier && (
                  <span className={`text-3xs px-1.5 py-0.2 rounded font-sans font-bold border ${carrier.badgeBg}`}>
                    {carrier.name}
                  </span>
                )}

                {/* Nút đặt làm số chính */}
                <button
                  type="button"
                  onClick={() => handleSetPrimary(phone)}
                  disabled={disabled}
                  title={isPrimary ? 'SĐT chính (mặc định nhận ZNS)' : 'Bấm để đặt làm SĐT chính'}
                  className={`p-0.5 rounded transition-colors ${
                    isPrimary 
                      ? 'text-amber-500 hover:text-amber-600 cursor-default' 
                      : 'text-slate-300 hover:text-amber-400 cursor-pointer'
                  }`}
                >
                  <Star size={12} fill={isPrimary ? 'currentColor' : 'none'} />
                </button>

                {/* Nút xóa số */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone)}
                    title="Xóa số này"
                    className="p-0.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ô nhập số điện thoại mới */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type="tel"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                handleAddRawInput(inputValue);
              }
              setIsInputActive(false);
            }}
            onFocus={() => setIsInputActive(true)}
            disabled={disabled}
            placeholder={currentPhones.length > 0 ? '+ Thêm số điện thoại khác cho đầu mối này...' : placeholder}
            className={`w-full h-8 text-xs font-mono px-3 pl-8 bg-white border rounded-lg focus:outline-none transition-colors ${
              error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
        </div>

        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => handleAddRawInput(inputValue)}
            disabled={disabled}
            className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-2xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={13} /> Thêm số
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-3xs text-slate-500 px-1">
        <span>* Hỗ trợ 2-3 số điện thoại cho 1 đầu mối. Dán trực tiếp chuỗi dính chùm để tự động tách.</span>
        {currentPhones.length > 1 && (
          <span className="font-semibold text-blue-700">★ Biểu tượng sao vàng: SĐT chính nhận tin ZNS</span>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
