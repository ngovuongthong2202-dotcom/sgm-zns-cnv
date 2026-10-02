import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ArrowRight, 
  Link2, 
  Edit3,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { sanitizeTaxCode } from '@/src/shared/utils/inputSanitizer';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';
import { calculateBusinessNameSimilarity } from '@/src/modules/customers/ui/utils/customerConsolidationEngine';
import { computeMaxCustomerSequence } from '@/src/modules/customers/ui/hooks/useCustomerForm';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { notify } from '@/src/shared/utils/notify';
import { generateEnterpriseNameSuggestions } from '@/src/modules/customers/ui/components/CustomerFormHelpers';
import { useAuth } from '@/src/modules/iam';

export interface ErpCustomerCandidate {
  tenKhachHang: string;
  maSoThue?: string;
  sdt?: string;
  nguoiDaiDien?: string;
  diaChi?: string;
  erpOrderCode?: string;
  erpCustomerCode?: string;
  nguoiPhuTrach?: string;
}

interface ErpCustomerIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  erpCustomerData: ErpCustomerCandidate;
  existingCustomers?: any[];
  onCustomerConfirmed: (newCustomer: any) => Promise<void> | void;
  onLinkExistingCustomer?: (matchedCustomer: any) => void;
  onEditManually?: (prefill: any) => void;
}

