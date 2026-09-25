import React, { useMemo } from 'react';
import { Truck, ChevronDown, ChevronRight, PackageCheck, Phone } from 'lucide-react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { deliveryAggregates } from '../aggregates.config';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';

export const CustomerGroupHeader = React.memo(({ row }: { row: any }) => {
  const isCustomerGroup = row.groupingColumnId === 'customerId';
  let title = String(row.getValue(row.groupingColumnId));
  const badgeText = `${row.subRows.length}`;
  
  // Memoize aggregated data calculation per group row
  const { deliveriesInGroup, calcActual, calcTransit } = useMemo(() => {
    const deliveriesInGroup = row.leafRows.map((r: any) => r.original as Delivery); 
    const calcActual = deliveryAggregates.completedDeliveries(deliveriesInGroup);
    const calcTransit = deliveryAggregates.inTransitDeliveries(deliveriesInGroup);
    return { deliveriesInGroup, calcActual, calcTransit };
  }, [row.leafRows]);

  let phoneContact = '---';

  if (isCustomerGroup) {
    const firstLeaf = deliveriesInGroup[0];
    title = firstLeaf?.tenKhachHang ? cleanProperVietnameseText(firstLeaf.tenKhachHang) : `Khách hàng ẩn danh`;
    phoneContact = firstLeaf?.sdt || '---';
  } else {
    const label = row.groupingColumnId === 'donViVanChuyen' ? 'Vận tải' : row.groupingColumnId === 'tinhTrangGiaoHang' ? 'Trạng thái' : row.groupingColumnId;
    title = `${label}: ${title}`;
  }

  return (
    <div 
      className="bg-slate-50 border-b border-slate-200 px-4 h-11 flex items-center justify-between text-sm font-semibold text-slate-800 cursor-pointer hover:bg-slate-100 transition-colors" 
      style={{ paddingLeft: `${(row.depth * 24) + 16}px` }}
      onClick={(_e) => {
        row.getToggleExpandedHandler()();
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-slate-500 flex items-center justify-center p-0.5 rounded transition-transform">
          {row.getIsExpanded() ? <ChevronDown size={14} strokeWidth={2.5}/> : <ChevronRight size={14} strokeWidth={2.5}/>}
        </span>
        <span className="text-slate-800 truncate" title={title}>
          {title}
        </span>
        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-2xs leading-none mb-0.5">
          {badgeText}
        </span>
        {isCustomerGroup && phoneContact !== '---' && (
          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono ml-2 font-normal">
            <Phone size={12} className="text-slate-400" />
            {phoneContact}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-4 pl-4 border-l border-slate-300/60 text-slate-600">
          {calcTransit > 0 && <span className="flex items-center gap-1 text-amber-700 bg-white text-2xs py-0.5 px-2 rounded font-bold border border-amber-100 shadow-xs"><Truck size={12}/> {calcTransit} đang VC</span>}
          {calcActual > 0 && <span className="flex items-center gap-1 text-emerald-700 bg-white text-2xs py-0.5 px-2 rounded font-bold border border-emerald-100 shadow-xs"><PackageCheck size={12}/> {calcActual} đã giao</span>}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.row.getIsExpanded() === next.row.getIsExpanded();
});

