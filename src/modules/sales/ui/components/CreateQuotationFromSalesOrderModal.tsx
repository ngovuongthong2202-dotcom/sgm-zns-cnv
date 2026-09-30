import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  X, 
  FileText, 
  Building2, 
  Package, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { useMutation } from '@/src/hooks/useMutation';
import { 
  ErpSalesOrderData, 
  parseTareDecomposition, 
  resolveCustomerFromErp, 
  convertErpLinesToProductItems,
  adaptSalesOrderToQuotation
} from '../utils/salesOrderAdapter';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  quotations: Quotation[];
  userOfficer?: string;
  onQuotationConstructed: (quotationDraft: Partial<Quotation>, newCustomerCreated?: Customer) => void;
}

export function CreateQuotationFromSalesOrderModal({
  isOpen,
  onClose,
  customers = [],
  quotations = [],
  userOfficer,
  onQuotationConstructed
}: Props) {
  const [orderCode, setOrderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [erpData, setErpData] = useState<ErpSalesOrderData | null>(null);
  const [autoProvisionCustomer, setAutoProvisionCustomer] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { createRecord: createCustomerRecord } = useMutation<Customer>({ collection: 'customers' });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrderCode('');
      setErpData(null);
      setSelectedImage(null);
      setAutoProvisionCustomer(true);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedImage) setSelectedImage(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedImage, onClose]);

  if (!isOpen) return null;

  const handleLookup = async (codeToSearch?: string) => {
    const target = (codeToSearch || orderCode).trim();
    if (!target) {
      notify.warning('Vui lòng nhập mã đơn hàng hoặc dán link API');
      return;
    }

    setLoading(true);
    try {
      let cleanCode = target.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
      if (cleanCode.includes('/')) {
        const parts = cleanCode.split('/');
        cleanCode = parts[parts.length - 1].trim();
      }

      const res = await fetch(`/api/quotations/erp-sales-order/${encodeURIComponent(cleanCode)}`);
      const payload = await res.json();

      if (!payload.success || !payload.data) {
        notify.error(payload.error || `Không tìm thấy đơn hàng "${cleanCode}" trên hệ thống ERP`);
        setErpData(null);
        return;
      }

      setErpData(payload.data);
      notify.success(`Đã tải thành công đơn hàng ${payload.data.code || cleanCode}`);
    } catch (err: any) {
      notify.error('Lỗi kết nối khi tra cứu đơn hàng ERP: ' + (err.message || 'Lỗi mạng'));
      setErpData(null);
    } finally {
      setLoading(false);
    }
  };

  // Derive preview data if loaded
  const customerResolution = erpData ? resolveCustomerFromErp(erpData, customers) : null;
  const tareInfo = erpData ? parseTareDecomposition(erpData.content) : null;
  const productItems = erpData ? convertErpLinesToProductItems(erpData.lines || [], tareInfo || undefined) : [];
  const aggs = productItems.length > 0 ? aggregateProducts(productItems) : null;

  // Generate sequence code for new quote
  const generateNextQuoteCode = () => {
    const year = new Date().getFullYear();
    const prefix = 'BGVT-';
    let maxSeq = 0;
    (quotations || []).forEach(q => {
      const code = q.soPhieuBaoGia || '';
      if (code.startsWith(prefix)) {
        const match = code.match(/(\d+)$/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    return `${prefix}${year}-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  const handleConstructQuotation = async () => {
    if (!erpData) return;

    let targetCustomer = customerResolution?.matchedCustomer || null;

    // If customer not found and auto-provision is enabled, create new customer in CRM
    if (!targetCustomer && autoProvisionCustomer) {
      try {
        const year = new Date().getFullYear();
        let nextCustomerCode = `KH-${year}-0001`;
        try {
          const res = await fetch('/api/customers/generate-makh', { method: 'POST' });
          const json = await res.json();
          if (json.success && json.maKh) nextCustomerCode = json.maKh;
        } catch {
          // Fallback based on existing customers count
          const maxSeq = customers.reduce((max, c) => {
            const m = (c.maKh || '').match(/(\d+)$/);
            return m ? Math.max(max, parseInt(m[1], 10) || 0) : max;
          }, 0);
          nextCustomerCode = `KH-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
        }

        const snapshot = erpData.customer_snapshot || {};
        const newCustomerData: Partial<Customer> = {
          maKh: nextCustomerCode,
          tenKhachHang: snapshot.customer_name || 'Khách hàng ERP',
          maSoThue: snapshot.tax_code || '',
          sdt: snapshot.phone || erpData.our_contact_person || '',
          diaChi: erpData.delivery_address || snapshot.address || '',
          nguoiDaiDien: snapshot.representative || '',
          loaiKh: 'Doanh nghiệp',
          nguoiPhuTrach: userOfficer || '',
          ngayTao: new Date().toISOString(),
          tags: ['ERP_IMPORT', 'SALES_ORDER'],
        };

        const created = await createCustomerRecord(newCustomerData as Customer);
        targetCustomer = created;
        notify.success(`Đã tự động khởi tạo khách hàng mới [${nextCustomerCode}] vào CRM`);
      } catch (err: any) {
        notify.warning('Không thể tự động tạo khách hàng, tiếp tục nạp dữ liệu tạm: ' + err.message);
      }
    }

    const nextQuoteCode = generateNextQuoteCode();
    const quotationDraft = adaptSalesOrderToQuotation(erpData, targetCustomer, nextQuoteCode, userOfficer);

    onQuotationConstructed(quotationDraft, targetCustomer || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Dựng Báo Giá từ Đơn Hàng ERP
                </h3>
                <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                  Nexus 50.0
                </span>
              </div>
              <p className="text-2xs text-slate-400 mt-0.5">
                Kết nối &amp; phân giải phả hệ trực tiếp từ API <code className="text-blue-300 font-mono">/api/public/sales-orders/:code</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Quick Test Chips */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                placeholder="Nhập mã đơn hàng (VD: 11-KDDH2609-019) hoặc dán toàn bộ đường link API..."
                className="w-full h-11 pl-4 pr-10 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
              />
              {orderCode && (
                <button
                  type="button"
                  onClick={() => setOrderCode('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => handleLookup()}
              disabled={loading || !orderCode.trim()}
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>ĐANG TRA CỨU...</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>TRA CỨU &amp; PHÂN GIẢI</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-2xs text-slate-500">
            <span className="font-semibold text-slate-600">Thử nhanh:</span>
            <button
              type="button"
              onClick={() => {
                setOrderCode('11-KDDH2609-019');
                handleLookup('11-KDDH2609-019');
              }}
              className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-mono font-medium transition-colors cursor-pointer"
            >
              11-KDDH2609-019
            </button>
            <span className="text-slate-400">• Đơn phế liệu mẫu có 11 phiếu cân bàn và PDF xác nhận</span>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!erpData ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
                <FileText size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Sẵn sàng phân giải dữ liệu</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Nhập mã số đơn hàng trên hệ thống ERP (ví dụ <code className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">11-KDDH2609-019</code>) để tự động trích xuất vật tư, số cân và chứng từ đính kèm.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Top Row: Customer & Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Customer Card */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-blue-600" />
                      <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700">
                        Khách Hàng Pháp Nhân
                      </span>
                    </div>
                    {customerResolution?.matchedCustomer ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 size={11} />
                        Khớp CRM: {customerResolution.matchedCustomer.maKh}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertCircle size={11} />
                        Chưa có trong CRM
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm">
                      {erpData.customer_snapshot?.customer_name || 'Chưa có tên công ty'}
                    </div>
                    <div className="flex items-center gap-3 text-2xs text-slate-600">
                      <span>MST: <strong className="font-mono text-slate-800">{erpData.customer_snapshot?.tax_code || erpData.customer_id || 'Không có'}</strong></span>
                      <span>SĐT: <strong className="font-mono text-slate-800">{erpData.customer_snapshot?.phone || erpData.our_contact_person || 'Theo thỏa thuận'}</strong></span>
                    </div>
                    <div className="text-2xs text-slate-500 line-clamp-2">
                      Địa chỉ: {erpData.delivery_address || erpData.customer_snapshot?.address || 'Theo thỏa thuận'}
                    </div>
                  </div>

                  {!customerResolution?.matchedCustomer && (
                    <label className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-2xs font-semibold text-blue-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoProvisionCustomer}
                        onChange={(e) => setAutoProvisionCustomer(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tự động cấp mã KH mới và lưu vào CRM khi khởi tạo báo giá</span>
                    </label>
                  )}
                </div>

                {/* 2. Order Header & Tare Weight Card */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Scale size={15} className="text-emerald-600" />
                      <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700">
                        Thông Tin Đơn Hàng &amp; Cân Trừ Bì
                      </span>
                    </div>
                    <span className="font-mono text-2xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {erpData.code}
                    </span>
                  </div>

                  {tareInfo?.isTareDecomposed ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-3xs uppercase font-bold text-slate-400 block">Tổng Cân Gộp</span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {tareInfo.grossTotal.toLocaleString('vi-VN')} kg
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-amber-200 bg-amber-50/20">
                          <span className="text-3xs uppercase font-bold text-amber-600 block">Trừ Bì ({tareInfo.barrels.length} Thùng)</span>
                          <span className="text-xs font-mono font-bold text-amber-700">
                            -{tareInfo.tareTotal.toLocaleString('vi-VN')} kg
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-emerald-200 bg-emerald-50/30">
                          <span className="text-3xs uppercase font-bold text-emerald-700 block">Khối Lượng Thực Xuất</span>
                          <span className="text-xs font-mono font-black text-emerald-800">
                            {tareInfo.netTotal.toLocaleString('vi-VN')} kg
                          </span>
                        </div>
                      </div>
                      <p className="text-3xs text-slate-500 italic line-clamp-2">
                        {erpData.content}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="text-2xs text-slate-500 line-clamp-3">{erpData.content || 'Không có ghi chú nội dung'}</p>
                      <div className="text-2xs text-slate-400 pt-1">
                        Ngày lập: {erpData.order_date ? erpData.order_date.substring(0, 10) : 'N/A'} • Phương thức: {erpData.payment_method || 'CK'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments / Scale Tickets Gallery */}
              {Array.isArray(erpData.files) && erpData.files.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={15} className="text-indigo-600" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Hồ Sơ Chứng Từ &amp; Ảnh Phiếu Cân Thực Tế ({erpData.files.length} tệp)
                      </h4>
                    </div>
                    <span className="text-3xs text-slate-400">Sẽ được tự động đồng bộ sang Phiếu Giao Hàng &amp; Báo Giá</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {erpData.files.map((file, idx) => {
                      const isPdf = file.fileName.toLowerCase().endsWith('.pdf');
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isPdf) window.open(file.url, '_blank');
                            else setSelectedImage(file.url);
                          }}
                          className="group relative bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-lg p-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                        >
                          {isPdf ? (
                            <FileText size={24} className="text-red-500" />
                          ) : (
                            <div className="w-full h-14 rounded bg-slate-200 overflow-hidden relative">
                              <img
                                src={file.url}
                                alt={file.fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <span className="text-3xs font-medium text-slate-700 group-hover:text-blue-700 line-clamp-1 w-full" title={file.fileName}>
                            {file.fileName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data Matrix 9 Columns */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Danh Mục Sản Phẩm &amp; Phân Giải Tài Chính (9 Trường Chuẩn)
                    </h4>
                  </div>
                  <span className="font-mono text-2xs font-bold text-slate-600">
                    {productItems.length} dòng vật tư
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[840px]">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 text-3xs font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="p-2.5 text-center w-10">STT</th>
                        <th className="p-2.5 w-36">1. Mã Vật Tư</th>
                        <th className="p-2.5 min-w-[200px]">2. Tên Vật Tư</th>
                        <th className="p-2.5 text-center w-16">3. ĐVT</th>
                        <th className="p-2.5 text-right w-24">4. Số Lượng</th>
                        <th className="p-2.5 text-right w-28">5. Đơn Giá</th>
                        <th className="p-2.5 text-right w-28">6-7. Chiết Khấu</th>
                        <th className="p-2.5 text-right w-28">8-9. Thuế VAT</th>
                        <th className="p-2.5 text-right w-36">Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {productItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 text-center font-mono font-bold text-slate-400 text-2xs">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-blue-700 text-2xs">
                            {item.productId || item.item_code || '-'}
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">
                            <div>{item.productName}</div>
                            {item.quyCach && (
                              <div className="text-3xs text-emerald-700 font-medium">{item.quyCach}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-slate-600 font-medium text-2xs">
                            {item.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {Number(item.quantity).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-800">
                            {Number(item.price).toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="p-2.5 text-right font-mono text-2xs text-amber-700">
                            {item.discountPct ? `${item.discountPct}%` : '-'}
                            {item.discountAmount ? ` (${item.discountAmount.toLocaleString('vi-VN')} ₫)` : ''}
                          </td>
                          <td className="p-2.5 text-right font-mono text-2xs text-sky-700">
                            <div>{item.vatPct ?? 10}%</div>
                            <div className="text-3xs font-bold">+{Number(item.taxAmount || 0).toLocaleString('vi-VN')} ₫</div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {Number(item.subtotalAfterTax || 0).toLocaleString('vi-VN')} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-mono text-xs select-none">
                      <tr>
                        <td colSpan={5} className="p-3 text-slate-500 text-2xs">
                          {aggs?.totalAfterTax ? readVietnameseCurrency(aggs.totalAfterTax) : ''}
                        </td>
                        <td colSpan={3} className="p-3 text-right font-sans font-bold text-2xs text-slate-600 uppercase">
                          Tổng Giá Trị Thanh Toán:
                        </td>
                        <td className="p-3 text-right font-black text-sm text-blue-700 whitespace-nowrap">
                          {Number(aggs?.totalAfterTax || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Action Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-2xs text-slate-500">
            {erpData && (
              <span>
                Mã dự kiến: <strong className="font-mono text-slate-800">{generateNextQuoteCode()}</strong> • Phân loại: <strong>VẬT TƯ</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Hủy Bỏ
            </Button>
            <Button
              type="button"
              disabled={!erpData || loading}
              onClick={handleConstructQuotation}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <span>KHỞI TẠO BÁO GIÁ NGAY</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

      </div>

      {/* Image Fullscreen Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2 shadow-2xl">
            <img 
              src={selectedImage} 
              alt="Phiếu cân thực tế" 
              className="max-h-[85vh] w-auto object-contain mx-auto rounded"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
