import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle, ShieldCheck } from 'lucide-react';

interface TrackingPhoneGateProps {
  isUnlocked: boolean;
  activePhone: string;
  maskedPhone: string;
  portalMode: 'QUOTATION' | 'CONTRACT' | 'ORDER' | 'PAYMENT';
  onVerify: (digits: string) => boolean | Promise<boolean>;
  phoneError?: string;
  setPhoneError: (msg: string) => void;
}

export function TrackingPhoneGate({
  isUnlocked,
  activePhone,
  maskedPhone,
  portalMode,
  onVerify,
  phoneError,
  setPhoneError
}: TrackingPhoneGateProps) {
  const [digits, setDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isUnlocked) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold shadow-2xs self-start">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Đã xác thực bảo mật thành công</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = digits.replace(/\D/g, '');
    if (clean.length !== 4) {
      setPhoneError('Vui lòng nhập chính xác 4 số cuối của SĐT nhận thông báo');
      return;
    }

    setIsSubmitting(true);
    setPhoneError('');
    try {
      const ok = await onVerify(clean);
      if (!ok) {
        setPhoneError('4 số cuối không khớp với hồ sơ khách hàng nhận thông báo');
      }
    } catch {
      setPhoneError('Lỗi kiểm tra bảo mật, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleText = portalMode === 'QUOTATION' 
    ? 'Xem Đầy Đủ Bảng Giá & Thông Số Kỹ Thuật'
    : portalMode === 'CONTRACT'
    ? 'Xem Đầy Đủ Chi Tiết Hợp Đồng & Giá Trị Ký Kết'
    : 'Xem Đầy Đủ Lịch Sử Thanh Toán & Điểm VIP';

  return (
    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900">
            {titleText}
          </h4>
          <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
            Nhập 4 số cuối SĐT của Quý khách (<span className="tabular-nums font-bold text-slate-900">{maskedPhone}</span>) để mở khóa xem giá và dữ liệu chi tiết.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 shrink-0">
        <input
          type="password"
          maxLength={4}
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, ''))}
          placeholder="4 số cuối"
          className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-center text-sm tabular-nums text-slate-900 tracking-widest focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs font-bold"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở khóa</span>
            </>
          )}
        </button>
      </form>

      {phoneError && (
        <div className="w-full text-2xs text-red-600 flex items-center gap-1 font-medium -mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{phoneError}</span>
        </div>
      )}
    </div>
  );
}
