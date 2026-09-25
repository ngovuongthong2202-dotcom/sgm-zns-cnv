import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { normalizeBusinessName, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { QuotationHoverCard } from './components/QuotationHoverCard';

import { CurrencyCell } from '@/src/design-system/dataview/cells/CurrencyCell';
import { PicCell } from '@/src/design-system/dataview/cells/PicCell';
import { ZnsStatusCell } from '@/src/widgets/ZnsStatusCell';
import { WorkflowStatusCell } from '@/src/design-system/dataview/cells/WorkflowStatusCell';
import { DateBadgeCell } from '@/src/design-system/dataview/cells/DateBadgeCell';
import { CodeNameCell } from '@/src/design-system/dataview/cells/CodeNameCell';

export const getDaysDifference = (futureDateStr: string, baseDate: Date = new Date()) => {
  if (!futureDateStr) return 0;
  
  const futureParts = futureDateStr.split('-');
  let future: Date;
  if (futureParts.length === 3) {
    const year = parseInt(futureParts[0], 10);
    const month = parseInt(futureParts[1], 10) - 1;
    const day = parseInt(futureParts[2], 10);
    future = new Date(year, month, day, 0, 0, 0, 0);
  } else {
    future = new Date(futureDateStr);
    future.setHours(0, 0, 0, 0);
  }
  
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);
  
  const diffMs = future.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 3600 * 24));
};

import { createSttColumn } from '@/src/shared/utils/enrichWithStt';

