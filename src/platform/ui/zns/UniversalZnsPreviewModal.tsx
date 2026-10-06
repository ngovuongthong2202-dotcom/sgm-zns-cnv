import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  FileText, 
  User, 
  Phone, 
  BadgePercent, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { ZBS_TEMPLATE_REGISTRY, getZbsTemplateInfo, ZbsTemplateInfo } from '@/src/domain/constants/zbs-template.registry';
import { useAuth } from '@/src/modules/iam';

export interface UniversalZnsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: ZnsMessageType | string;
  entityType: 'CUSTOMER' | 'QUOTATION' | 'CONTRACT' | 'PAYMENT' | 'DELIVERY';
  entityId: string;
  documentCode?: string;
  customerName?: string;
  phone?: string;
  payload: Record<string, any>;
  availablePhones?: Array<{ phone: string; label?: string; isPrimary?: boolean }>;
  onSuccess?: () => void;
  subtype?: string;
}

export function UniversalZnsPreviewModal({
  isOpen,
  onClose,
  messageType,
  entityType,
  entityId,
  documentCode,
  customerName,
  phone: initialPhone,
  payload,
  availablePhones = [],
  onSuccess,
  subtype
}: UniversalZnsPreviewModalProps) {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'zalo'>('live');
  const [selectedPhone, setSelectedPhone] = useState<string>(initialPhone || '');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [currentSubtype, setCurrentSubtype] = useState<string | undefined>(subtype);

  // Sync selected phone
  useEffect(() => {
    if (initialPhone) {
      setSelectedPhone(initialPhone.replace(/\D/g, ''));
    } else if (availablePhones.length > 0) {
      setSelectedPhone(availablePhones[0].phone.replace(/\D/g, ''));
    }
  }, [initialPhone, availablePhones, isOpen]);

  // Lookup Template Info
  const templateInfo = useMemo<ZbsTemplateInfo | undefined>(() => {
    return getZbsTemplateInfo(messageType, currentSubtype);
  }, [messageType, currentSubtype]);

  if (!isOpen || !templateInfo) return null;

  const targetPhone = selectedPhone || initialPhone || payload.phone || payload.sdt || '';

  // Extract mapped values from payload
  const resolvedCustomerName = (
    payload.tenZns || 
    payload.ten_zns || 
    payload.customer_name || 
    customerName || 
    payload.tenKhachHang || 
    'Quý khách hàng'
  ).toString().slice(0, 30);

  const officerName = (
    payload.nguoiPhuTrach || 
    payload.nhanVien || 
    payload.nhan_vien || 
    payload.officer_name || 
    'Ngô Vương Thông'
  ).toString().replace(/\s*\(.*?\)\s*/g, ' ').trim().slice(0, 30);

  const dateValue = payload.ngayKy || payload.ngayBaoGia || payload.ngayThanhToan || payload.ngayGiaoMay || payload.ngayGiaoThucTe || new Date().toLocaleDateString('vi-VN');
  const codeValue = documentCode || payload.soPhieuBaoGia || payload.soHopDong || payload.order_code || payload.soPhieuThu || payload.soPhieuXuat || entityId;

  // Handle send ZNS
  const handleConfirmSend = async () => {
    if (!targetPhone) {
      notify.error('Vui lòng chọn hoặc nhập số điện thoại người nhận hợp lệ.');
      return;
    }

    const duplicateCheck = checkZnsResendAllowed(payload, targetPhone, userData?.role);
    if (!duplicateCheck.allowed) {
      notify.warning(duplicateCheck.reason || 'Tin ZNS đã gửi thành công đến số điện thoại này.');
      return;
    }

    setIsSending(true);
    try {
      await sendZnsAndToast({
        entityId,
        entityType,
        messageType: templateInfo.messageType,
        phone: targetPhone,
        payload: {
          ...payload,
          customer_name: resolvedCustomerName,
          phone: targetPhone,
          sdt: targetPhone,
          nguoiPhuTrach: officerName,
          nguoi_phu_trach: officerName,
          nhan_vien: officerName
        },
        attemptBucket: nextAttempt(),
        userRole: userData?.role,
        forceResend: Boolean(duplicateCheck.isAlreadySent)
      }, `Đang gửi tin ZNS mẫu #${templateInfo.templateId}...`);

      notify.success(`Đã gửi ZNS thành công đến ${targetPhone}!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Send ZNS Error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyTemplateId = () => {
    navigator.clipboard.writeText(templateInfo.templateId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    notify.success(`Đã sao chép ID mẫu ZBS: #${templateInfo.templateId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/30 text-blue-300 border border-blue-400/30">
                <Smartphone className="w-3.5 h-3.5" />
                {templateInfo.businessLabel}
              </span>
              <button
                type="button"
                onClick={handleCopyTemplateId}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition-colors cursor-pointer"
                title="Nhấn để sao chép ID mẫu ZBS"
              >
                ID MẪU ZBS: #{templateInfo.templateId}
                {copiedId ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              </button>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                ĐÃ PHÊ DUYỆT
              </span>
              <span className="text-3xs text-slate-400 font-mono">
                {templateInfo.price} đ/tin • {templateInfo.providerApp}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 truncate">
              {templateInfo.templateName}
            </h2>
            <p className="text-xs text-slate-300 truncate">
              Khách hàng: <strong className="text-white">{resolvedCustomerName}</strong> • Mã chứng từ: <span className="font-mono text-blue-200">{codeValue}</span>
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS SWITCHER */}
        <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'live' 
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Xem trước giao diện thực tế
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('zalo')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'zalo' 
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mẫu chuẩn Zalo Cloud (Official Preview)
            </button>
          </div>

          {/* Subtype toggle if Delivery */}
          {entityType === 'DELIVERY' && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentSubtype('GIAOHANG_ZNS')}
                className={`px-2 py-1 text-3xs font-black rounded-md cursor-pointer transition-colors ${
                  currentSubtype !== 'GIAOHANG_BAOHANH' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #552545 Giao hàng
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubtype('GIAOHANG_BAOHANH')}
                className={`px-2 py-1 text-3xs font-black rounded-md cursor-pointer transition-colors ${
                  currentSubtype === 'GIAOHANG_BAOHANH' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #531052 Bảo hành
              </button>
            </div>
          )}

          {/* Subtype toggle if Payment */}
          {entityType === 'PAYMENT' && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentSubtype(ZnsMessageType.THANH_TOAN_TAT_TOAN)}
                className={`px-2 py-1 text-3xs font-black rounded-md cursor-pointer transition-colors ${
                  templateInfo?.templateId === '552490' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #552490 Tất toán
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubtype(ZnsMessageType.THANH_TOAN_CONG_NO)}
                className={`px-2 py-1 text-3xs font-black rounded-md cursor-pointer transition-colors ${
                  templateInfo?.templateId === '547381' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #547381 Công nợ / Đợt
              </button>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50">
          {/* CỘT TRÁI: MÔ PHỎNG LIVE PREVIEW / ZALO IFRAME (7 COLS) */}
          <div className="md:col-span-7 flex flex-col items-center justify-start">
            {activeTab === 'live' ? (
              /* MÔ PHỎNG SMARTPHONE FRAME */
              <div className="w-full max-w-[360px] bg-white rounded-3xl shadow-xl border-4 border-slate-800 overflow-hidden flex flex-col">
                {/* Phone Notch */}
                <div className="bg-slate-800 text-white text-3xs px-4 py-1 flex items-center justify-between font-mono shrink-0">
                  <span>9:41</span>
                  <div className="w-16 h-2.5 bg-slate-900 rounded-full mx-auto" />
                  <span>5G 100%</span>
                </div>

                {/* Zalo OA App Header */}
                <div className="bg-blue-600 px-3 py-2.5 text-white flex items-center gap-2 shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-700 font-black text-xs shadow-xs shrink-0">
                    SGM
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs truncate">Cơ Khí Sài Gòn (SGM)</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    </div>
                    <span className="text-3xs text-blue-100 block">Zalo Notification Service</span>
                  </div>
                </div>

                {/* ZNS Message Card Body */}
                <div className="p-3 bg-slate-100 flex-1 overflow-y-auto space-y-2 text-xs">
                  <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200/80 space-y-2.5">
                    {/* Header Notification Title */}
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-3xs font-black uppercase text-blue-600 tracking-wider block">
                        THÔNG BÁO TỪ HỆ THỐNG SGM
                      </span>
                      <h4 className="font-black text-slate-800 text-xs sm:text-sm mt-0.5">
                        {templateInfo.templateName}
                      </h4>
                    </div>

                    {/* Parameter Values Rendered */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-400 text-3xs">Kính gửi:</span>
                        <strong className="text-slate-900 text-right font-bold max-w-[200px] truncate">
                          {resolvedCustomerName}
                        </strong>
                      </div>

                      {templateInfo.params.map(param => {
                        if (param.name === 'customer_name' || param.name === 'phone') return null;
                        if (param.name.startsWith('cnv_')) return null;

                        let displayVal = payload[param.name] || payload[param.sourceKey || ''] || '---';
                        if (param.name === 'sl_may' || param.name === 'so_luong') {
                          displayVal = payload.slMay || payload.soLuong || payload.machine_count || '1';
                        } else if (param.name === 'so_ngay') {
                          displayVal = `${payload.soNgayDuKienHoanThanh || payload.soNgay || 30} ngày`;
                        } else if (param.name === 'so_tien' || param.name === 'so_tien_thanh_toan') {
                          displayVal = new Intl.NumberFormat('vi-VN').format(Number(payload.soTien || payload.totalAmount || 0)) + ' đ';
                        } else if (param.name === 'nguoi_phu_trach' || param.name === 'nhan_vien') {
                          displayVal = officerName;
                        } else if (param.name === 'date' || param.name === 'time' || param.name.includes('ngay')) {
                          displayVal = dateValue;
                        }

                        return (
                          <div key={param.name} className="flex justify-between items-start text-3xs sm:text-xs">
                            <span className="text-slate-400">{param.label || param.name}:</span>
                            <span className="font-semibold text-slate-800 text-right max-w-[190px] truncate">
                              {String(displayVal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2 border-t border-slate-100">
                      <button 
                        type="button" 
                        disabled 
                        className="w-full py-1.5 px-3 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs text-center border border-blue-200/60"
                      >
                        {templateInfo.ctaButton?.title || 'Quan tâm OA'}
                      </button>
                    </div>
                  </div>

                  <p className="text-3xs text-center text-slate-400">
                    Tin nhắn tự động được bảo vệ bởi Zalo Cloud Security
                  </p>
                </div>
              </div>
            ) : (
              /* IFRAME CHÍNH THỨC TỪ ZALO CLOUD */
              <div className="w-full h-full min-h-[440px] bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-3xs text-slate-500">
                  <span>Trang Preview Zalo Cloud: #{templateInfo.templateId}</span>
                  <a 
                    href={templateInfo.previewUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    Mở tab mới <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <iframe 
                  src={templateInfo.previewUrl} 
                  title={`Zalo Cloud Template Preview #${templateInfo.templateId}`} 
                  className="w-full flex-1 border-0 min-h-[420px]"
                />
              </div>
            )}
          </div>

          {/* CỘT PHẢI: ĐỐI SOÁT THAM SỐ & LỰA CHỌN SĐT (5 COLS) */}
          <div className="md:col-span-5 space-y-4">
            {/* LỰA CHỌN SỐ ĐIỆN THOẠI */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Số điện thoại nhận tin
                </span>
                <span className="text-3xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {targetPhone ? `0${targetPhone.slice(-9)}` : 'Chưa có'}
                </span>
              </div>

              {availablePhones.length > 1 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {availablePhones.map((p, idx) => (
                    <label 
                      key={p.phone} 
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedPhone === p.phone.replace(/\D/g, '') 
                          ? 'border-blue-500 bg-blue-50/50 font-bold text-blue-900' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="zns_phone_target"
                          checked={selectedPhone === p.phone.replace(/\D/g, '')}
                          onChange={() => setSelectedPhone(p.phone.replace(/\D/g, ''))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{p.phone}</span>
                        {p.label && <span className="text-3xs text-slate-500 font-normal">({p.label})</span>}
                      </div>
                      {p.isPrimary && (
                        <span className="text-3xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                          Chính
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {targetPhone ? `0${targetPhone.slice(-9)}` : 'Thiếu số điện thoại di động'}
                  </span>
                  <span className="text-3xs text-slate-400">Số nhận mặc định</span>
                </div>
              )}
            </div>

            {/* BẢNG ĐỐI SOÁT THAM SỐ (PARAMETER AUDIT TABLE) */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Đối soát tham số ZBS ({templateInfo.params.length} trường)
                </span>
                <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Chuẩn Zalo ≤ 30 ký tự
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {templateInfo.params.map(param => {
                  let val = payload[param.name] || payload[param.sourceKey || ''] || '';
                  if (param.name === 'customer_name') val = resolvedCustomerName;
                  if (param.name === 'nguoi_phu_trach' || param.name === 'nhan_vien') val = officerName;
                  if (param.name === 'phone') val = targetPhone;
                  if (param.name.startsWith('cnv_')) val = '(Auto CNV)';

                  const valStr = String(val);
                  const isOver = param.maxLength && valStr.length > param.maxLength;

                  return (
                    <div key={param.name} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-3xs font-bold text-slate-600">{param.name}</span>
                          {param.require && <span className="text-red-500 text-3xs">*</span>}
                        </div>
                        <span className="text-slate-900 font-medium truncate block mt-0.5 text-xs">
                          {valStr || <em className="text-slate-400">Chưa có</em>}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          isOver ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {valStr.length}/{param.maxLength || 30}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BẢO VỆ CHI PHÍ & LƯU Ý */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-3xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Cơ chế bảo vệ chi phí ZCA
              </div>
              <p>
                Tin nhắn được bảo vệ chống gửi trùng. Chi phí <strong>{templateInfo.price} đ</strong> sẽ được trừ trực tiếp vào số dư Zalo Cloud Account (ZCA) của OA khi Zalo gửi thành công.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSending}
            className="text-xs font-bold"
          >
            Hủy bỏ
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmSend}
            isLoading={isSending}
            disabled={isSending || !targetPhone}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-5 py-2 shadow-xs"
          >
            <Send className="w-4 h-4" />
            Xác nhận gửi ZNS (#{templateInfo.templateId})
          </Button>
        </div>
      </div>
    </div>
  );
}
