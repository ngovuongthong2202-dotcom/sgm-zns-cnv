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

import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

export type ProductTaxonomyCategory = 'MAY' | 'VAT_TU' | 'DICH_VU';

export type TimePeriodFilter = 
  | 'THIS_MONTH'
  | 'THIS_QUARTER'
  | '6_MONTHS'
  | '1_YEAR'
  | '2_YEARS'
  | '3_YEARS'
  | '4_YEARS'
  | 'ALL';

interface ProductAnalyticsTabProps {
  customers: Customer[];
  quotations: Quotation[];
  contracts: Contract[];
  payments: Payment[];
  deliveries: Delivery[];
  onViewDoc?: (type: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery', idOrCode: string) => void;
}

/**
 * Phân loại danh mục sản phẩm chuẩn 3 nhóm: MÁY, VẬT TƯ, DỊCH VỤ
 * Sử dụng đồng bộ với 5-tier context semantic deduction engine của SGM OS
 */
export function classifyProductCategory(item: { 
  productName?: string; 
  productId?: string; 
  category?: string; 
  name?: string; 
  model?: string;
  loai?: string;
  unit?: string;
  dvt?: string;
}): ProductTaxonomyCategory {
  const explicitCat = (item.category || item.loai || '').toUpperCase();
  if (explicitCat === 'MAY' || explicitCat === 'MAY_MOI' || explicitCat === 'MAY_CU' || explicitCat === 'MÁY' || explicitCat === 'MACHINE') return 'MAY';
  if (explicitCat === 'VAT_TU' || explicitCat === 'LINH_KIEN' || explicitCat === 'PHU_TUNG' || explicitCat === 'VẬT TƯ' || explicitCat === 'MATERIAL') return 'VAT_TU';
  if (explicitCat === 'DICH_VU' || explicitCat === 'DỊCH VỤ' || explicitCat === 'VAN_CHUYEN' || explicitCat === 'CUOC' || explicitCat === 'NHAN_CONG' || explicitCat === 'SERVICE') return 'DICH_VU';

  const name = item.productName || item.name || '';
  const unit = item.unit || item.dvt || '';
  const code = item.productId || item.model || '';

  const detected = detectItemType(name, unit, 'MATERIAL', code);
  if (detected === 'MACHINE') return 'MAY';
  if (detected === 'SERVICE') return 'DICH_VU';
  return 'VAT_TU';
}

/**
 * Kiểm tra xem ngày có thuộc kỳ lọc được chọn hay không
 */
function isDateInPeriod(dateStr: string | undefined | null, period: TimePeriodFilter): boolean {
  if (period === 'ALL') return true;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  
  const now = new Date();
  
  if (period === 'THIS_MONTH') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'THIS_QUARTER') {
    const curQ = Math.floor(now.getMonth() / 3);
    const itemQ = Math.floor(d.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && itemQ === curQ;
  }
  if (period === '6_MONTHS') {
    const past = new Date(now);
    past.setMonth(past.getMonth() - 6);
    return d >= past;
  }
  if (period === '1_YEAR') {
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 1);
    return d >= past;
  }
  if (period === '2_YEARS') {
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 2);
    return d >= past;
  }
  if (period === '3_YEARS') {
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 3);
    return d >= past;
  }
  if (period === '4_YEARS') {
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 4);
    return d >= past;
  }
  return true;
}

