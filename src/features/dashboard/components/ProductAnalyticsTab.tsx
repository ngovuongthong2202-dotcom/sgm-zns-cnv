import React, { useMemo, useState } from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { 
  PackageCheck, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  Truck, 
  Layers, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface ProductAnalyticsTabProps {
  customers: Customer[];
  quotations: Quotation[];
  contracts: Contract[];
  payments: Payment[];
  deliveries: Delivery[];
}

export const ProductAnalyticsTab: React.FC<ProductAnalyticsTabProps> = ({
  customers,
  quotations,
  contracts,
  payments: _payments,
  deliveries
}) => {
  const [serialSearch, setSerialSearch] = useState('');
  const [serialStatusFilter, setSerialStatusFilter] = useState<'ALL' | 'DELIVERED' | 'PENDING' | 'WARRANTY'>('ALL');

  // Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Contract Map
  const contractMap = useMemo(() => {
    const map = new Map<string, Contract>();
    contracts.forEach(c => {
      if (c.id) map.set(c.id, c);
      if (c.soHopDong) map.set(c.soHopDong, c);
    });
    return map;
  }, [contracts]);

  // Aggregate Product Stats
  const analytics = useMemo(() => {
    // 1. Collect all product line items from contracts and quotations
    let totalUnitsContracted = 0;
    let totalPortfolioValue = 0;
    const modelAggMap: Record<string, { name: string; model: string; qty: number; value: number; category: string }> = {};
    const categoryAggMap: Record<string, { count: number; qty: number; value: number }> = {
      'MAY_MOI': { count: 0, qty: 0, value: 0 },
      'MAY_CU': { count: 0, qty: 0, value: 0 },
      'LINH_KIEN': { count: 0, qty: 0, value: 0 },
      'DICH_VU': { count: 0, qty: 0, value: 0 },
      'KHAC': { count: 0, qty: 0, value: 0 }
    };

    // Process Contracts
    contracts.forEach(c => {
      totalPortfolioValue += ((c as any).giaTriTruocThue || (c as any).tongGiaTri || (c as any).giaTriHopDong || (c as any).tongTien || 0);
      if (Array.isArray(c.products) && c.products.length > 0) {
        c.products.forEach(p => {
          const qty = p.quantity || (p as any).soLuong || 1;
          const unitPrice = (p as any).unitPrice || (p as any).donGia || p.price || 0;
          const lineVal = (p as any).thanhTien || p.total || (qty * unitPrice);
          totalUnitsContracted += qty;

          const rawName = p.productName || (p as any).tenSanPham || (p as any).name || 'Máy may SGM';
          const rawModel = (p as any).model || rawName;
          const key = (p.productId || rawModel).trim().toLowerCase();

          if (!modelAggMap[key]) {
            modelAggMap[key] = {
              name: rawName,
              model: rawModel,
              qty: 0,
              value: 0,
              category: (p as any).category || (rawName.toLowerCase().includes('cũ') ? 'MAY_CU' : 'MAY_MOI')
            };
          }
          modelAggMap[key].qty += qty;
          modelAggMap[key].value += lineVal;

          // Categorize
          let cat = 'MAY_MOI';
          const low = rawName.toLowerCase();
          if (low.includes('cũ') || low.includes('qua sử dụng') || low.includes('2nd')) cat = 'MAY_CU';
          else if (low.includes('linh kiện') || low.includes('phụ tùng') || low.includes('dao') || low.includes('kim')) cat = 'LINH_KIEN';
          else if (low.includes('dịch vụ') || low.includes('bảo dưỡng') || low.includes('sửa chữa') || low.includes('lắp đặt')) cat = 'DICH_VU';

          categoryAggMap[cat].count += 1;
          categoryAggMap[cat].qty += qty;
          categoryAggMap[cat].value += lineVal;
        });
      } else {
        const qty = c.slMay || 1;
        totalUnitsContracted += qty;
      }
    });

    // If contracts are sparse, supplement from quotations
    if (totalUnitsContracted === 0) {
      quotations.forEach(q => {
        if (Array.isArray(q.products) && q.products.length > 0) {
          q.products.forEach(p => {
            const qty = p.quantity || (p as any).soLuong || 1;
            const unitPrice = (p as any).unitPrice || (p as any).donGia || p.price || 0;
            const lineVal = (p as any).thanhTien || p.total || (qty * unitPrice);
            totalUnitsContracted += qty;

            const rawName = p.productName || (p as any).tenSanPham || (p as any).name || 'Thiết bị SGM';
            const rawModel = (p as any).model || rawName;
            const key = (p.productId || rawModel).trim().toLowerCase();

            if (!modelAggMap[key]) {
              modelAggMap[key] = {
                name: rawName,
                model: rawModel,
                qty: 0,
                value: 0,
                category: 'MAY_MOI'
              };
            }
            modelAggMap[key].qty += qty;
            modelAggMap[key].value += lineVal;
          });
        }
      });
    }

    // 2. Process Deliveries for fulfillment and serial matrix
    let totalDeliveredUnits = 0;
    let activeWarrantiesCount = 0;
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const serialItems: Array<{
      id: string;
      serial: string;
      productName: string;
      model: string;
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      customerProvince?: string;
      contractNo?: string;
      deliveryDate?: string;
      status: 'DELIVERED' | 'PENDING' | 'IN_TRANSIT';
      warrantyStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING';
      warrantyExpiry?: string;
    }> = [];

    deliveries.forEach((d, idx) => {
      const isDelivered = Boolean(d.ngayGiaoThucTe);
      const deliveryDate = d.ngayGiaoThucTe || d.ngayGiaoMay;
      const cust = d.customerId ? customerMap.get(d.customerId) : undefined;
      const contract = (d.contractId ? contractMap.get(d.contractId) : undefined) || (d.soHopDong ? contractMap.get(d.soHopDong) : undefined);

      let deliveryQty = 0;
      if (Array.isArray(d.products) && d.products.length > 0) {
        d.products.forEach(p => {
          deliveryQty += (p.quantity || (p as any).soLuong || 1);
        });
      } else if (Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.length > 0) {
        deliveryQty = d.danhSachMaMay.length;
      } else {
        deliveryQty = d.slMay || 1;
      }

      if (isDelivered) {
        totalDeliveredUnits += deliveryQty;
      }

      // Compute warranty
      let isWarrantyActive = false;
      let warrantyExpiryStr = '';
      if (isDelivered && d.ngayGiaoThucTe) {
        const delDateObj = new Date(d.ngayGiaoThucTe);
        const expDate = new Date(delDateObj);
        expDate.setDate(expDate.getDate() + 365);
        warrantyExpiryStr = expDate.toISOString().substring(0, 10);
        if (expDate > now) {
          isWarrantyActive = true;
          activeWarrantiesCount += deliveryQty;
        }
      }

      // Collect individual serials or machine records
      if (Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.length > 0) {
        d.danhSachMaMay.forEach((code, codeIdx) => {
          serialItems.push({
            id: `${d.id}_${codeIdx}`,
            serial: code.trim(),
            productName: (d.products?.[0]?.productName || contract?.products?.[0]?.productName || 'Máy may Công nghiệp SGM'),
            model: ((d.products?.[0] as any)?.model || (contract?.products?.[0] as any)?.model || 'SGM-Standard'),
            customerId: d.customerId,
            customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
            customerPhone: cust?.sdt || (d as any).sdt,
            customerProvince: cust?.tinhThanh || (d as any).tinhThanh,
            contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
            deliveryDate: d.ngayGiaoThucTe || d.ngayGiaoMay,
            status: isDelivered ? 'DELIVERED' : (d.ngayGiaoMay ? 'IN_TRANSIT' : 'PENDING'),
            warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
            warrantyExpiry: warrantyExpiryStr
          });
        });
      } else if (Array.isArray(d.products) && d.products.length > 0) {
        d.products.forEach((p, pIdx) => {
          const sNo = (p as any).serial || `#SGM-${String(idx + 100).padStart(4, '0')}-${pIdx + 1}`;
          serialItems.push({
            id: `${d.id}_p_${pIdx}`,
            serial: sNo,
            productName: p.productName || (p as any).tenSanPham || 'Máy may SGM',
            model: (p as any).model || 'SGM-Series',
            customerId: d.customerId,
            customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
            customerPhone: cust?.sdt,
            customerProvince: cust?.tinhThanh,
            contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
            deliveryDate: deliveryDate,
            status: isDelivered ? 'DELIVERED' : 'PENDING',
            warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
            warrantyExpiry: warrantyExpiryStr
          });
        });
      } else {
        serialItems.push({
          id: `${d.id}_gen`,
          serial: `#SGM-PGH-${String(idx + 1).padStart(4, '0')}`,
          productName: contract?.products?.[0]?.productName || 'Lô thiết bị máy may SGM',
          model: (contract?.products?.[0] as any)?.model || 'SGM-Standard',
          customerId: d.customerId,
          customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
          customerPhone: cust?.sdt,
          customerProvince: cust?.tinhThanh,
          contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
          deliveryDate: deliveryDate,
          status: isDelivered ? 'DELIVERED' : 'PENDING',
          warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
          warrantyExpiry: warrantyExpiryStr
        });
      }
    });

    // Top Selling Models
    const topModels = Object.values(modelAggMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    const handoverRate = totalUnitsContracted > 0 
      ? Math.min(100, Math.round((totalDeliveredUnits / totalUnitsContracted) * 100))
      : (totalDeliveredUnits > 0 ? 100 : 0);

    return {
      totalUnitsContracted: Math.max(totalUnitsContracted, totalDeliveredUnits),
      totalDeliveredUnits,
      handoverRate,
      totalPortfolioValue,
      activeWarrantiesCount,
      topModels,
      categoryAggMap,
      serialItems
    };
  }, [contracts, quotations, deliveries, customerMap, contractMap]);

  // Filtered Serials
  const filteredSerials = useMemo(() => {
    let list = analytics.serialItems;
    if (serialStatusFilter === 'DELIVERED') {
      list = list.filter(s => s.status === 'DELIVERED');
    } else if (serialStatusFilter === 'PENDING') {
      list = list.filter(s => s.status !== 'DELIVERED');
    } else if (serialStatusFilter === 'WARRANTY') {
      list = list.filter(s => s.warrantyStatus === 'ACTIVE');
    }

    if (!serialSearch.trim()) return list;
    const q = serialSearch.toLowerCase().trim();
    return list.filter(s => 
      s.serial.toLowerCase().includes(q) ||
      s.productName.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerProvince && s.customerProvince.toLowerCase().includes(q)) ||
      (s.contractNo && s.contractNo.toLowerCase().includes(q))
    );
  }, [analytics.serialItems, serialStatusFilter, serialSearch]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full px-6 animate-in fade-in">
      {/* 1. EXECUTIVE KPI HERO CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Tổng Sản lượng Thiết bị */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Thiết bị Hợp Đồng</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Cpu size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {analytics.totalUnitsContracted.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">máy</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
              <TrendingUp size={14} className="text-emerald-500" />
              <span>Theo dõi toàn bộ danh mục sản phẩm SGM</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tỉ lệ Bàn Giao Hoàn Tất */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỉ lệ Bàn Giao & Lắp Đặt</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">{analytics.handoverRate}%</span>
              <span className="text-xs font-bold text-slate-500">
                ({analytics.totalDeliveredUnits}/{analytics.totalUnitsContracted} máy)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${analytics.handoverRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Giá trị Danh mục Hợp đồng */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá Trị Doanh Số Thiết Bị</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <PackageCheck size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(analytics.totalPortfolioValue)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
              <Layers size={14} className="text-blue-500" />
              <span>Ghi nhận từ các hợp đồng & đơn hàng đã chốt</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Máy trong thời hạn Bảo hành */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Máy Đang Trong Bảo Hành</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-teal-700 tracking-tight">
              {analytics.activeWarrantiesCount} <span className="text-sm font-semibold text-slate-500">máy</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-teal-600 mt-2 font-medium">
              <CheckCircle2 size={14} />
              <span>Cam kết bảo hành chính hãng SGM 12 tháng</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY BREAKDOWN & TOP SELLING MODELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Phân bổ Nhóm Thiết Bị */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-blue-600" />
              Cơ Cấu Nhóm Sản Phẩm
            </h3>
            <span className="text-2xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">SGM Cat</span>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-around">
            {/* Category 1: Máy mới */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Máy May & Thiết Bị Mới</div>
                  <div className="text-2xs text-slate-400">Đầy đủ chứng nhận CO/CQ</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{analytics.categoryAggMap.MAY_MOI.qty} máy</div>
                <div className="text-2xs font-bold text-blue-600">{formatCurrency(analytics.categoryAggMap.MAY_MOI.value)}</div>
              </div>
            </div>

            {/* Category 2: Máy thanh lý / 2nd */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Máy Đã Qua Sử Dụng</div>
                  <div className="text-2xs text-slate-400">Kiểm định kỹ thuật đạt chuẩn</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{analytics.categoryAggMap.MAY_CU.qty} máy</div>
                <div className="text-2xs font-bold text-amber-600">{formatCurrency(analytics.categoryAggMap.MAY_CU.value)}</div>
              </div>
            </div>

            {/* Category 3: Linh kiện & Phụ tùng */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Linh Kiện & Phụ Tùng</div>
                  <div className="text-2xs text-slate-400">Phụ tùng thay thế định kỳ</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{analytics.categoryAggMap.LINH_KIEN.qty} bộ</div>
                <div className="text-2xs font-bold text-teal-600">{formatCurrency(analytics.categoryAggMap.LINH_KIEN.value)}</div>
              </div>
            </div>

            {/* Category 4: Dịch vụ & Lắp ráp */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Dịch Vụ & Chuyển Giao</div>
                  <div className="text-2xs text-slate-400">Bảo trì & Setup xưởng may</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{analytics.categoryAggMap.DICH_VU.count} gói</div>
                <div className="text-2xs font-bold text-emerald-600">{formatCurrency(analytics.categoryAggMap.DICH_VU.value)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Top Selling Models Leaderboard (2 Cols) */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 lg:col-span-2 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              Bảng Xếp Hạng Dòng Máy Bán Chạy Nhất (Leaderboard)
            </h3>
            <span className="text-2xs text-slate-400 font-medium">Xếp theo số lượng bán</span>
          </div>

          <div className="space-y-3 flex-1 overflow-auto max-h-[380px] pr-1">
            {analytics.topModels.length > 0 ? (
              analytics.topModels.map((item, idx) => {
                const maxQty = analytics.topModels[0]?.qty || 1;
                const pct = Math.round((item.qty / maxQty) * 100);
                return (
                  <div 
                    key={`${item.name}_${idx}`}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/20 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black font-mono ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          idx === 1 ? 'bg-slate-200 text-slate-800' :
                          idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-850">{item.name}</div>
                          <div className="text-2xs text-slate-400 font-mono">{item.model}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 font-mono">{item.qty} máy</div>
                        <div className="text-2xs font-semibold text-slate-500">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                    {/* Mini progress */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center gap-2">
                <FileSpreadsheet size={32} className="text-slate-300" />
                Chưa có dữ liệu danh mục sản phẩm từ hợp đồng & báo giá
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 3. SERIAL & MACHINE CODE LIFECYCLE MATRIX */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Cpu size={16} className="text-blue-600" />
              Ma Trận Vòng Đời Mã Máy & Serial Number (#SGMxxxx-xx)
            </h3>
            <p className="text-2xs text-slate-500 mt-1">
              Theo dõi định danh từng số máy, khách hàng sở hữu, chứng từ liên quan và thời hạn bảo hành thực tế.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                placeholder="Tìm mã máy, serial, khách hàng..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Filter pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSerialStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({analytics.serialItems.length})
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('DELIVERED')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'DELIVERED' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã bàn giao
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chưa giao
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('WARRANTY')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'WARRANTY' ? 'bg-white text-teal-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Còn bảo hành
              </button>
            </div>
          </div>
        </div>

        {/* Table View of Serials */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-3xs">
                <th className="py-3 px-4">Mã Máy / Serial</th>
                <th className="py-3 px-4">Tên Thiết Bị / Model</th>
                <th className="py-3 px-4">Khách Hàng & Địa Bàn</th>
                <th className="py-3 px-4">Số HĐ / Chứng Từ</th>
                <th className="py-3 px-4">Ngày Bàn Giao</th>
                <th className="py-3 px-4">Trạng Thái Giao</th>
                <th className="py-3 px-4 text-right">Bảo Hành SGM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSerials.length > 0 ? (
                filteredSerials.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {s.serial}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{s.productName}</div>
                      <div className="text-2xs text-slate-400 font-mono">{s.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.customerName}</div>
                      <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                        {s.customerProvince && <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium">{s.customerProvince}</span>}
                        {s.customerPhone && <span className="font-mono text-slate-400">{s.customerPhone}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">
                      {s.contractNo}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.deliveryDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {s.deliveryDate}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa xác định</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.status === 'DELIVERED' ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={11} /> Đã Bàn Giao
                        </span>
                      ) : s.status === 'IN_TRANSIT' ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          <Truck size={11} /> Đang Giao
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Clock size={11} /> Chờ Xuất Kho
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.warrantyStatus === 'ACTIVE' ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                            <ShieldCheck size={11} /> Còn Hạn (12T)
                          </span>
                          {s.warrantyExpiry && (
                            <span className="text-3xs text-slate-400 font-mono mt-0.5">
                              Hết hạn: {s.warrantyExpiry}
                            </span>
                          )}
                        </div>
                      ) : s.warrantyStatus === 'EXPIRED' ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          <AlertTriangle size={11} /> Hết Hạn
                        </span>
                      ) : (
                        <span className="text-2xs text-slate-400 italic">
                          Chờ kích hoạt khi giao
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Không tìm thấy mã máy hoặc serial number nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