export const getQuotationColumns = (
  contracts: Contract[],
  payments: import('@/src/domain/schema/payment.schema').Payment[],
  deliveries: import('@/src/domain/schema/delivery.schema').Delivery[],
  onEditStatus: (quotation: Quotation, status: "MỚI" | "ĐANG CHỜ" | "ĐÃ CHỐT" | "HỦY") => void,
  onEditPic: (quotation: Quotation, pic: string) => void,
  nguoiPhuTrachList: string[],
  onSendZns: (quotation: Quotation) => void,
  onEdit?: (quotation: Quotation) => void,
): ColumnDef<Quotation>[] => [
  createSttColumn<Quotation>(),
  {
    id: 'customerId',
    accessorFn: (row) => row.tenKhachHang || row.customerId,
    header: 'Khách hàng',
    size: 150,
    enableHiding: true,
  },
  {
    accessorKey: 'tinhThanh',
    id: 'tinhThanh',
    header: 'Tỉnh/Thành',
    size: 130,
    enableHiding: true,
  },
  {
    accessorKey: 'soPhieuBaoGia',
    id: 'soPhieuBaoGia',
    header: 'Số phiếu BG',
    size: 130,
    cell: (info) => (
      <CodeNameCell code={info.getValue() as string} subType={info.row.original.loai} />
    )
  },
  {
    accessorKey: 'tenKhachHang',
    id: 'tenKhachHang',
    header: 'Khách hàng',
    size: 260,
    cell: (info) => {
      const q = info.row.original;
      const name = normalizeBusinessName(q.tenKhachHang || '---');
      const normalizedNguoiDaiDien = normalizePersonName(q.nguoiDaiDien || '');
      const detailStr = [normalizedNguoiDaiDien, q.sdt].filter(Boolean).join(' • ');
      
      return (
        <QuotationHoverCard quotation={q}>
          <div className="w-full min-w-0 flex flex-col justify-center gap-0.5 pointer-events-auto">
            <span className="font-medium text-slate-900 text-xs leading-tight truncate transition-colors group-hover:text-blue-600" title={name}>
              {name}
            </span>
            {detailStr && (
              <span className="text-xs text-slate-500 font-normal truncate" title={detailStr}>
                {detailStr}
              </span>
            )}
          </div>
        </QuotationHoverCard>
      );
    }
  },
  {
    id: 'giaTri',
    accessorFn: (row) => row.products?.reduce((a,p) => a + ((p.price || 0) * (p.quantity || 1)), 0) || 0,
    header: () => <div className="text-right w-full">Trị giá</div>,
    meta: { label: 'Trị giá', align: 'right' },
    aggregationFn: 'sum',
    size: 110,
    cell: (info) => (
      <CurrencyCell 
        value={Number(info.getValue()) || 0} 
        subText={`${info.row.original.slMay || (info.row.original.products?.length || 0)} SP/DV`} 
      />
    )
  },
  {
    accessorKey: 'ngayHetHan',
    id: 'ngayHetHan',
    header: 'Hiệu lực',
    size: 100,
    cell: (info) => {
      const q = info.row.original;
      if (!q.ngayHetHan) return <DateBadgeCell dateStr={null} />;
      
      const diff = getDaysDifference(q.ngayHetHan);
      let badge: string;
      let badgeClass: string;
      
      if (diff <= 0) {
        badge = "Hết hạn";
        badgeClass = "bg-red-50 text-red-600 border border-red-100";
      } else if (diff <= 7) {
        badge = `Sắp hết (${diff}N)`;
        badgeClass = "bg-amber-50 text-amber-600 border border-amber-100";
      } else {
        badge = `Còn ${diff}N`;
        badgeClass = "bg-slate-50 text-slate-500 border border-slate-200";
      }
      
      return <DateBadgeCell dateStr={q.ngayHetHan} badge={badge} badgeClass={badgeClass} />;
    }
  },
  {
    accessorKey: 'ngayBaoGia',
    id: 'timeline',
    header: 'Ngày lập BG',
    size: 100,
    cell: (info) => <DateBadgeCell dateStr={info.row.original.ngayBaoGia} />
  },
  {
    id: 'workflow',
    header: 'Tiến độ',
    meta: { label: 'Tiến độ' },
    size: 140,
    cell: (info) => {
      const q = info.row.original;
      
      const hasContract = contracts.some(c => c.quotationId === q.id);
      const hasPayment = payments.some(p => p.quotationId === q.id || (hasContract && contracts.find(c => c.quotationId === q.id)?.id === p.contractId));
      const hasDelivery = deliveries.some(d => d.quotationId === q.id || (hasContract && contracts.find(c => c.quotationId === q.id)?.id === d.contractId));
      
      const isMachine = normalizeLoai(q.loai) === QUOTATION_LOAI.MAY;
      const znsStatus = normalizeLegacyStatus(q.trangThaiGuiTinBaoGia);

      let statusLabel: string;
      let statusColor: string;

      if (q.tinhTrangBaoGia !== 'ĐÃ CHỐT') {
        if (znsStatus === EntityZnsStatus.THAT_BAI) {
          statusLabel = 'ZNS Thất bại';
          statusColor = 'bg-red-50 text-red-700 border-red-200';
        } else if (znsStatus !== EntityZnsStatus.THANH_CONG) {
          statusLabel = 'Chờ gửi ZNS';
          statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
        } else {
          statusLabel = 'Đã gửi ZNS';
          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
      } else {
        if (isMachine && !hasContract) {
          statusLabel = 'Chờ lập HĐ';
          statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (!hasPayment) {
          statusLabel = 'Chờ thanh toán';
          statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (!hasDelivery) {
          statusLabel = 'Chờ giao hàng';
          statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else {
          statusLabel = 'Hoàn tất';
          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
      }
      
      return <WorkflowStatusCell label={statusLabel} colorClass={statusColor} />;
    }
  },
  {
    accessorFn: (row) => normalizeLegacyStatus(row.trangThaiGuiTinBaoGia),
    id: 'trangThaiGuiTinBaoGia',
    header: 'Log ZNS',
    size: 110,
    cell: (info) => <ZnsStatusCell status={info.getValue() as EntityZnsStatus} />
  },
  {
    accessorKey: 'nguoiPhuTrach',
    id: 'nguoiPhuTrach',
    header: 'Người Phụ Trách',
    size: 150,
    cell: (info) => (
      <PicCell 
        fullName={info.getValue() as string} 
        onClick={onEdit ? () => onEdit(info.row.original) : undefined} 
      />
    )
  }
];