export function ErpCustomerIngestionModal({
  isOpen,
  onClose,
  erpCustomerData,
  existingCustomers = [],
  onCustomerConfirmed,
  onLinkExistingCustomer,
  onEditManually
}: ErpCustomerIngestionModalProps) {
  const { userData, user } = useAuth();
  const currentOfficer = userData?.displayName || user?.displayName || userData?.userName || 'Ngô Vương Thông (Admin)';
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chuẩn hóa dữ liệu ban đầu
  const [cleanName, setCleanName] = useState(() => 
    cleanProperVietnameseText(erpCustomerData.tenKhachHang || '')
  );
  const [cleanTax, setCleanTax] = useState(() => 
    sanitizeTaxCode(erpCustomerData.maSoThue || '')
  );
  const [cleanAddress, setCleanAddress] = useState(() => 
    (erpCustomerData.diaChi || '').trim()
  );
  const [cleanPhone, setCleanPhone] = useState(() => 
    (erpCustomerData.sdt || '').trim().replace(/[\s\-_]/g, '')
  );
  const [cleanRepresentative, setCleanRepresentative] = useState(() => 
    cleanProperVietnameseText(erpCustomerData.nguoiDaiDien || '')
  );

  const detectedProvince = useMemo(() => {
    return detectProvinceFromAddress(cleanAddress) || 'TP. Hồ Chí Minh';
  }, [cleanAddress]);

  // Chẩn đoán trùng lặp trước khi tạo (Pre-Flight Duplicate Diagnostics)
  const diagnostics = useMemo(() => {
    if (!Array.isArray(existingCustomers) || existingCustomers.length === 0) return null;

    for (const c of existingCustomers) {
      if (c.isArchived || c.mergedInto || (c as any).is_archived || (c as any).merged_into) continue;

      // 1. Khớp chính xác Mã số thuế
      const cTax = sanitizeTaxCode(c.maSoThue || '');
      if (cleanTax && cTax && cleanTax.length >= 8 && cleanTax === cTax) {
        return {
          type: 'EXACT_TAX',
          customer: c,
          title: 'Trùng khớp Mã Số Thuế',
          description: `Pháp nhân này đã tồn tại trong CRM với mã ${c.maKh} (${c.tenKhachHang}). Bạn nên liên kết trực tiếp.`
        };
      }

      // 2. Khớp Số điện thoại đại diện
      const cPhone = (c.sdt || '').replace(/[\s\-_]/g, '');
      if (cleanPhone && cPhone && cleanPhone.length >= 9 && cleanPhone === cPhone) {
        return {
          type: 'EXACT_PHONE',
          customer: c,
          title: 'Trùng Số Điện Thoại',
          description: `Số điện thoại ${cleanPhone} đã được đăng ký bởi khách hàng ${c.maKh} (${c.tenKhachHang}).`
        };
      }

      // 3. Khớp tương đồng tên công ty (Jaccard > 0.7)
      const sim = calculateBusinessNameSimilarity(cleanName, c.tenKhachHang);
      if (sim >= 0.72) {
        return {
          type: 'FUZZY_NAME',
          customer: c,
          title: `Tên tương đồng ${Math.round(sim * 100)}%`,
          description: `Tên khách hàng tương đồng cao với ${c.maKh} (${c.tenKhachHang}). Bạn có muốn dùng khách hàng này không?`
        };
      }
    }

    return null;
  }, [cleanTax, cleanPhone, cleanName, existingCustomers]);

  const handleCreateCustomer = async () => {
    if (!cleanName.trim()) {
      notify.error('Tên khách hàng pháp nhân không được để trống');
      return;
    }

    setIsSubmitting(true);
    try {
      const highestSeq = computeMaxCustomerSequence(existingCustomers);
      const nextMaKh = `KH${String(highestSeq + 1).padStart(4, '0')}`;
      const identity = generateEnterpriseNameSuggestions(cleanName);

      const payload: any = {
        maKh: nextMaKh,
        tenKhachHang: cleanName,
        tenPhapLy: identity.tenPhapLy || cleanName,
        tenThuongMai: identity.tenThuongMai || cleanName,
        tenZns: identity.tenZns || cleanName,
        maSoThue: cleanTax,
        sdt: cleanPhone,
        nguoiDaiDien: cleanRepresentative || cleanName,
        nguoiPhuTrach: erpCustomerData.nguoiPhuTrach || currentOfficer,
        diaChi: cleanAddress,
        tinhThanh: detectedProvince,
        loaiKh: cleanTax ? 'Doanh nghiệp' : 'Cá nhân',
        source: 'ERP_SALES_ORDER',
        ghiChu: `Tiếp nhận tự động từ Đơn hàng ERP #${erpCustomerData.erpOrderCode || erpCustomerData.erpCustomerCode || ''}`,
        contacts: [
          {
            id: `ct_${Date.now()}`,
            danhXung: 'Anh/Chị',
            nguoiDaiDien: cleanRepresentative || cleanName,
            sdt: cleanPhone,
            chucVu: 'Đại diện',
            chiNhanh: 'Trụ sở chính',
            isPrimary: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const res = await apiCreateEntity('customer', payload);
      const createdCustomer = {
        ...payload,
        id: res?.id || payload.id || `CUST_${Date.now()}`
      };

      await onCustomerConfirmed(createdCustomer);
      onClose();
    } catch (err: any) {
      notify.error(`Lỗi khi khởi tạo khách hàng: ${err?.message || 'Không rõ nguyên nhân'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[250]" 
            />
          </Dialog.Overlay>

          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col focus:outline-none"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <Dialog.Title className="text-base font-black tracking-tight text-white">
                        Tiếp Nhận Khách Hàng Từ Đơn Hàng ERP
                      </Dialog.Title>
                      {erpCustomerData.erpOrderCode && (
                        <span className="font-mono text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40">
                          {erpCustomerData.erpOrderCode}
                        </span>
                      )}
                    </div>
                    <Dialog.Description className="text-xs text-blue-100/80 mt-1 leading-relaxed">
                      Khách hàng trên ERP chưa có trong danh mục CRM. Hệ thống đã tự động bóc tách & chuẩn hóa thông tin để bạn xem trước.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      onClick={onClose}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  
                  {/* Cảnh báo chẩn đoán trùng lặp nếu phát hiện */}
                  {diagnostics && (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Phát hiện đối tác tương đồng: {diagnostics.title}</span>
                      </div>
                      <p className="text-2xs text-amber-800 leading-relaxed font-medium">
                        {diagnostics.description}
                      </p>
                      {onLinkExistingCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            onLinkExistingCustomer(diagnostics.customer);
                            onClose();
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer border-0"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Liên kết ngay với {diagnostics.customer.maKh} ({diagnostics.customer.tenKhachHang})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Business Identity Card Preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-3xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Hồ sơ pháp nhân chuẩn bị khởi tạo
                      </span>
                      <span className="text-3xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        {cleanTax ? 'Doanh Nghiệp' : 'Cá Nhân'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Tên khách hàng */}
                      <div>
                        <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                          Tên Khách Hàng / Công Ty <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text"
                          value={cleanName}
                          onChange={(e) => setCleanName(e.target.value)}
                          className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:border-blue-600 outline-none"
                          placeholder="Tên doanh nghiệp..."
                        />
                      </div>

                      {/* Grid 2 cột: MST & SĐT */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                            Mã Số Thuế (MST)
                          </label>
                          <input 
                            type="text"
                            value={cleanTax}
                            onChange={(e) => setCleanTax(sanitizeTaxCode(e.target.value))}
                            className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white focus:border-blue-600 outline-none"
                            placeholder="VD: 0312345678"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                            Số Điện Thoại Liên Hệ
                          </label>
                          <input 
                            type="text"
                            value={cleanPhone}
                            onChange={(e) => setCleanPhone(e.target.value)}
                            className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white focus:border-blue-600 outline-none"
                            placeholder="VD: 0987654321"
                          />
                        </div>
                      </div>

                      {/* Grid 2 cột: Đại diện & Tỉnh thành */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                            Người Đại Diện / Đầu Mối
                          </label>
                          <input 
                            type="text"
                            value={cleanRepresentative}
                            onChange={(e) => setCleanRepresentative(e.target.value)}
                            className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                            placeholder="Người đại diện..."
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                            Tỉnh / Thành Phố (Tự nhận diện)
                          </label>
                          <div className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-blue-800 bg-blue-50/60 flex items-center">
                            📍 {detectedProvince}
                          </div>
                        </div>
                      </div>

                      {/* Địa chỉ */}
                      <div>
                        <label className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                          Địa Chỉ Trụ Sở / Giao Hàng
                        </label>
                        <input 
                          type="text"
                          value={cleanAddress}
                          onChange={(e) => setCleanAddress(e.target.value)}
                          className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:border-blue-600 outline-none"
                          placeholder="Địa chỉ trụ sở hoặc điểm giao hàng..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-2xs text-blue-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Sau khi bấm xác nhận, hệ thống sẽ cấp mã khách hàng mới (<code>KHxxxx</code>) và tự động gán vào phiếu báo giá hiện tại.</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    className="w-full sm:w-auto h-9 font-bold px-3 order-3 sm:order-1"
                  >
                    Bỏ qua
                  </Button>

                  {onEditManually && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onEditManually({
                          tenKhachHang: cleanName,
                          maSoThue: cleanTax,
                          diaChi: cleanAddress,
                          tinhThanh: detectedProvince,
                          sdt: cleanPhone,
                          nguoiDaiDien: cleanRepresentative
                        });
                      }}
                      className="w-full sm:w-auto h-9 font-bold px-3.5 border-slate-300 text-slate-700 hover:bg-slate-100 order-2 sm:order-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Mở form đầy đủ
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || !cleanName.trim()}
                    onClick={handleCreateCustomer}
                    className="w-full sm:w-auto h-9 font-extrabold px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xs order-1 sm:order-3"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {isSubmitting ? 'Đang tạo...' : 'Xác nhận Khởi tạo & Gán vào Báo Giá'}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </AnimatePresence>
    </Dialog.Root>
  );
}
