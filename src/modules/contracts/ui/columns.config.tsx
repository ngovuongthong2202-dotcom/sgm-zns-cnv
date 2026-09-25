import { ProductItem } from '@/src/domain/schema/product.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
/* eslint-disable max-lines */
import { formatDate } from '@/src/shared/utils/formatDate';
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { StatusPill } from '@/src/widgets/StatusPill';
import { t } from '@/src/i18n/vi';
import { normalizeBusinessName, normalizePersonName, normalizeCode } from '@/src/shared/utils/textFormatter';
import { ContractHoverCard } from './components/ContractHoverCard';
import { CurrencyCell } from '@/src/design-system/dataview/cells/CurrencyCell';


import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { createSttColumn } from '@/src/shared/utils/enrichWithStt';

export const getContractColumns = (
  deliveries: Delivery[],
  payments: Payment[],
  customers: Customer[] = []
): ColumnDef<Contract>[] => [
  createSttColumn<Contract>(),
  {
    id: 'customerId',
    accessorFn: (row) => row.tenKhachHang || row.customerId,
    header: 'Khách hàng',
    enableHiding: true,
  },
  {
    accessorKey: 'ngayKy',
    id: 'ngayKyThang',
    header: 'Tháng',
    size: 100,
    enableHiding: true,
    accessorFn: (row) => row.ngayKy ? (() => {
       const [yyyy, mm] = row.ngayKy.split('-');
       return `${mm}/${yyyy}`;
    })() : '---',
  },
  {
    id: 'soHopDongKhach',
    accessorFn: (row) => row.soHopDong,
    header: t('contract.fields.contractNumber'),
    size: 180,
    cell: (info) => {
       const row = info.row.original;
       return (
         <ContractHoverCard contract={row}>
           <div className="w-full min-w-0 flex items-center">
              <div className="flex flex-col min-w-0">
                 <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-xs truncate" title={row.soHopDong}>{normalizeCode(row.soHopDong || '') || '---'}</span>
                 {row.soDonHang && <span className="text-2xs text-slate-500 font-mono tracking-wide truncate mt-0.5" title={row.soDonHang}>ĐH: {row.soDonHang}</span>}
              </div>
           </div>
         </ContractHoverCard>
       );
    },
    meta: {
      isSticky: true,
    }
  },
  {
    id: 'soPhieuBaoGia',
    accessorFn: (row) => row.soPhieuBaoGia,
    header: 'Số phiếu BG',
    size: 160,
    cell: (info) => {
       const row = info.row.original;
       const v = row.soPhieuBaoGia;
       if (!v) return <span className="text-2xs text-slate-500">—</span>;
       return (
         <div className="w-full min-w-0 flex items-center">
            <span className="font-mono font-bold text-blue-600 hover:text-blue-700 transition-colors text-xs truncate cursor-pointer" title={v}>{v}</span>
         </div>
       );
    }
  },
  {
    accessorKey: 'tenKhachHang',
    id: 'tenKhachHang',
    header: t('customer.fields.name'),
    size: 240,
    cell: (info) => {
      const c = info.row.original;
      let phone = c.sdt || '';
      if (c.customerId && customers.length) {
         const found = customers.find(x => x.id === c.customerId);
         if (found) {
           phone = phone || found.sdt || '';
         }
      }
      
      const rep = normalizePersonName(c.nguoiDaiDien || '');
      const repPhone = [rep, phone].filter(Boolean).join(' - ');

      return (
        <div className="w-full min-w-0 flex items-center">
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-xs text-slate-800 truncate" title={c.tenKhachHang}>{normalizeBusinessName(c.tenKhachHang || '---')}</span>
            <div className="flex items-center gap-1.5 text-2xs text-slate-500 truncate mt-0.5">
               <span className="truncate" title={repPhone}>{repPhone}</span>
            </div>
          </div>
        </div>
      );
    }
  },
  {
    id: 'tinhThanh',
    header: 'Tỉnh/Thành',
    size: 130,
    cell: (info) => {
      const c = info.row.original;
      let prov = (c as any).tinhThanh || '';
      if (!prov && c.customerId && customers.length) {
         const found = customers.find(x => x.id === c.customerId);
         if (found) prov = found.tinhThanh || '';
      }
      if (!prov && c.customerId) {
        prov = entityCachePool.get('customers', c.customerId)?.tinhThanh || '';
      }
      if (!prov) return <span className="text-2xs text-slate-500">—</span>;
      return (
        <span className="text-xs text-slate-700 truncate block" title={prov}>{prov}</span>
      );
    }
  },
  {
    id: 'ngayKy',
    accessorFn: (row) => row.ngayKy,
    header: 'Ngày ký HĐ',
    size: 150,
    cell: (info) => {
       const c = info.row.original;
       let hoanThanhStr = '---';
       let isOverdue = false;
       if (c.ngayKy && c.soNgayDuKienHoanThanh) {
          const dt = new Date(c.ngayKy);
          dt.setDate(dt.getDate() + c.soNgayDuKienHoanThanh);
          hoanThanhStr = dt.toISOString().split('T')[0];
          // Set beginning of today to ignore time
          const today = new Date();
          today.setHours(0,0,0,0);
          isOverdue = today > dt;
       }
       return (
         <div className="flex flex-col gap-0.5 min-w-0">
           <span className="text-xs font-medium text-slate-800">{formatDate(c.ngayKy)}</span>
           {(c.ngayKy && c.soNgayDuKienHoanThanh) ? (
              <span className={`text-2xs font-medium px-1.5 py-0.5 rounded w-fit truncate mt-0.5 ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`} title={isOverdue ? 'Đã quá hạn dự kiến' : ''}>
                DK: {formatDate(hoanThanhStr)} ({c.soNgayDuKienHoanThanh} ngày)
              </span>
           ) : (
              <span className="text-2xs text-slate-500 mt-0.5">—</span>
           )}
         </div>
       );
    }
  },
  {
    id: 'products',
    header: 'Sản phẩm',
    size: 200,
    cell: (info) => {
      const c = info.row.original;
      const products = c.products || [];
      if (!products.length) {
        return (
          <div className="w-full min-w-0 flex flex-col">
            <span className="text-2xs text-slate-700 font-medium truncate">{c.loai || '---'}</span>
            <span className="text-2xs text-slate-500">SL: {c.slMay || 0}</span>
          </div>
        );
      }
      
      const firstProduct = products[0];
      const hiddenCount = products.length - 1;

      return (
        <div className="w-full min-w-0 flex items-center">
          <div className="flex flex-col min-w-0">
             <div className="flex items-center gap-1.5 text-xs">
               <span className="font-semibold text-slate-500 whitespace-nowrap">{firstProduct.quantity}x</span>
               <span className="text-slate-800 font-medium truncate" title={firstProduct.productName}>{firstProduct.productName}</span>
             </div>
             {hiddenCount > 0 && (
                <span className="text-2xs text-blue-600 font-semibold mt-0.5 uppercase tracking-wide">
                  + {hiddenCount} SP khác
                </span>
             )}
          </div>
        </div>
      );
    }
  },
  {
    id: 'tongGiaTri',
    accessorFn: (row) => {
      const products = row.products || [];
      return products.reduce((acc, p) => acc + (p.total || 0), 0) || row.totalAmount || 0;
    },
    header: () => <div className="text-right w-full">Giá trị HĐ</div>,
    meta: { label: 'Giá trị HĐ', align: 'right' },
    aggregationFn: 'sum',
    size: 130,
    cell: (info) => {
      const row = info.row.original;
      const products = row.products || [];
      const total = Number(info.getValue()) || 0;
      const slMay = row.slMay || products.length || 0;
      return (
        <CurrencyCell 
          value={total} 
          subText={`${slMay} SP`} 
        />
      );
    }
  },
  {
    id: 'workflow',
    header: 'Tiến độ',
    meta: { label: 'Tiến độ' },
    size: 140,
    cell: (info) => {
      const c = info.row.original;
      
      const pays = payments.filter(p => p.contractId === c.id || p.contractId === c.soHopDong || (p as any).contractCode === c.soHopDong || p.soHopDong === c.soHopDong);
      const dels = deliveries.filter(d => d.contractId === c.id || d.contractId === c.soHopDong || (d as any).contractCode === c.soHopDong || d.soHopDong === c.soHopDong);
      
      const cProdList = Array.isArray(c.products) ? c.products : [];
      const totalContractAmount = c.totalAmount || cProdList.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      const totalPaid = pays
        .filter((p: Payment) => !['Chưa TT', 'Hủy', 'HỦY'].includes(p.tinhTrangThanhToan || ''))
        .reduce((sum, p) => sum + (p.soTien || 0), 0);
      const hasTatToan = pays.some((p: Payment) => ['Tất toán', 'TẤT TOÁN', 'Đã thanh toán', 'ĐÃ THANH TOÁN', 'Miễn phí'].includes(p.tinhTrangThanhToan || ''));
      const pctPayment = hasTatToan || (totalContractAmount > 0 && totalPaid >= totalContractAmount)
        ? 100
        : (totalContractAmount > 0 ? Math.min(100, Math.round((totalPaid / totalContractAmount) * 100)) : 0);
      
      const totalContractQty = cProdList.reduce((sum, p) => sum + (p.quantity || 0), 0) || c.slMay || 0;
      const totalDeliveredQty = dels
        .filter((d: Delivery) => d.ngayGiaoThucTe != null)
        .reduce((sum, d) => {
           const dProdList = Array.isArray(d.products) ? d.products : [];
           const qtyInShipment = dProdList.reduce((s: number, prod: ProductItem) => s + (prod.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
           return sum + qtyInShipment;
        }, 0);
      const pctDelivery = totalContractQty > 0 ? Math.min(100, Math.round((totalDeliveredQty / totalContractQty) * 100)) : 0;
      
      const znsStatus = normalizeLegacyStatus(c.trangThaiGuiTinHopDong);

      let statusLabel: string;
      let statusColor: string;

      if (znsStatus === EntityZnsStatus.THAT_BAI) {
        statusLabel = 'ZNS Thất bại';
        statusColor = 'bg-red-50 text-red-700 border-red-200';
      } else if (znsStatus !== EntityZnsStatus.THANH_CONG) {
        statusLabel = 'Chờ gửi ZNS';
        statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
      } else if (pctPayment < 100) {
        statusLabel = 'Chờ thanh toán';
        statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (pctDelivery < 100) {
        statusLabel = 'Chờ giao hàng';
        statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else {
        statusLabel = 'Hoàn tất';
        statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }
      
      return (
        <div className="w-full flex items-center min-w-0">
          <div className={`px-2.5 py-1 text-2xs font-bold rounded-md border ${statusColor} truncate max-w-full`} title={statusLabel}>
            {statusLabel}
          </div>
        </div>
      );
    }
  },
  {
    id: 'trangThaiThanhToan',
    header: t('contract.fields.paymentStatus'),
    size: 160,
    cell: (info) => {
      const c = info.row.original;
      const pays = payments.filter(p => p.contractId === c.id || p.contractId === c.soHopDong || (p as any).contractCode === c.soHopDong || p.soHopDong === c.soHopDong);
      
      const totalContractAmount = c.totalAmount || c.products?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      const totalPaid = pays
        .filter((p: Payment) => !['Chưa TT', 'Hủy', 'HỦY'].includes(p.tinhTrangThanhToan || ''))
        .reduce((sum, p) => sum + (p.soTien || 0), 0);
      const hasTatToan = pays.some((p: Payment) => ['Tất toán', 'TẤT TOÁN', 'Đã thanh toán', 'ĐÃ THANH TOÁN', 'Miễn phí'].includes(p.tinhTrangThanhToan || ''));
      const pct = hasTatToan || (totalContractAmount > 0 && totalPaid >= totalContractAmount)
        ? 100
        : (totalContractAmount > 0 ? Math.min(100, Math.round((totalPaid / totalContractAmount) * 100)) : 0);
      const remaining = pct === 100 ? 0 : Math.max(0, totalContractAmount - totalPaid);

      let colorClass = 'bg-slate-200';
      if (pct === 100) colorClass = 'bg-emerald-500';
      else if (pct > 0) colorClass = 'bg-blue-600';

      return (
        <div className="flex flex-col gap-1 w-full max-w-[140px] leading-normal py-0.5">
          <div className="flex items-center justify-between text-2xs font-medium font-mono">
            <span className="text-slate-800 font-bold">{pct}%</span>
            <span className="text-slate-500 font-semibold truncate leading-none">
              {pct === 100 ? 'Tất toán' : `Nợ: ${new Intl.NumberFormat('vi-VN').format(remaining)}đ`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    }
  },
  {
    id: 'trangThaiGiaoHang',
    header: t('contract.fields.deliveryStatus'),
    size: 160,
    cell: (info) => {
      const c = info.row.original;
      const dels = deliveries.filter(d => d.contractId === c.id);

      const cProdList = Array.isArray(c.products) ? c.products : [];
      const totalContractQty = cProdList.reduce((sum, p) => sum + (p.quantity || 0), 0) || c.slMay || 0;
      const totalDeliveredQty = dels
        .filter((d: Delivery) => d.ngayGiaoThucTe != null)
        .reduce((sum, d) => {
          const dProdList = Array.isArray(d.products) ? d.products : [];
          const qtyInShipment = dProdList.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
          return sum + qtyInShipment;
        }, 0);
      const pct = totalContractQty > 0 ? Math.min(100, Math.round((totalDeliveredQty / totalContractQty) * 100)) : 0;
      const remainingQty = Math.max(0, totalContractQty - totalDeliveredQty);
      
      const latestDelivery = dels
        .filter((d: Delivery) => d.ngayGiaoThucTe)
        .sort((a, b) => {
          const strB = typeof b.ngayGiaoThucTe === 'string' ? b.ngayGiaoThucTe : (typeof (b.ngayGiaoThucTe as any)?.toDate === 'function' ? (b.ngayGiaoThucTe as any).toDate().toISOString() : String(b.ngayGiaoThucTe || ''));
          const strA = typeof a.ngayGiaoThucTe === 'string' ? a.ngayGiaoThucTe : (typeof (a.ngayGiaoThucTe as any)?.toDate === 'function' ? (a.ngayGiaoThucTe as any).toDate().toISOString() : String(a.ngayGiaoThucTe || ''));
          return strB.localeCompare(strA);
        })[0];
      
      let colorClass = 'bg-slate-200';
      if (pct === 100) colorClass = 'bg-emerald-500';
      else if (pct > 0) colorClass = 'bg-teal-500';

      return (
        <div className="flex flex-col gap-1 w-full max-w-[140px] leading-normal py-0.5">
          <div className="flex items-center justify-between text-2xs font-medium font-mono">
            <span className="text-slate-800 font-bold">{totalDeliveredQty}/{totalContractQty} SP</span>
            <span className="text-slate-500 font-semibold truncate leading-none">
              {pct === 100 ? 'Đã giao đủ' : `Còn: ${remainingQty} SP`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
            <div className={`h-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {latestDelivery && latestDelivery.ngayGiaoThucTe && (
            <span className="text-3xs text-slate-400 font-medium uppercase tracking-wide truncate mt-0.5" title={formatDate(latestDelivery.ngayGiaoThucTe)}>
              Giao: {formatDate(latestDelivery.ngayGiaoThucTe)}
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorFn: (row) => {
        const v = String(row.trangThaiGuiTinHopDong || '');
        return normalizeLegacyStatus(v);
    },
    id: 'trangThaiGuiTinHopDong',
    header: 'ZNS',
    size: 130,
    cell: (info) => {
       const status = info.getValue() as string;
       return (
         <div onClick={(e) => e.stopPropagation()}>
           <StatusPill statusStr={status as keyof typeof EntityZnsStatus} />
         </div>
       );
    }
  },
  {
    accessorKey: 'nguoiPhuTrach',
    id: 'nguoiPhuTrach',
    header: 'Người Phụ Trách',
    size: 150,
    cell: (info) => {
       const v = info.getValue() as string;
       const shortName = v ? v.split(' ').pop() : t('common.unassigned');
       
       return (
         <div className="flex items-center gap-2 group cursor-pointer" onClick={(e) => { e.stopPropagation(); }}>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
               {shortName ? shortName.substring(0, 2).toUpperCase() : '?'}
            </div>
            <span className="text-xs font-medium text-slate-700 truncate">{shortName}</span>
         </div>
       );
    }
  }
];