export const ProductAnalyticsTab: React.FC<ProductAnalyticsTabProps> = ({
  customers,
  quotations,
  contracts,
  payments,
  deliveries,
  onViewDoc
}) => {
  const [periodFilter, setPeriodFilter] = useState<TimePeriodFilter>('ALL');
  const [serialSearch, setSerialSearch] = useState('');
  const [serialStatusFilter, setSerialStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING'>('ALL');

  // Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c.id) map.set(c.id, c);
      if (c.maKh) map.set(c.maKh, c);
      if (c.tenKhachHang) map.set(c.tenKhachHang.toLowerCase().trim(), c);
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

  // Filter datasets by time period
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => isDateInPeriod(q.ngayBaoGia || (q as any).createdAt, periodFilter));
  }, [quotations, periodFilter]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => isDateInPeriod(c.ngayKy || (c as any).createdAt, periodFilter));
  }, [contracts, periodFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => isDateInPeriod(p.ngayThanhToan || (p as any).createdAt, periodFilter));
  }, [payments, periodFilter]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => isDateInPeriod(d.ngayGiaoThucTe || d.ngayGiaoMay || (d as any).createdAt, periodFilter));
  }, [deliveries, periodFilter]);

  // Compute 5-Dimensional Pipeline Aggregation across 3 Taxonomy Groups
  const pipelineMatrix = useMemo(() => {
    const matrix = {
      MAY: {
        quotesQty: 0,
        quotesVal: 0,
        contractsQty: 0,
        contractsVal: 0,
        paidVal: 0,
        debtVal: 0,
        deliveredQty: 0,
        handoverRate: 0
      },
      VAT_TU: {
        quotesQty: 0,
        quotesVal: 0,
        contractsQty: 0,
        contractsVal: 0,
        paidVal: 0,
        debtVal: 0,
        deliveredQty: 0,
        handoverRate: 0
      },
      DICH_VU: {
        quotesQty: 0,
        quotesVal: 0,
        contractsQty: 0,
        contractsVal: 0,
        paidVal: 0,
        debtVal: 0,
        deliveredQty: 0,
        handoverRate: 0
      }
    };

    // 1. Process Quotations
    filteredQuotations.forEach(q => {
      if (Array.isArray(q.products) && q.products.length > 0) {
        q.products.forEach(p => {
          const cat = classifyProductCategory(p);
          const qty = p.quantity || (p as any).soLuong || 1;
          const unitPrice = (p as any).unitPrice || (p as any).donGia || p.price || 0;
          const lineVal = (p as any).thanhTien || p.total || (qty * unitPrice);
          matrix[cat].quotesQty += qty;
          matrix[cat].quotesVal += lineVal;
        });
      } else {
        const cat: ProductTaxonomyCategory = q.loai === 'BG Máy' || String(q.loai).toLowerCase().includes('máy') ? 'MAY' : 'VAT_TU';
        matrix[cat].quotesQty += (q as any).slMay || 1;
        matrix[cat].quotesVal += ((q as any).tongTienSauThue || (q as any).tongTien || (q as any).totalAmount || 0);
      }
    });

    // 2. Process Contracts
    filteredContracts.forEach(c => {
      const contractVal = (c as any).giaTriTruocThue || (c as any).tongGiaTri || (c as any).giaTriHopDong || (c as any).tongTien || 0;
      if (Array.isArray(c.products) && c.products.length > 0) {
        c.products.forEach(p => {
          const cat = classifyProductCategory(p);
          const qty = p.quantity || (p as any).soLuong || 1;
          const unitPrice = (p as any).unitPrice || (p as any).donGia || p.price || 0;
          const lineVal = (p as any).thanhTien || p.total || (qty * unitPrice);
          matrix[cat].contractsQty += qty;
          matrix[cat].contractsVal += lineVal;
        });
      } else {
        matrix.MAY.contractsQty += (c.slMay || 1);
        matrix.MAY.contractsVal += contractVal;
      }
    });

    // 3. Process Payments (Distribute payments proportionately across categories based on contract values)
    const totalContractVal = matrix.MAY.contractsVal + matrix.VAT_TU.contractsVal + matrix.DICH_VU.contractsVal;
    let totalActualPaid = 0;
    filteredPayments.forEach(p => {
      totalActualPaid += (p.soTien || (p as any).amount || 0);
    });

    if (totalContractVal > 0) {
      matrix.MAY.paidVal = Math.round((matrix.MAY.contractsVal / totalContractVal) * totalActualPaid);
      matrix.VAT_TU.paidVal = Math.round((matrix.VAT_TU.contractsVal / totalContractVal) * totalActualPaid);
      matrix.DICH_VU.paidVal = Math.round((matrix.DICH_VU.contractsVal / totalContractVal) * totalActualPaid);
    } else {
      matrix.MAY.paidVal = totalActualPaid;
    }

    // 4. Calculate Receivables Debt (Công nợ)
    matrix.MAY.debtVal = Math.max(0, matrix.MAY.contractsVal - matrix.MAY.paidVal);
    matrix.VAT_TU.debtVal = Math.max(0, matrix.VAT_TU.contractsVal - matrix.VAT_TU.paidVal);
    matrix.DICH_VU.debtVal = Math.max(0, matrix.DICH_VU.contractsVal - matrix.DICH_VU.paidVal);

    // 5. Process Deliveries
    filteredDeliveries.forEach(d => {
      const isDelivered = Boolean(d.ngayGiaoThucTe);
      if (!isDelivered) return;

      if (Array.isArray(d.products) && d.products.length > 0) {
        d.products.forEach(p => {
          const cat = classifyProductCategory(p);
          const qty = p.quantity || (p as any).soLuong || 1;
          matrix[cat].deliveredQty += qty;
        });
      } else if (Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.length > 0) {
        matrix.MAY.deliveredQty += d.danhSachMaMay.length;
      } else {
        matrix.MAY.deliveredQty += (d.slMay || 1);
      }
    });

    // 6. Compute Handover Rates
    matrix.MAY.handoverRate = matrix.MAY.contractsQty > 0 
      ? Math.min(100, Math.round((matrix.MAY.deliveredQty / matrix.MAY.contractsQty) * 100))
      : (matrix.MAY.deliveredQty > 0 ? 100 : 0);

    matrix.VAT_TU.handoverRate = matrix.VAT_TU.contractsQty > 0 
      ? Math.min(100, Math.round((matrix.VAT_TU.deliveredQty / matrix.VAT_TU.contractsQty) * 100))
      : (matrix.VAT_TU.deliveredQty > 0 ? 100 : 0);

    matrix.DICH_VU.handoverRate = matrix.DICH_VU.contractsQty > 0 
      ? Math.min(100, Math.round((matrix.DICH_VU.deliveredQty / matrix.DICH_VU.contractsQty) * 100))
      : (matrix.DICH_VU.deliveredQty > 0 ? 100 : 0);

    return matrix;
  }, [filteredQuotations, filteredContracts, filteredPayments, filteredDeliveries]);

  // Aggregate Top Selling Machine Models & Machine-Only Serial Matrix
  const { topMachineModels, machineSerialItems, activeWarrantiesCount, expiredWarrantiesCount, pendingWarrantiesCount } = useMemo(() => {
    const modelAggMap: Record<string, { name: string; model: string; qty: number; value: number }> = {};
    const now = new Date();
    const serialList: Array<{
      id: string;
      serial: string;
      productName: string;
      model: string;
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      customerProvince?: string;
      contractNo?: string;
      contractId?: string;
      deliveryId?: string;
      deliveryCode?: string;
      deliveryDate?: string;
      status: 'DELIVERED' | 'PENDING' | 'IN_TRANSIT';
      warrantyStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING';
      warrantyExpiry?: string;
      daysRemaining?: number;
    }> = [];

    let activeCount = 0;
    let expiredCount = 0;
    let pendingCount = 0;

    // Collect Machine Models from Contracts
    filteredContracts.forEach(c => {
      if (Array.isArray(c.products) && c.products.length > 0) {
        c.products.forEach(p => {
          if (classifyProductCategory(p) !== 'MAY') return; // Machine-only!
          const qty = p.quantity || (p as any).soLuong || 1;
          const unitPrice = (p as any).unitPrice || (p as any).donGia || p.price || 0;
          const lineVal = (p as any).thanhTien || p.total || (qty * unitPrice);

          const rawName = p.productName || (p as any).tenSanPham || (p as any).name || 'Máy may SGM';
          const rawModel = (p as any).model || (p as any).productId || rawName;
          const key = (p.productId || rawModel).trim().toLowerCase();

          if (!modelAggMap[key]) {
            modelAggMap[key] = {
              name: rawName,
              model: rawModel,
              qty: 0,
              value: 0
            };
          }
          modelAggMap[key].qty += qty;
          modelAggMap[key].value += lineVal;
        });
      }
    });

    // Process Deliveries for Machine-Only Serials & Warranty Lifecycle
    filteredDeliveries.forEach((d, idx) => {
      const isDelivered = Boolean(d.ngayGiaoThucTe);
      const deliveryDate = d.ngayGiaoThucTe || d.ngayGiaoMay;
      const cust = d.customerId ? customerMap.get(d.customerId) : (d.tenKhachHang ? customerMap.get(d.tenKhachHang.toLowerCase().trim()) : undefined);
      const contract = (d.contractId ? contractMap.get(d.contractId) : undefined) || (d.soHopDong ? contractMap.get(d.soHopDong) : undefined);

      // Compute Warranty
      let isWarrantyActive = false;
      let warrantyExpiryStr = '';
      let daysRemaining: number | undefined = undefined;

      if (isDelivered && d.ngayGiaoThucTe) {
        const delDateObj = new Date(d.ngayGiaoThucTe);
        const expDate = new Date(delDateObj);
        expDate.setDate(expDate.getDate() + 365); // 12 Months standard warranty
        warrantyExpiryStr = expDate.toISOString().substring(0, 10);
        daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0) {
          isWarrantyActive = true;
          activeCount += 1;
        } else {
          expiredCount += 1;
        }
      } else {
        pendingCount += 1;
      }

      // Check if delivery items are strictly machines
      if (Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.length > 0) {
        d.danhSachMaMay.forEach((code, codeIdx) => {
          // Strictly exclude bogus numbers or shipping items
          const serialCode = code.trim();
          if (!serialCode || serialCode.toLowerCase().includes('phí') || serialCode.toLowerCase().includes('cước')) return;

          serialList.push({
            id: `${d.id}_${codeIdx}`,
            serial: serialCode.startsWith('#') ? serialCode : `#${serialCode}`,
            productName: (d.products?.[0]?.productName || contract?.products?.[0]?.productName || 'Máy may Công nghiệp SGM'),
            model: ((d.products?.[0] as any)?.model || (contract?.products?.[0] as any)?.model || 'SGM-Series'),
            customerId: d.customerId || cust?.id,
            customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
            customerPhone: cust?.sdt || (d as any).sdt,
            customerProvince: cust?.tinhThanh || (d as any).tinhThanh,
            contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
            contractId: d.contractId || contract?.id,
            deliveryId: d.id,
            deliveryCode: (d as any).soPhieuGiao || (d as any).soPhieuXuat,
            deliveryDate: deliveryDate,
            status: isDelivered ? 'DELIVERED' : (d.ngayGiaoMay ? 'IN_TRANSIT' : 'PENDING'),
            warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
            warrantyExpiry: warrantyExpiryStr,
            daysRemaining
          });
        });
      } else if (Array.isArray(d.products) && d.products.length > 0) {
        // Filter ONLY machine line items
        const machineProducts = d.products.filter(p => classifyProductCategory(p) === 'MAY');
        machineProducts.forEach((p, pIdx) => {
          const sNo = (p as any).serial || `#SGM-${String(idx + 100).padStart(4, '0')}-${pIdx + 1}`;
          serialList.push({
            id: `${d.id}_p_${pIdx}`,
            serial: sNo,
            productName: p.productName || (p as any).tenSanPham || 'Máy may SGM',
            model: (p as any).model || (p as any).productId || 'SGM-Standard',
            customerId: d.customerId || cust?.id,
            customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
            customerPhone: cust?.sdt,
            customerProvince: cust?.tinhThanh,
            contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
            contractId: d.contractId || contract?.id,
            deliveryId: d.id,
            deliveryCode: (d as any).soPhieuGiao || (d as any).soPhieuXuat,
            deliveryDate: deliveryDate,
            status: isDelivered ? 'DELIVERED' : 'PENDING',
            warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
            warrantyExpiry: warrantyExpiryStr,
            daysRemaining
          });
        });
      } else {
        // Fallback machine record
        serialList.push({
          id: `${d.id}_gen`,
          serial: `#SGM-PGH-${String(idx + 1).padStart(4, '0')}`,
          productName: contract?.products?.[0]?.productName || 'Thiết bị Máy may SGM',
          model: (contract?.products?.[0] as any)?.model || 'SGM-Standard',
          customerId: d.customerId || cust?.id,
          customerName: cust?.tenKhachHang || d.tenKhachHang || 'Khách hàng SGM',
          customerPhone: cust?.sdt,
          customerProvince: cust?.tinhThanh,
          contractNo: d.soHopDong || contract?.soHopDong || (d as any).soPhieuGiao || `#PGH-${idx + 1}`,
          contractId: d.contractId || contract?.id,
          deliveryId: d.id,
          deliveryCode: (d as any).soPhieuGiao || (d as any).soPhieuXuat,
          deliveryDate: deliveryDate,
          status: isDelivered ? 'DELIVERED' : 'PENDING',
          warrantyStatus: isDelivered ? (isWarrantyActive ? 'ACTIVE' : 'EXPIRED') : 'PENDING',
          warrantyExpiry: warrantyExpiryStr,
          daysRemaining
        });
      }
    });

    const topModels = Object.values(modelAggMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    return {
      topMachineModels: topModels,
      machineSerialItems: serialList,
      activeWarrantiesCount: activeCount,
      expiredWarrantiesCount: expiredCount,
      pendingWarrantiesCount: pendingCount
    };
  }, [filteredContracts, filteredDeliveries, customerMap, contractMap]);

  // Filtered Serials
  const filteredSerials = useMemo(() => {
    let list = machineSerialItems;
    if (serialStatusFilter === 'ACTIVE') {
      list = list.filter(s => s.warrantyStatus === 'ACTIVE');
    } else if (serialStatusFilter === 'EXPIRED') {
      list = list.filter(s => s.warrantyStatus === 'EXPIRED');
    } else if (serialStatusFilter === 'PENDING') {
      list = list.filter(s => s.warrantyStatus === 'PENDING');
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
  }, [machineSerialItems, serialStatusFilter, serialSearch]);

  const totalContractUnits = pipelineMatrix.MAY.contractsQty + pipelineMatrix.VAT_TU.contractsQty + pipelineMatrix.DICH_VU.contractsQty;
  const totalContractValue = pipelineMatrix.MAY.contractsVal + pipelineMatrix.VAT_TU.contractsVal + pipelineMatrix.DICH_VU.contractsVal;
  const totalPaidValue = pipelineMatrix.MAY.paidVal + pipelineMatrix.VAT_TU.paidVal + pipelineMatrix.DICH_VU.paidVal;
  const totalDeliveredUnits = pipelineMatrix.MAY.deliveredQty + pipelineMatrix.VAT_TU.deliveredQty + pipelineMatrix.DICH_VU.deliveredQty;

  const totalHandoverRate = totalContractUnits > 0 
    ? Math.min(100, Math.round((totalDeliveredUnits / totalContractUnits) * 100))
    : (totalDeliveredUnits > 0 ? 100 : 0);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full px-6 animate-in fade-in">
      
      {/* 1. TOP HEADER & MULTI-TEMPORAL PERIOD FILTER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu size={20} className="text-blue-600" />
            Trung Tâm Báo Cáo & Phân Tích Danh Mục Sản Phẩm SGM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ cấu 3 nhóm chuẩn (MÁY • VẬT TƯ • DỊCH VỤ) • Ma trận 5 chiều • Giám sát bảo hành máy chuyên sâu
          </p>
        </div>

        {/* Multi-Temporal Period Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'THIS_MONTH', label: 'Tháng này' },
            { id: 'THIS_QUARTER', label: 'Quý này' },
            { id: '6_MONTHS', label: '6 Tháng' },
            { id: '1_YEAR', label: '1 Năm' },
            { id: '2_YEARS', label: '2 Năm' },
            { id: '3_YEARS', label: '3 Năm' },
            { id: '4_YEARS', label: '4 Năm' },
            { id: 'ALL', label: 'Tất cả' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriodFilter(tab.id as TimePeriodFilter)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs font-bold ${
                periodFilter === tab.id 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. EXECUTIVE KPI SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Tổng Thiết bị Ký Hợp đồng */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sản Lượng Hợp Đồng</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Cpu size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {pipelineMatrix.MAY.contractsQty.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">máy</span>
            </div>
            <div className="text-2xs text-slate-500 mt-2 font-medium flex items-center gap-1">
              <span>Vật tư: <strong>{pipelineMatrix.VAT_TU.contractsQty}</strong> mục · Dịch vụ: <strong>{pipelineMatrix.DICH_VU.contractsQty}</strong> gói</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tỉ lệ Bàn Giao Hoàn Tất */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỉ Lệ Bàn Giao & Lắp Đặt</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">{totalHandoverRate}%</span>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                ({pipelineMatrix.MAY.deliveredQty}/{pipelineMatrix.MAY.contractsQty} máy)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalHandoverRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Doanh Số Thu Thực Tế */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Số Thực Thu</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <PackageCheck size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(totalPaidValue)}
            </div>
            <div className="flex items-center justify-between text-2xs text-slate-500 mt-2 font-medium">
              <span>Tổng HĐ: {formatCurrency(totalContractValue)}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Máy Đang Trong Hạn Bảo Hành */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bảo Hành Chính Hãng</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-teal-700 tracking-tight tabular-nums">
              {activeWarrantiesCount} <span className="text-sm font-semibold text-slate-500">máy đang bảo hành</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-teal-600 mt-2 font-medium">
              <CheckCircle2 size={14} />
              <span>Chính sách SGM bảo hành 12 tháng</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MA TRẬN PHÂN TÍCH ĐA CHIỀU 5 TRỤC (5-DIMENSIONAL CROSS-TABULATION MATRIX) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Ma Trận Phân Tích 5 Chiều Theo Cơ Cấu 3 Nhóm Sản Phẩm
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Đối soát toàn diện: Báo Giá → Hợp Đồng → Doanh Số Thực Thu → Công Nợ Còn Lại → Tiến Độ Giao Hàng
            </p>
          </div>
          <span className="text-2xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
            Taxonomy: MÁY • VẬT TƯ • DỊCH VỤ
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-3xs">
                <th className="py-3.5 px-4">Nhóm Sản Phẩm</th>
                <th className="py-3.5 px-4 text-right">1. Báo Giá (SL / Trị giá)</th>
                <th className="py-3.5 px-4 text-right">2. Hợp Đồng (SL / Trị giá)</th>
                <th className="py-3.5 px-4 text-right">3. Doanh Số Thực Thu</th>
                <th className="py-3.5 px-4 text-right">4. Công Nợ Còn Lại</th>
                <th className="py-3.5 px-4 text-center">5. Tiến Độ Bàn Giao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {/* ROW 1: MÁY */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">MÁY (Thiết bị chính)</div>
                    <div className="text-2xs text-slate-400 font-normal">Máy may, máy cắt, máy ép cúc, máy tự động...</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.MAY.quotesQty} máy</div>
                  <div className="text-2xs text-blue-600 font-semibold">{formatCurrency(pipelineMatrix.MAY.quotesVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.MAY.contractsQty} máy</div>
                  <div className="text-2xs text-emerald-600 font-semibold">{formatCurrency(pipelineMatrix.MAY.contractsVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(pipelineMatrix.MAY.paidVal)}
                </td>
                <td className="py-4 px-4 text-right font-bold text-amber-600 tabular-nums">
                  {formatCurrency(pipelineMatrix.MAY.debtVal)}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full tabular-nums">
                      {pipelineMatrix.MAY.handoverRate}% ({pipelineMatrix.MAY.deliveredQty}/{pipelineMatrix.MAY.contractsQty} máy)
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 2: VẬT TƯ */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-teal-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">VẬT TƯ (Phụ tùng & Linh kiện)</div>
                    <div className="text-2xs text-slate-400 font-normal">Dao cắt, kim may, ổ chao, cữ gá, linh kiện thay thế...</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.VAT_TU.quotesQty} bộ/cái</div>
                  <div className="text-2xs text-blue-600 font-semibold">{formatCurrency(pipelineMatrix.VAT_TU.quotesVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.VAT_TU.contractsQty} bộ/cái</div>
                  <div className="text-2xs text-emerald-600 font-semibold">{formatCurrency(pipelineMatrix.VAT_TU.contractsVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(pipelineMatrix.VAT_TU.paidVal)}
                </td>
                <td className="py-4 px-4 text-right font-bold text-amber-600 tabular-nums">
                  {formatCurrency(pipelineMatrix.VAT_TU.debtVal)}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full tabular-nums">
                      {pipelineMatrix.VAT_TU.handoverRate}% ({pipelineMatrix.VAT_TU.deliveredQty}/{pipelineMatrix.VAT_TU.contractsQty})
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 3: DỊCH VỤ */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">DỊCH VỤ (Kỹ thuật & Vận chuyển)</div>
                    <div className="text-2xs text-slate-400 font-normal">Bảo dưỡng, bảo trì, sửa chữa, nhân công, cước xe...</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.DICH_VU.quotesQty} gói</div>
                  <div className="text-2xs text-blue-600 font-semibold">{formatCurrency(pipelineMatrix.DICH_VU.quotesVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  <div className="font-bold text-slate-850 tabular-nums">{pipelineMatrix.DICH_VU.contractsQty} gói</div>
                  <div className="text-2xs text-emerald-600 font-semibold">{formatCurrency(pipelineMatrix.DICH_VU.contractsVal)}</div>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(pipelineMatrix.DICH_VU.paidVal)}
                </td>
                <td className="py-4 px-4 text-right font-bold text-amber-600 tabular-nums">
                  {formatCurrency(pipelineMatrix.DICH_VU.debtVal)}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full tabular-nums">
                      {pipelineMatrix.DICH_VU.handoverRate}% ({pipelineMatrix.DICH_VU.deliveredQty}/{pipelineMatrix.DICH_VU.contractsQty})
                    </span>
                  </div>
                </td>
              </tr>

              {/* TOTAL SUMMARY ROW */}
              <tr className="bg-slate-100/70 font-bold border-t-2 border-slate-300">
                <td className="py-4 px-4 uppercase text-slate-800 text-xs font-black">
                  TỔNG CỘNG TOÀN BỘ DANH MỤC
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs font-black text-blue-700 tabular-nums">
                    {formatCurrency(pipelineMatrix.MAY.quotesVal + pipelineMatrix.VAT_TU.quotesVal + pipelineMatrix.DICH_VU.quotesVal)}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs font-black text-emerald-700 tabular-nums">
                    {formatCurrency(totalContractValue)}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs font-black text-slate-900 tabular-nums">
                    {formatCurrency(totalPaidValue)}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs font-black text-amber-600 tabular-nums">
                    {formatCurrency(pipelineMatrix.MAY.debtVal + pipelineMatrix.VAT_TU.debtVal + pipelineMatrix.DICH_VU.debtVal)}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-xs font-black text-slate-900 bg-white border border-slate-300 px-3 py-1 rounded-full shadow-2xs">
                    {totalHandoverRate}% Hoàn tất
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. LEADERBOARD TOP MÁY BÁN CHẠY NHẤT */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              Bảng Xếp Hạng Dòng Máy Bán Chạy Nhất (Leaderboard)
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Xếp hạng theo sản lượng máy đã chốt hợp đồng và giá trị mang lại
            </p>
          </div>
          <span className="text-2xs text-slate-400 font-medium">Top {topMachineModels.length} Model</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMachineModels.length > 0 ? (
            topMachineModels.map((item, idx) => {
              const maxQty = topMachineModels[0]?.qty || 1;
              const pct = Math.round((item.qty / maxQty) * 100);
              return (
                <div 
                  key={`${item.name}_${idx}`}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-300 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-800' :
                        idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-2xs text-slate-400 font-medium truncate mt-0.5">
                          Model: {item.model}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900 tabular-nums">{item.qty} máy</div>
                      <div className="text-2xs font-semibold text-blue-600">{formatCurrency(item.value)}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 py-8 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center gap-2">
              <FileSpreadsheet size={32} className="text-slate-300" />
              Chưa có dữ liệu danh mục máy móc trong kỳ lọc được chọn.
            </div>
          )}
        </div>
      </section>

      {/* 5. MACHINE-ONLY SERIAL LIFECYCLE & WARRANTY MONITORING HUB */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Cpu size={18} className="text-blue-600" />
              Trung Tâm Giám Sát Mã Máy, Serial Number & Thời Hạn Bảo Hành
            </h3>
            <p className="text-2xs text-slate-500 mt-1">
              Chỉ theo dõi máy móc thiết bị chính (loại trừ 100% phụ phí/vận chuyển) • Bấm vào chứng từ để xem chi tiết tại chỗ
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
                placeholder="Tìm mã máy, serial, tên khách, tỉnh thành..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSerialStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({machineSerialItems.length})
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'ACTIVE' ? 'bg-white text-teal-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Còn bảo hành ({activeWarrantiesCount})
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('EXPIRED')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'EXPIRED' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã hết hạn ({expiredWarrantiesCount})
              </button>
              <button
                type="button"
                onClick={() => setSerialStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  serialStatusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chờ giao ({pendingWarrantiesCount})
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
                <th className="py-3 px-4">Hợp Đồng / Chứng Từ</th>
                <th className="py-3 px-4">Ngày Bàn Giao</th>
                <th className="py-3 px-4">Trạng Thái Giao</th>
                <th className="py-3 px-4 text-right">Thời Hạn Bảo Hành SGM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSerials.length > 0 ? (
                filteredSerials.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/70 inline-block">
                        {s.serial}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.productName}</div>
                      <div className="text-2xs text-slate-400 font-medium">{s.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        onClick={() => onViewDoc?.('customer', s.customerId || s.customerName)}
                        className={`font-semibold text-slate-900 ${onViewDoc ? 'hover:text-blue-600 cursor-pointer underline-offset-2 hover:underline' : ''}`}
                      >
                        {s.customerName}
                      </div>
                      <div className="text-2xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {s.customerProvince && (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium text-slate-700">
                            {s.customerProvince}
                          </span>
                        )}
                        {s.customerPhone && (
                          <span className="text-slate-400 tabular-nums">{s.customerPhone}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onViewDoc?.('contract', s.contractId || s.contractNo || '')}
                        className={`font-semibold text-slate-700 text-left ${onViewDoc ? 'hover:text-blue-600 cursor-pointer hover:underline' : ''}`}
                      >
                        {s.contractNo}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.deliveryDate ? (
                        <span className="flex items-center gap-1 tabular-nums">
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
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">
                            <ShieldCheck size={11} /> Còn BH {s.daysRemaining !== undefined ? `(${s.daysRemaining} ngày)` : '(12T)'}
                          </span>
                          {s.warrantyExpiry && (
                            <span className="text-3xs text-slate-400 mt-0.5 tabular-nums">
                              Hạn: {s.warrantyExpiry}
                            </span>
                          )}
                        </div>
                      ) : s.warrantyStatus === 'EXPIRED' ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle size={11} /> Hết Hạn BH
                          </span>
                          {s.warrantyExpiry && (
                            <span className="text-3xs text-slate-400 mt-0.5 tabular-nums">
                              Hết ngày {s.warrantyExpiry}
                            </span>
                          )}
                        </div>
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
