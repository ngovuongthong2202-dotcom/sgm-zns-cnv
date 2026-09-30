import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  X, 
  FileText, 
  Building2, 
  Package, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Image as ImageIcon,
  Search,
  MapPin,
  Phone,
  UserCheck,
  User,
  Sparkles
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
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';
import { VIETNAM_PROVINCES_63 } from '@/src/hooks/useSharedFields';
import { classifyErpCustomer, ErpCustomerClassificationResult } from '../utils/erpCustomerClassifier';

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

  // Typeahead search states
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic user-customizable values from preview
  const [customMobilePhone, setCustomMobilePhone] = useState('');
  const [customProvince, setCustomProvince] = useState('');
  const [customRepresentative, setCustomRepresentative] = useState('');

  // Cognitive Customer Classification States
  const [classifiedCustomer, setClassifiedCustomer] = useState<ErpCustomerClassificationResult | null>(null);
  const [customerType, setCustomerType] = useState<'Doanh nghiệp' | 'Cá nhân'>('Doanh nghiệp');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customSalutation, setCustomSalutation] = useState<string>('Anh/Chị');

  const { createRecord: createCustomerRecord } = useMutation<Customer>({ collection: 'customers' });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrderCode('');
      setErpData(null);
      setSelectedImage(null);
      setAutoProvisionCustomer(true);
      setSearchResults([]);
      setShowSearchDropdown(false);
      setCustomMobilePhone('');
      setCustomProvince('');
      setCustomRepresentative('');
      setClassifiedCustomer(null);
      setCustomerType('Doanh nghiệp');
      setCustomCustomerName('');
      setCustomSalutation('Anh/Chị');
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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync province, representative & cognitive customer classification when erpData is loaded
  useEffect(() => {
    if (erpData) {
      const snap = erpData.customer_snapshot || {};
      const detected = detectProvinceFromAddress(erpData.delivery_address || snap.address || '', VIETNAM_PROVINCES_63) || 'TP. Hồ Chí Minh';
      setCustomProvince(detected);
      setCustomRepresentative(snap.representative || '');
      setCustomMobilePhone('');

      const classification = classifyErpCustomer(
        snap.customer_name || erpData.content || '',
        snap.tax_code || erpData.customer_id || '',
        snap.representative || '',
        snap.phone || ''
      );
      setClassifiedCustomer(classification);
      setCustomerType(classification.detectedType);
      setCustomCustomerName(classification.cleanCustomerName);
      setCustomSalutation(classification.salutation);
    }
  }, [erpData]);

  // Live Typeahead search debounced
  useEffect(() => {
    const q = orderCode.trim();
    if (!isOpen || q.length < 2 || q.startsWith('http')) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/quotations/erp-sales-orders-search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSearchResults(json.data);
          setShowSearchDropdown(true);
        } else {
          setSearchResults([]);
          setShowSearchDropdown(false);
        }
      } catch {
        setSearchResults([]);
        setShowSearchDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [orderCode, isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (codeToSearch?: string) => {
    const target = (codeToSearch || orderCode).trim();
    if (!target) {
      notify.warning('Vui lòng nhập mã đơn hàng hoặc dán link API');
      return;
    }

    setShowSearchDropdown(false);
    setLoading(true);
    try {
      let cleanCode = target.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
      
      // Chỉ bóc tách phần đuôi nếu chuỗi là URL HTTP/HTTPS
      if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
        try {
          const parsedUrl = new URL(cleanCode);
          const parts = parsedUrl.pathname.split('/').filter(Boolean);
          cleanCode = decodeURIComponent(parts[parts.length - 1] || '');
        } catch {
          // Giữ nguyên
        }
      }

      const res = await fetch(`/api/quotations/erp-sales-order?code=${encodeURIComponent(cleanCode)}`);
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

  const handleSelectSuggestedOrder = (item: any) => {
    setShowSearchDropdown(false);
    const chosenCode = item.code || item.original_code;
    setOrderCode(chosenCode);
    handleLookup(chosenCode);
  };

  // Derive preview data if loaded
  const customerResolution = erpData ? resolveCustomerFromErp(erpData, customers) : null;
  const tareInfo = erpData ? parseTareDecomposition(erpData.content) : null;
  const productItems = erpData ? convertErpLinesToProductItems(erpData.lines || [], tareInfo || undefined) : [];
  const aggs = productItems.length > 0 ? aggregateProducts(productItems) : null;

  // Phone analysis
  const rawCustomerPhone = erpData?.customer_snapshot?.phone || '';
  const isLandline = rawCustomerPhone.startsWith('02') || (rawCustomerPhone.length > 0 && !/^(03|05|07|08|09)\d{8}$/.test(rawCustomerPhone.replace(/\D/g, '')));

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
    const snapshot = erpData.customer_snapshot || {};
    const finalPhone = customMobilePhone.trim() || rawCustomerPhone || '';
    const finalProvince = customProvince || detectProvinceFromAddress(erpData.delivery_address || snapshot.address || '', VIETNAM_PROVINCES_63) || 'TP. Hồ Chí Minh';
    const finalRep = customRepresentative.trim() || snapshot.representative || '';

    const isIndiv = customerType === 'Cá nhân';
    const finalCustomerName = customCustomerName.trim() || classifiedCustomer?.cleanCustomerName || snapshot.customer_name || 'Khách hàng ERP';

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

        const newCustomerData: Partial<Customer> = {
          maKh: nextCustomerCode,
          tenKhachHang: finalCustomerName,
          tenPhapLy: isIndiv ? undefined : (classifiedCustomer?.cleanCustomerName || snapshot.customer_name),
          tenThuongMai: classifiedCustomer?.tenThuongMai || finalCustomerName,
          tenZns: isIndiv ? finalCustomerName.slice(0, 29) : (classifiedCustomer?.tenZns || finalCustomerName.slice(0, 29)),
          maSoThue: isIndiv ? '' : (snapshot.tax_code || ''),
          sdt: finalPhone,
          diaChi: erpData.delivery_address || snapshot.address || '',
          tinhThanh: finalProvince,
          nguoiDaiDien: finalRep || (isIndiv ? finalCustomerName : 'Đại diện'),
          loaiKh: customerType,
          loaiHinhDoanhNghiep: isIndiv ? 'CÁ NHÂN' : (classifiedCustomer?.loaiHinhDoanhNghiep || 'CÔNG TY TNHH'),
          nguoiPhuTrach: userOfficer || erpData.created_by_name || 'Quản trị viên',
          contacts: [
            {
              danhXung: isIndiv ? customSalutation : 'Đại diện',
              nguoiDaiDien: finalRep || (isIndiv ? finalCustomerName : 'Đại diện'),
              sdt: finalPhone,
              chucVu: isIndiv ? 'Chủ sở hữu / Cá nhân' : 'Đại diện',
              chiNhanh: 'Trụ sở chính'
            },
            ...(rawCustomerPhone && customMobilePhone.trim() && rawCustomerPhone !== customMobilePhone.trim() ? [{
              danhXung: 'Văn phòng',
              nguoiDaiDien: 'Điện thoại bàn',
              sdt: rawCustomerPhone,
              chucVu: 'Điện thoại bàn',
              chiNhanh: 'Trụ sở chính'
            }] : [])
          ],
          ngayTao: new Date().toISOString(),
          ngayCapNhat: new Date().toISOString(),
          tags: ['ERP_IMPORT', 'SALES_ORDER', isIndiv ? 'INDIVIDUAL_CUSTOMER' : 'CORPORATE_CUSTOMER'],
        };

        const created = await createCustomerRecord(newCustomerData as Customer);
        targetCustomer = created;
        notify.success(`Đã tự động khởi tạo khách hàng mới [${nextCustomerCode}] (${customerType}) vào CRM`);
      } catch (err: any) {
        notify.warning('Không thể tự động tạo khách hàng, tiếp tục nạp dữ liệu tạm: ' + err.message);
      }
    }

    const nextQuoteCode = generateNextQuoteCode();
    const quotationDraft = adaptSalesOrderToQuotation(erpData, targetCustomer, nextQuoteCode, userOfficer);

    // Apply custom dynamic user edits to quotation draft
    if (finalCustomerName) quotationDraft.tenKhachHang = finalCustomerName;
    if (finalPhone) quotationDraft.sdt = finalPhone;
    if (finalProvince) (quotationDraft as any).tinhThanh = finalProvince;
    if (finalRep) quotationDraft.nguoiDaiDien = finalRep;
    quotationDraft.phanLoaiKhach = customerType;

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
                  Nexus 53.0
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

        {/* Search Bar & Live Typeahead Dropdown */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 shrink-0 space-y-2 relative" ref={searchContainerRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                placeholder="Nhập mã đơn hàng ERP (VD: 11-KDDH2609-019, 238/VT-SGM/2026) hoặc tên công ty..."
                className="w-full h-11 pl-4 pr-10 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
              />
              {isSearching && (
                <div className="absolute right-9 top-1/2 -translate-y-1/2 text-blue-600 animate-spin">
                  <RefreshCw size={14} />
                </div>
              )}
              {orderCode && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderCode('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={14} />
                </button>
              )}

              {/* Typeahead Suggestions Popover */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 bg-slate-50 text-3xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Gợi ý đơn hàng ERP phù hợp ({searchResults.length})</span>
                    <span>Bấm để nạp nhanh</span>
                  </div>
                  {searchResults.map((item, idx) => (
                    <div
                      key={item._id || item.id || idx}
                      onClick={() => handleSelectSuggestedOrder(item)}
                      className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {item.code}
                          </span>
                          {item.original_code && item.original_code !== item.code && (
                            <span className="font-mono text-2xs text-slate-500">
                              (Gốc: {item.original_code})
                            </span>
                          )}
                          <span className="text-3xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                            {item.so_approval_status === 'approved' || item.so_approval_status === 'accepted' ? 'Đã duyệt' : item.so_approval_status || 'ERP'}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 truncate">
                          {item.customer_name_display || item.content || 'Khách hàng ERP'}
                        </div>
                        {item.content && (
                          <div className="text-2xs text-slate-500 truncate">
                            {item.content}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-800">
                          {Number(item.total_after_tax || 0).toLocaleString('vi-VN')} ₫
                        </div>
                        <div className="text-3xs text-slate-400 font-mono">
                          {item.order_date ? item.order_date.substring(0, 10) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
            <button
              type="button"
              onClick={() => {
                setOrderCode('238/VT-SGM/2026');
                handleLookup('238/VT-SGM/2026');
              }}
              className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-mono font-medium transition-colors cursor-pointer"
            >
              238/VT-SGM/2026
            </button>
            <span className="text-slate-400">• Tự động nhận diện Tỉnh/Thành &amp; Phân giải phả hệ</span>
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
                  Nhập trường <code className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">code</code> (ví dụ: <strong className="font-mono">11-KDDH2609-019</strong>, <strong className="font-mono">238/VT-SGM/2026</strong>) hoặc tên công ty để tự động trích xuất vật tư, số cân và chứng từ đính kèm.
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
                      {customerType === 'Doanh nghiệp' ? <Building2 size={15} className="text-blue-600" /> : <User size={15} className="text-violet-600" />}
                      <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700">
                        Khách Hàng ({customerType === 'Doanh nghiệp' ? 'Doanh Nghiệp / Pháp Nhân' : 'Cá Nhân'})
                      </span>
                    </div>

                    {/* Adaptive Switcher UI */}
                    <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerType('Doanh nghiệp');
                          if (erpData?.customer_snapshot?.customer_name) {
                            setCustomCustomerName(erpData.customer_snapshot.customer_name);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-3xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          customerType === 'Doanh nghiệp' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 size={11} /> Doanh nghiệp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerType('Cá nhân');
                          if (classifiedCustomer?.cleanCustomerName) {
                            setCustomCustomerName(classifiedCustomer.cleanCustomerName);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-3xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          customerType === 'Cá nhân' ? 'bg-white text-violet-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <User size={11} /> Cá nhân
                      </button>
                    </div>
                  </div>

                  {/* AI Confidence Badge */}
                  {classifiedCustomer && (
                    <div className={`p-2 rounded-lg text-3xs font-medium flex items-center gap-1.5 border animate-fadeIn ${
                      customerType === 'Cá nhân' 
                        ? 'bg-violet-50 text-violet-900 border-violet-200' 
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}>
                      <Sparkles size={11} className={customerType === 'Cá nhân' ? 'text-violet-600 shrink-0' : 'text-blue-600 shrink-0'} />
                      <span className="truncate">
                        <strong>AI Gợi Ý:</strong> {classifiedCustomer.confidenceReason}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-xs">
                    {/* Editable Customer Name */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-3xs text-slate-500 font-semibold uppercase">
                        <span>{customerType === 'Doanh nghiệp' ? 'Tên Pháp Nhân / ĐKKD' : 'Họ và Tên Khách Hàng (Cá Nhân)'}</span>
                        {customerResolution?.matchedCustomer && (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Khớp CRM: {customerResolution.matchedCustomer.maKh}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        placeholder="Nhập tên khách hàng..."
                        className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-2xs text-slate-600">
                      <div>
                        {customerType === 'Doanh nghiệp' ? (
                          <>MST: <strong className="font-mono text-slate-800">{erpData.customer_snapshot?.tax_code || erpData.customer_id || 'Không có'}</strong></>
                        ) : (
                          <>Danh xưng: <input
                            type="text"
                            value={customSalutation}
                            onChange={(e) => setCustomSalutation(e.target.value)}
                            placeholder="Anh / Chị"
                            className="w-16 px-1.5 py-0.5 text-2xs font-bold text-slate-800 border border-slate-300 rounded bg-white"
                          /></>
                        )}
                      </div>
                      <div>
                        SĐT ERP: <strong className="font-mono text-slate-800">{rawCustomerPhone || 'Chưa có'}</strong>
                      </div>
                    </div>

                    {/* Geocoding Province Field */}
                    <div className="flex items-center gap-2 text-2xs pt-0.5">
                      <MapPin size={13} className="text-rose-600 shrink-0" />
                      <span className="text-slate-500 font-medium shrink-0">Tỉnh/Thành:</span>
                      <select
                        value={customProvince}
                        onChange={(e) => setCustomProvince(e.target.value)}
                        className="px-2 py-0.5 text-xs border border-slate-300 rounded bg-white font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {VIETNAM_PROVINCES_63.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <span className="text-3xs text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 font-bold">
                        Tự nhận diện
                      </span>
                    </div>

                    <div className="text-2xs text-slate-500 line-clamp-2">
                      Địa chỉ: {erpData.delivery_address || erpData.customer_snapshot?.address || 'Theo thỏa thuận'}
                    </div>

                    {/* Landline Warning & Inline Mobile ZNS Completion */}
                    {isLandline && (
                      <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-xs space-y-1.5 mt-2">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-2xs">
                          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                          <span>SĐT bàn cố định ({rawCustomerPhone || 'Chưa rõ'}) — Không thể nhận tin ZNS Zalo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customMobilePhone}
                            onChange={(e) => setCustomMobilePhone(e.target.value)}
                            placeholder="Nhập SĐT di động nhận ZNS (VD: 0912345678)..."
                            className="flex-1 px-2.5 py-1 text-xs border border-amber-300 rounded-lg bg-white font-mono outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                          />
                          <span className="text-3xs text-slate-500 italic shrink-0">(Bổ sung linh hoạt)</span>
                        </div>
                      </div>
                    )}
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
                        Thông tin đơn hàng
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
