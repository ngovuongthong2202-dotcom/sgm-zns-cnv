import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Send, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  FileText, 
  Phone, 
  Info,
  RotateCcw,
  Sparkles,
  BookmarkCheck,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';
import { formatZnsDate } from '@/src/shared/utils/formatDate';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { getZbsTemplateInfo, ZbsTemplateInfo } from '@/src/domain/constants/zbs-template.registry';
import { useAuth } from '@/src/modules/iam';
import { ZnsOfficialPhonePreview } from './components/ZnsOfficialPhonePreview';

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

  // Smart Parameter Control Studio State
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({});
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const [isSavedDefault, setIsSavedDefault] = useState(false);

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

  // Extract initial standard values
  const resolvedCustomerName = useMemo(() => {
    return (
      payload.tenZns || 
      payload.ten_zns || 
      payload.customer_name || 
      customerName || 
      payload.tenKhachHang || 
      'Quý khách hàng'
    ).toString().slice(0, 30);
  }, [payload, customerName]);

  const officerName = useMemo(() => {
    return (
      payload.nguoiPhuTrach || 
      payload.nhanVien || 
      payload.nhan_vien || 
      payload.officer_name || 
      'Ngô Vương Thông'
    ).toString().replace(/\s*\(.*?\)\s*/g, ' ').trim().slice(0, 30);
  }, [payload]);

  const rawDateVal = payload.date || payload.ngayKy || payload.ngayBaoGia || payload.ngayThanhToan || payload.time || payload.ngayGiaoMay || payload.ngayGiaoThucTe;
  const dateValue = formatZnsDate(rawDateVal);
  const codeValue = documentCode || payload.soHopDong || payload.soPhieuBaoGia || payload.order_code || payload.soPhieuThu || payload.soPhieuXuat || entityId;
  const targetPhone = selectedPhone || initialPhone || payload.phone || payload.sdt || '';

  // Smart Initial Parameter Derivations (Ưu tiên logic đúng cho từng template)
  const initialDefaultParams = useMemo<Record<string, string>>(() => {
    if (!templateInfo) return {};
    const defaults: Record<string, string> = {};

    defaults.customer_name = resolvedCustomerName;
    defaults.phone = targetPhone;

    // Hợp đồng (533068): order_code BẮT BUỘC ưu tiên Số Hợp Đồng (HD-2026-xxxx)
    if (templateInfo.templateId === '533068' || entityType === 'CONTRACT') {
      defaults.order_code = String(payload.soHopDong || payload.maHopDong || documentCode || 'HD-2026-0002').slice(0, 30);
      defaults.ngay_ky = formatZnsDate(payload.ngayKy || payload.ngay_ky || dateValue);
      defaults.so_ngay = String(payload.soNgayDuKienHoanThanh || payload.thoiGianThucHien || payload.soNgay || payload.so_ngay || '30');
      defaults.so_phieu = String(payload.soPhieuBaoGia || payload.soPhieu || payload.soHopDong || 'BGM-2026-1149').slice(0, 30);
      defaults.nhan_vien = officerName;
    }

    // Báo giá (533064)
    if (templateInfo.templateId === '533064' || entityType === 'QUOTATION') {
      defaults.so_phieu_bao_gia = String(payload.soPhieuBaoGia || documentCode || 'BGM-2026-1149').slice(0, 30);
      defaults.ngay_bao_gia = formatZnsDate(payload.ngayBaoGia || payload.ngay_bao_gia || dateValue);
      defaults.ngay_het_han = formatZnsDate(payload.ngayHetHan || payload.ngay_het_han || dateValue);
      defaults.sl_may = String(payload.slMay || payload.soLuong || '1');
      defaults.nguoi_phu_trach = officerName;
    }

    // Thanh toán Tất toán (552490)
    if (templateInfo.templateId === '552490') {
      defaults.so_don_hang = String(payload.soDonHang || payload.So_don_hang || payload.soHopDong || 'DH-ERP-001-26').slice(0, 30);
      defaults.so_hop_dong = String(payload.soHopDong || payload.So_hop_dong || payload.soDonHang || 'HD-2026-0002').slice(0, 30);
      defaults.ngay_thanh_toan = formatZnsDate(payload.ngayThanhToan || payload.ngay_thanh_toan || dateValue);
    }

    // Thanh toán Công nợ (547381)
    if (templateInfo.templateId === '547381') {
      defaults.order_code = String(payload.soHopDong || payload.soDonHang || documentCode || 'HD-2026-0002').slice(0, 30);
      defaults.time = formatZnsDate(payload.ngayThanhToan || payload.time || dateValue);
      defaults.so_luong = String(payload.soLuong || payload.slMay || '1');
    }

    // Giao hàng (552545)
    if (templateInfo.templateId === '552545' || entityType === 'DELIVERY') {
      defaults.So_hop_dong = String(payload.soHopDong || payload.So_hop_dong || 'HD-2026-0002').slice(0, 30);
      defaults.So_don_hang = String(payload.soDonHang || payload.So_don_hang || 'DH-ERP-001-26').slice(0, 30);
      defaults.so_phieu_xuat = String(payload.soPhieuXuat || payload.deliveryId || documentCode || 'PX-2026-008').slice(0, 30);
      defaults.ngay_giao_may = formatZnsDate(payload.ngayGiaoMay || payload.ngayGiaoThucTe || dateValue);
      defaults.danh_sach_ma_may = String(
        payload.danh_sach_ma_may || 
        payload.danhSachMaMay || 
        (Array.isArray(payload.products) ? payload.products.map((p: any) => p.serialNumber || p.maMay || p.serial).filter(Boolean).join(', ') : '') ||
        'Theo phiếu xuất kho'
      ).slice(0, 200);
      defaults.so_luong = String(payload.soLuong || payload.slMay || '1');
      defaults.dvt = String(payload.dvt || 'Máy').slice(0, 30);
    }

    // Kích hoạt bảo hành (531052)
    if (templateInfo.templateId === '531052') {
      defaults.ma_bao_hanh = String(
        payload.ma_bao_hanh || 
        payload.serial || 
        (Array.isArray(payload.danhSachMaMay) ? payload.danhSachMaMay[0] : null) || 
        payload.soPhieuXuat || 
        'BH-SGM-001'
      ).slice(0, 30);
      defaults.product = String(payload.product || (payload.soHopDong ? ('Theo ' + payload.soHopDong) : 'Theo HĐ SGM')).slice(0, 30);
      defaults.date = formatZnsDate(payload.date || dateValue);
    }

    // CNV params
    defaults.cnv_campaign_id = String(payload.cnv_campaign_id || 'SGM_CSKH_2026');
    defaults.cnv_zns_template_id = String(templateInfo.templateId);

    // Kiểm tra các trường đã lưu trong localStorage nếu có
    try {
      const storedKey = `sgm_zns_pref_${templateInfo.templateId}`;
      const saved = localStorage.getItem(storedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.order_code_source === 'soDonHang' && payload.soDonHang) {
          defaults.order_code = String(payload.soDonHang).slice(0, 30);
        }
      }
    } catch {}

    return defaults;
  }, [templateInfo, payload, entityType, documentCode, resolvedCustomerName, targetPhone, dateValue, officerName]);

  // Reset paramOverrides khi đổi template hoặc mở modal
  useEffect(() => {
    setParamOverrides({});
  }, [templateInfo?.templateId, isOpen]);

  if (!isOpen || !templateInfo) return null;

  // Active parameter values (Kết hợp Default + User Overrides)
  const activeParams: Record<string, string> = {
    ...initialDefaultParams,
    ...paramOverrides,
    customer_name: paramOverrides.customer_name || resolvedCustomerName,
    phone: targetPhone
  };

  const handleParamChange = (key: string, val: string) => {
    setParamOverrides(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleResetParam = (key: string) => {
    setParamOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveDefault = () => {
    try {
      const prefKey = `sgm_zns_pref_${templateInfo.templateId}`;
      const prefData = {
        templateId: templateInfo.templateId,
        savedAt: new Date().toISOString(),
        order_code_source: activeParams.order_code === payload.soDonHang ? 'soDonHang' : 'soHopDong'
      };
      localStorage.setItem(prefKey, JSON.stringify(prefData));
      setIsSavedDefault(true);
      setTimeout(() => setIsSavedDefault(false), 3000);
      notify.success(`Đã lưu quy tắc mapping làm mặc định cho Mẫu #${templateInfo.templateId}!`);
    } catch (err: any) {
      notify.error('Lỗi khi lưu cấu hình mặc định: ' + err.message);
    }
  };

  // Handle confirm send ZNS
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
      const sanitizedPayload: Record<string, any> = {
        ...payload,
        ...activeParams,
        customer_name: activeParams.customer_name,
        phone: targetPhone,
        sdt: targetPhone,
        nguoiPhuTrach: activeParams.nguoi_phu_trach || activeParams.nhan_vien || officerName,
        nguoi_phu_trach: activeParams.nguoi_phu_trach || activeParams.nhan_vien || officerName,
        nhan_vien: activeParams.nhan_vien || activeParams.nguoi_phu_trach || officerName,
        order_code: activeParams.order_code || payload.soHopDong || documentCode
      };

      // Chuẩn hóa ngày tháng sang dd/MM/yyyy
      if (sanitizedPayload.ngay_bao_gia) sanitizedPayload.ngay_bao_gia = formatZnsDate(sanitizedPayload.ngay_bao_gia);
      if (sanitizedPayload.ngay_het_han) sanitizedPayload.ngay_het_han = formatZnsDate(sanitizedPayload.ngay_het_han);
      if (sanitizedPayload.ngay_ky) sanitizedPayload.ngay_ky = formatZnsDate(sanitizedPayload.ngay_ky);
      if (sanitizedPayload.sign_date) sanitizedPayload.sign_date = formatZnsDate(sanitizedPayload.sign_date);
      if (sanitizedPayload.ngay_thanh_toan) sanitizedPayload.ngay_thanh_toan = formatZnsDate(sanitizedPayload.ngay_thanh_toan);
      if (sanitizedPayload.payment_date) sanitizedPayload.payment_date = formatZnsDate(sanitizedPayload.payment_date);
      if (sanitizedPayload.time) sanitizedPayload.time = formatZnsDate(sanitizedPayload.time);
      if (sanitizedPayload.ngay_giao_may) sanitizedPayload.ngay_giao_may = formatZnsDate(sanitizedPayload.ngay_giao_may);
      if (sanitizedPayload.delivery_date) sanitizedPayload.delivery_date = formatZnsDate(sanitizedPayload.delivery_date);
      if (sanitizedPayload.date) sanitizedPayload.date = formatZnsDate(sanitizedPayload.date);

      await sendZnsAndToast({
        entityId,
        entityType,
        messageType: templateInfo.messageType,
        phone: targetPhone,
        payload: sanitizedPayload,
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER CHÍNH THỨC */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
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
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. THANH TABS CHUYỂN ĐỔI PREVIEW & PHÂN LOẠI MẪU */}
        <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'live' 
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              Xem trước giao diện thực tế (Smartphone)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('zalo')}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'zalo' 
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-4 h-4 text-blue-600" />
              Mẫu chuẩn Zalo Cloud (Official Preview)
            </button>
          </div>

          {/* Subtype toggle nếu Delivery */}
          {entityType === 'DELIVERY' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentSubtype('GIAOHANG_ZNS')}
                className={`px-2.5 py-1 text-3xs font-black rounded-lg cursor-pointer transition-colors ${
                  currentSubtype !== 'GIAOHANG_BAOHANH' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #552545 Giao hàng
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubtype('GIAOHANG_BAOHANH')}
                className={`px-2.5 py-1 text-3xs font-black rounded-lg cursor-pointer transition-colors ${
                  currentSubtype === 'GIAOHANG_BAOHANH' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #531052 Bảo hành (500đ)
              </button>
            </div>
          )}

          {/* Badge Mẫu ZNS Thanh Toán Hợp Nhất 646935 */}
          {entityType === 'PAYMENT' && (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-3xs font-black text-emerald-800 uppercase tracking-wider">
                Mẫu ZNS #646935 (Xác nhận TT & Điểm VIP)
              </span>
            </div>
          )}
        </div>

        {/* 3. THÂN CHÍNH: 2 CỘT TƯƠNG TÁC */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/60">
          
          {/* CỘT TRÁI: LIVE SMARTPHONE PREVIEW / IFRAME ZALO (6.5 COLS) */}
          <div className="md:col-span-6 lg:col-span-6 flex flex-col items-center justify-start">
            {activeTab === 'live' ? (
              <ZnsOfficialPhonePreview 
                templateInfo={templateInfo}
                values={activeParams}
                hoveredFieldKey={hoveredParam}
                targetPhone={targetPhone}
              />
            ) : (
              <div className="w-full h-full min-h-[500px] bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">Trang Preview Zalo Cloud: #{templateInfo.templateId}</span>
                  <a 
                    href={templateInfo.previewUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    Mở tab mới <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <iframe 
                  src={templateInfo.previewUrl} 
                  title={`Zalo Cloud Template Preview #${templateInfo.templateId}`} 
                  className="w-full flex-1 border-0 min-h-[480px]"
                />
              </div>
            )}
          </div>

          {/* CỘT PHẢI: SMART PARAMETER CONTROL STUDIO (6 COLS) */}
          <div className="md:col-span-6 lg:col-span-6 space-y-4">
            
            {/* 1. LỰA CHỌN SỐ ĐIỆN THOẠI NHẬN TIN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Số điện thoại nhận tin
                </span>
                <span className="text-3xs font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                  {targetPhone ? `0${targetPhone.slice(-9)}` : 'Chưa có'}
                </span>
              </div>

              {availablePhones.length > 1 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {availablePhones.map((p) => (
                    <label 
                      key={p.phone} 
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedPhone === p.phone.replace(/\D/g, '') 
                          ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900 shadow-2xs' 
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
                <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {targetPhone ? `0${targetPhone.slice(-9)}` : 'Thiếu số điện thoại di động'}
                  </span>
                  <span className="text-3xs text-slate-400">Số nhận mặc định</span>
                </div>
              )}
            </div>

            {/* 2. BẢNG ĐIỀU KHIỂN & TÙY BIẾN THAM SỐ (SMART PARAMETER STUDIO) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Tùy biến tham số ZBS ({templateInfo.params.length} trường)
                  </span>
                  <span className="text-4xs text-slate-400 block mt-0.5">
                    Click sửa trực tiếp hoặc chọn nguồn dữ liệu tương thích
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveDefault}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-3xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                    title="Lưu cấu hình ánh xạ này làm mặc định cho doanh nghiệp"
                  >
                    {isSavedDefault ? <BookmarkCheck className="w-3 h-3 text-emerald-600" /> : <Sparkles className="w-3 h-3 text-blue-600" />}
                    {isSavedDefault ? 'Đã lưu mặc định!' : 'Lưu mặc định'}
                  </button>
                  <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    ≤ 30 ký tự
                  </span>
                </div>
              </div>

              {/* Danh sách các tham số ZBS có khả năng chỉnh sửa trực tiếp */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
                {templateInfo.params.map(param => {
                  if (param.name === 'phone' || param.name.startsWith('cnv_')) return null;

                  const currentVal = activeParams[param.name] ?? '';
                  const initialVal = initialDefaultParams[param.name] ?? '';
                  const isModified = currentVal !== initialVal;
                  const maxLength = param.maxLength || 30;
                  const isOverLimit = currentVal.length > maxLength;

                  return (
                    <div 
                      key={param.name} 
                      onMouseEnter={() => setHoveredParam(param.name)}
                      onMouseLeave={() => setHoveredParam(null)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        hoveredParam === param.name 
                          ? 'border-emerald-400 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-300' 
                          : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-3xs font-black text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {param.name}
                          </span>
                          <span className="text-3xs text-slate-500 font-medium truncate">
                            {param.label}
                          </span>
                          {param.require && <span className="text-red-500 text-3xs font-bold">*</span>}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetParam(param.name)}
                              className="text-4xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-0.5 p-0.5 hover:bg-amber-50 rounded cursor-pointer"
                              title="Khôi phục về giá trị gốc của chứng từ"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Gốc
                            </button>
                          )}
                          <span className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            isOverLimit 
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-400' 
                              : isModified 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-200/70 text-slate-700'
                          }`}>
                            {currentVal.length}/{maxLength}
                          </span>
                        </div>
                      </div>

                      {/* NÚT CHỌN NHANH NGUỒN DỮ LIỆU (SOURCE PICKER) CHO CÁC BIẾN ĐA NGUỒN */}
                      {param.name === 'order_code' && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {payload.soHopDong && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('order_code', String(payload.soHopDong).slice(0, 30))}
                              className={`text-3xs px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                currentVal === String(payload.soHopDong).slice(0, 30)
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              Số HĐ: {String(payload.soHopDong).slice(0, 15)}
                            </button>
                          )}
                          {payload.soDonHang && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('order_code', String(payload.soDonHang).slice(0, 30))}
                              className={`text-3xs px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                currentVal === String(payload.soDonHang).slice(0, 30)
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              Số ĐH: {String(payload.soDonHang).slice(0, 15)}
                            </button>
                          )}
                          {payload.soHopDong && payload.soDonHang && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('order_code', `${payload.soHopDong} | ${payload.soDonHang}`.slice(0, 30))}
                              className="text-3xs px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium cursor-pointer"
                            >
                              Kết hợp HĐ/ĐH
                            </button>
                          )}
                        </div>
                      )}

                      {param.name === 'customer_name' && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleParamChange('customer_name', resolvedCustomerName)}
                            className={`text-3xs px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                              currentVal === resolvedCustomerName
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            Tên ZNS: {resolvedCustomerName.slice(0, 18)}...
                          </button>
                          {payload.tenKhachHang && payload.tenKhachHang !== resolvedCustomerName && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('customer_name', String(payload.tenKhachHang).slice(0, 30))}
                              className="text-3xs px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium cursor-pointer"
                            >
                              Tên Pháp Lý
                            </button>
                          )}
                        </div>
                      )}

                      {param.name === 'so_phieu' && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {payload.soPhieuBaoGia && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('so_phieu', String(payload.soPhieuBaoGia).slice(0, 30))}
                              className={`text-3xs px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                currentVal === String(payload.soPhieuBaoGia).slice(0, 30)
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              Báo giá: {payload.soPhieuBaoGia}
                            </button>
                          )}
                          {payload.soHopDong && (
                            <button
                              type="button"
                              onClick={() => handleParamChange('so_phieu', String(payload.soHopDong).slice(0, 30))}
                              className="text-3xs px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium cursor-pointer"
                            >
                              Số HĐ: {payload.soHopDong}
                            </button>
                          )}
                        </div>
                      )}

                      {/* INLINE EDITABLE INPUT */}
                      <input 
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        placeholder={`Nhập ${param.label}...`}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 font-medium transition-all ${
                          isOverLimit 
                            ? 'border-red-400 focus:ring-red-400 text-red-900 bg-red-50/30' 
                            : isModified
                            ? 'border-blue-400 focus:ring-blue-500 text-blue-900'
                            : 'border-slate-300 focus:ring-blue-500 text-slate-800'
                        }`}
                      />
                      {isOverLimit && (
                        <span className="text-4xs text-red-600 font-bold block mt-1">
                          ⚠️ Cảnh báo: Vượt quá {maxLength} ký tự, Zalo sẽ từ chối tin nhắn này!
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. BẢO VỆ CHI PHÍ ZCA & LƯU Ý */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-3xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                Cơ chế bảo vệ chi phí ZCA & Bản quyền thương hiệu
              </div>
              <p>
                Tin nhắn được bảo vệ chống gửi trùng. Chi phí <strong>{templateInfo.price} đ</strong> sẽ được trừ trực tiếp vào số dư Zalo Cloud Account (ZCA) của OA khi Zalo gửi thành công.
              </p>
            </div>
          </div>
        </div>

        {/* 4. FOOTER ĐIỀU KHIỂN */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button 
            type="button" 
            variant="default" 
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
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5 shadow-sm rounded-xl cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Xác nhận gửi ZNS (#{templateInfo.templateId})
          </Button>
        </div>
      </div>
    </div>
  );
}
