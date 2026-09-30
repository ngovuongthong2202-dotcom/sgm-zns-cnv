import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Users, 
  FileText, 
  Handshake, 
  CreditCard, 
  Truck, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { formatVND } from '@/src/shared/utils/financialEngine';
import { Button } from '@/src/design-system/Button';
import { useNavigate } from 'react-router-dom';

export type MetricDrilldownType = 
  | 'totalCustomers'
  | 'customersWithQuotes'
  | 'customersZeroQuotes'
  | 'totalMachineQuotes'
  | 'machineQuotesWithContract'
  | 'machineQuotesWithoutContract'
  | 'totalSupplyQuotes'
  | 'supplyQuotesWithPayment'
  | 'supplyQuotesWithoutPayment'
  | 'contractPaid'
  | 'contractDelivered';

interface MetricDrilldownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: MetricDrilldownType | null;
  data: {
    customers: any[];
    quotations: any[];
    contracts: any[];
    payments: any[];
    deliveries: any[];
  };
  onViewDoc?: (type: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery', idOrCode: string) => void;
}

export function MetricDrilldownDrawer({
  isOpen,
  onClose,
  metricType,
  data,
  onViewDoc
}: MetricDrilldownDrawerProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { customers, quotations, contracts, payments, deliveries } = data;

  const drilldownConfig = useMemo(() => {
    if (!metricType) return null;

    switch (metricType) {
      case 'totalCustomers': {
        return {
          title: 'Tất cả Khách hàng',
          subtitle: 'Toàn bộ danh bạ khách hàng doanh nghiệp & cá nhân trên hệ thống',
          icon: <Users className="text-blue-600" size={20} />,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          entityType: 'customers',
          items: customers,
          renderItem: (c: any) => ({
            id: c.id || c.maKh,
            title: c.tenKhachHang || c.name || '--',
            subTitle: `Mã: ${c.maKh || '---'} · SĐT: ${c.sdt || '---'} · ${c.tinhThanh || ''}`,
            badge: c.loaiKh || 'Doanh nghiệp',
            badgeClass: c.loaiKh === 'Cá nhân' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700 border-blue-100',
            meta: c.diaChi || 'Chưa cập nhật địa chỉ',
            actionLabel: 'Xem hồ sơ',
            actionIcon: <ExternalLink size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('customer', c.id || c.maKh);
              } else {
                navigate(`/customers?search=${encodeURIComponent(c.maKh || c.tenKhachHang || '')}`);
              }
            }
          })
        };
      }

      case 'customersWithQuotes': {
        const customerIdsWithQuotes = new Set<string>();
        quotations.forEach(q => {
          if (q.customerId) customerIdsWithQuotes.add(q.customerId);
          if (q.tenKhachHang) customerIdsWithQuotes.add(q.tenKhachHang.trim().toLowerCase());
        });
        const items = customers.filter(c => 
          (c.id && customerIdsWithQuotes.has(c.id)) || (c.tenKhachHang && customerIdsWithQuotes.has(c.tenKhachHang.trim().toLowerCase()))
        );

        return {
          title: 'Khách hàng có Báo giá',
          subtitle: 'Khách hàng đã phát sinh ít nhất một phiếu báo giá trong hệ thống',
          icon: <CheckCircle2 className="text-emerald-600" size={20} />,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          entityType: 'customers',
          items,
          renderItem: (c: any) => ({
            id: c.id || c.maKh,
            title: c.tenKhachHang || '--',
            subTitle: `Mã: ${c.maKh || '---'} · SĐT: ${c.sdt || '---'}`,
            badge: 'Đã có BG',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            meta: `Phụ trách: ${c.nguoiPhuTrach || 'Chưa gán'} · ${c.tinhThanh || ''}`,
            actionLabel: 'Xem hồ sơ',
            actionIcon: <Users size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('customer', c.id || c.maKh);
              } else {
                navigate(`/sales?search=${encodeURIComponent(c.tenKhachHang || '')}`);
              }
            }
          })
        };
      }

      case 'customersZeroQuotes': {
        const customerIdsWithQuotes = new Set<string>();
        quotations.forEach(q => {
          if (q.customerId) customerIdsWithQuotes.add(q.customerId);
          if (q.tenKhachHang) customerIdsWithQuotes.add(q.tenKhachHang.trim().toLowerCase());
        });
        const items = customers.filter(c => 
          !((c.id && customerIdsWithQuotes.has(c.id)) || (c.tenKhachHang && customerIdsWithQuotes.has(c.tenKhachHang.trim().toLowerCase())))
        );

        return {
          title: 'Khách trắng (Chưa có Báo giá)',
          subtitle: 'Khách hàng mới tạo nhưng chưa được lập báo giá nào',
          icon: <AlertCircle className="text-amber-600" size={20} />,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          entityType: 'customers',
          items,
          renderItem: (c: any) => ({
            id: c.id || c.maKh,
            title: c.tenKhachHang || '--',
            subTitle: `Mã: ${c.maKh || '---'} · SĐT: ${c.sdt || '---'}`,
            badge: 'Chưa có BG',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            meta: `Tỉnh: ${c.tinhThanh || '---'} · Đại diện: ${c.nguoiDaiDien || '---'}`,
            actionLabel: 'Xem hồ sơ',
            actionIcon: <Users size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('customer', c.id || c.maKh);
              } else {
                navigate(`/sales?action=new&customerId=${c.id}`);
              }
            }
          })
        };
      }

      case 'totalMachineQuotes': {
        const items = quotations.filter(q => q.loai === 'BG Máy' || String(q.loai).toLowerCase().includes('máy'));
        return {
          title: 'Tổng Báo giá Máy',
          subtitle: 'Danh sách các báo giá thuộc phân loại máy móc / dây chuyền',
          icon: <FileText className="text-blue-600" size={20} />,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(q.tongTienSauThue || q.tongTien || 0)} · Ngày: ${q.ngayBaoGia || '--'}`,
            badge: q.loai || 'BG Máy',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            meta: `Sản phẩm: ${(q.products || []).length} mục · Phụ trách: ${q.nguoiPhuTrach || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/sales?search=${encodeURIComponent(q.soPhieuBaoGia || '')}`);
              }
            }
          })
        };
      }

      case 'machineQuotesWithContract': {
        const quoteIdsWithContract = new Set<string>();
        contracts.forEach(c => {
          if (c.quotationId) quoteIdsWithContract.add(c.quotationId);
          if (c.soPhieuBaoGia) quoteIdsWithContract.add(c.soPhieuBaoGia);
        });
        const items = quotations.filter(q => 
          (q.loai === 'BG Máy' || String(q.loai).toLowerCase().includes('máy')) &&
          ((q.id && quoteIdsWithContract.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithContract.has(q.soPhieuBaoGia)))
        );

        return {
          title: 'BG Máy Đã có Hợp đồng',
          subtitle: 'Báo giá máy đã được chuyển đổi thành hợp đồng kinh tế thành công',
          icon: <CheckCircle2 className="text-emerald-600" size={20} />,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(q.tongTienSauThue || q.tongTien || 0)}`,
            badge: 'Đã có HĐ',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            meta: `Phụ trách: ${q.nguoiPhuTrach || '--'} · Ngày: ${q.ngayBaoGia || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/contracts?search=${encodeURIComponent(q.soPhieuBaoGia || q.tenKhachHang || '')}`);
              }
            }
          })
        };
      }

      case 'machineQuotesWithoutContract': {
        const quoteIdsWithContract = new Set<string>();
        contracts.forEach(c => {
          if (c.quotationId) quoteIdsWithContract.add(c.quotationId);
          if (c.soPhieuBaoGia) quoteIdsWithContract.add(c.soPhieuBaoGia);
        });
        const items = quotations.filter(q => 
          (q.loai === 'BG Máy' || String(q.loai).toLowerCase().includes('máy')) &&
          !((q.id && quoteIdsWithContract.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithContract.has(q.soPhieuBaoGia)))
        );

        return {
          title: 'BG Máy Chưa có Hợp đồng',
          subtitle: 'Báo giá máy đang chờ ký kết và tạo hợp đồng kinh tế',
          icon: <AlertCircle className="text-amber-600" size={20} />,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(q.tongTienSauThue || q.tongTien || 0)}`,
            badge: 'Thiếu HĐ',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            meta: `Sản phẩm máy: ${(q.products || []).length} mục · Ngày tạo: ${q.ngayBaoGia || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/contracts?action=new&quotationId=${q.id}`);
              }
            }
          })
        };
      }

      case 'totalSupplyQuotes': {
        const items = quotations.filter(q => q.loai !== 'BG Máy' && !String(q.loai).toLowerCase().includes('máy'));
        return {
          title: 'Tổng Báo giá Vật Tư / Dịch Vụ',
          subtitle: 'Danh mục báo giá vật tư linh kiện và dịch vụ kỹ thuật',
          icon: <FileText className="text-teal-600" size={20} />,
          badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(q.tongTienSauThue || q.tongTien || 0)} · Phân loại: ${q.loai || 'BG Vật Tư'}`,
            badge: q.loai || 'Vật tư / DV',
            badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
            meta: `Mục: ${(q.products || []).length} linh kiện · Phụ trách: ${q.nguoiPhuTrach || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/sales?search=${encodeURIComponent(q.soPhieuBaoGia || '')}`);
              }
            }
          })
        };
      }

      case 'supplyQuotesWithPayment': {
        const quoteIdsWithPayment = new Set<string>();
        payments.forEach(p => {
          if (p.quotationId) quoteIdsWithPayment.add(p.quotationId);
          if (p.soPhieuBaoGia) quoteIdsWithPayment.add(p.soPhieuBaoGia);
        });
        const items = quotations.filter(q => 
          (q.loai !== 'BG Máy' && !String(q.loai).toLowerCase().includes('máy')) &&
          ((q.id && quoteIdsWithPayment.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithPayment.has(q.soPhieuBaoGia)))
        );

        return {
          title: 'BG Vật Tư / DV Đã có Thanh toán',
          subtitle: 'Báo giá vật tư/dịch vụ đã phát sinh phiếu thu tiền từ khách',
          icon: <CheckCircle2 className="text-teal-600" size={20} />,
          badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(q.tongTienSauThue || q.tongTien || 0)}`,
            badge: 'Đã thanh toán',
            badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
            meta: `Khách: ${q.tenKhachHang || '--'} · Ngày: ${q.ngayBaoGia || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/payments?search=${encodeURIComponent(q.soPhieuBaoGia || q.tenKhachHang || '')}`);
              }
            }
          })
        };
      }

      case 'supplyQuotesWithoutPayment': {
        const quoteIdsWithPayment = new Set<string>();
        payments.forEach(p => {
          if (p.quotationId) quoteIdsWithPayment.add(p.quotationId);
          if (p.soPhieuBaoGia) quoteIdsWithPayment.add(p.soPhieuBaoGia);
        });
        const items = quotations.filter(q => 
          (q.loai !== 'BG Máy' && !String(q.loai).toLowerCase().includes('máy')) &&
          !((q.id && quoteIdsWithPayment.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithPayment.has(q.soPhieuBaoGia)))
        );

        return {
          title: 'BG Vật Tư / DV Chưa Thanh toán',
          subtitle: 'Báo giá vật tư/dịch vụ chưa ghi nhận phiếu thanh toán tiền mặt/chuyển khoản',
          icon: <AlertCircle className="text-red-600" size={20} />,
          badgeColor: 'bg-red-100 text-red-800 border-red-200',
          entityType: 'quotations',
          items,
          renderItem: (q: any) => ({
            id: q.id || q.soPhieuBaoGia,
            title: `${q.soPhieuBaoGia || 'BG-N/A'} - ${q.tenKhachHang || '--'}`,
            subTitle: `Cần thu: ${formatVND(q.tongTienSauThue || q.tongTien || 0)}`,
            badge: 'Chưa thu tiền',
            badgeClass: 'bg-red-50 text-red-700 border-red-200',
            meta: `Phân loại: ${q.loai || 'BG Vật Tư'} · Phụ trách: ${q.nguoiPhuTrach || '--'}`,
            actionLabel: 'Xem Báo Giá',
            actionIcon: <FileText size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('quotation', q.id || q.soPhieuBaoGia);
              } else {
                navigate(`/payments?action=new&quotationId=${q.id}`);
              }
            }
          })
        };
      }

      case 'contractPaid': {
        const contractIdsWithPayment = new Set<string>();
        payments.forEach(p => {
          if (p.contractId) contractIdsWithPayment.add(p.contractId);
          if (p.soHopDong) contractIdsWithPayment.add(p.soHopDong);
        });
        const items = contracts.filter(c => 
          (c.id && contractIdsWithPayment.has(c.id)) || (c.soHopDong && contractIdsWithPayment.has(c.soHopDong))
        );

        return {
          title: 'Hợp đồng Đã phát sinh Thanh toán',
          subtitle: 'Danh sách các hợp đồng đã thu tiền đặt cọc hoặc thanh toán đợt',
          icon: <CreditCard className="text-emerald-600" size={20} />,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          entityType: 'contracts',
          items,
          renderItem: (c: any) => ({
            id: c.id || c.soHopDong,
            title: `${c.soHopDong || 'HĐ-N/A'} - ${c.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(c.giaTriHopDong || 0)}`,
            badge: 'Đã có TT',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            meta: `Ngày ký: ${c.ngayKy || '--'} · Đại diện: ${c.nguoiDaiDien || '--'}`,
            actionLabel: 'Xem Hợp Đồng',
            actionIcon: <Handshake size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('contract', c.id || c.soHopDong);
              } else {
                navigate(`/payments?search=${encodeURIComponent(c.soHopDong || '')}`);
              }
            }
          })
        };
      }

      case 'contractDelivered': {
        const contractIdsWithDelivery = new Set<string>();
        deliveries.forEach(d => {
          if (d.contractId) contractIdsWithDelivery.add(d.contractId);
          if (d.soHopDong) contractIdsWithDelivery.add(d.soHopDong);
        });
        const items = contracts.filter(c => 
          (c.id && contractIdsWithDelivery.has(c.id)) || (c.soHopDong && contractIdsWithDelivery.has(c.soHopDong))
        );

        return {
          title: 'Hợp đồng Đã Giao hàng',
          subtitle: 'Danh sách các hợp đồng đã xuất phiếu giao hàng',
          icon: <Truck className="text-blue-600" size={20} />,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          entityType: 'contracts',
          items,
          renderItem: (c: any) => ({
            id: c.id || c.soHopDong,
            title: `${c.soHopDong || 'HĐ-N/A'} - ${c.tenKhachHang || '--'}`,
            subTitle: `Giá trị: ${formatVND(c.giaTriHopDong || 0)}`,
            badge: 'Đã xuất kho',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            meta: `Khách: ${c.tenKhachHang || '--'} · Ngày ký: ${c.ngayKy || '--'}`,
            actionLabel: 'Xem Hợp Đồng',
            actionIcon: <Handshake size={13} />,
            onAction: () => {
              if (onViewDoc) {
                onViewDoc('contract', c.id || c.soHopDong);
              } else {
                navigate(`/fulfillment?search=${encodeURIComponent(c.soHopDong || '')}`);
              }
            }
          })
        };
      }

      default:
        return null;
    }
  }, [metricType, customers, quotations, contracts, payments, deliveries, navigate, onViewDoc]);

  const filteredItems = useMemo(() => {
    if (!drilldownConfig) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return drilldownConfig.items;

    return drilldownConfig.items.filter((raw: any) => {
      const item = drilldownConfig.renderItem(raw);
      return (
        item.title.toLowerCase().includes(term) ||
        item.subTitle.toLowerCase().includes(term) ||
        item.meta.toLowerCase().includes(term) ||
        item.badge.toLowerCase().includes(term)
      );
    });
  }, [drilldownConfig, searchTerm]);

  if (!isOpen || !drilldownConfig) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0 mt-0.5">
              {drilldownConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {drilldownConfig.title}
                </h3>
                <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${drilldownConfig.badgeColor}`}>
                  {drilldownConfig.items.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {drilldownConfig.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã, tên khách hàng, số điện thoại..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850 placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Filter size={24} className="text-slate-300 mb-2" />
              <span>Không tìm thấy bản ghi nào phù hợp</span>
            </div>
          ) : (
            filteredItems.map((raw: any, index: number) => {
              const item = drilldownConfig.renderItem(raw);
              return (
                <div 
                  key={item.id || index}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-2xs text-slate-600 font-medium mt-0.5">
                        {item.subTitle}
                      </p>
                    </div>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded border shrink-0 ${item.badgeClass}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-400">
                    <span className="truncate pr-2">{item.meta}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onClose();
                        item.onAction();
                      }}
                      className="px-2.5 py-1 text-2xs font-bold text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {item.actionIcon}
                      <span>{item.actionLabel}</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-2xs text-slate-500 shrink-0">
          <span>Hiển thị <strong>{filteredItems.length}</strong> / <strong>{drilldownConfig.items.length}</strong> kết quả</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
