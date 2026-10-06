import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { isZnsSuccessStatus } from '@/src/domain/zns-client';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { normalizeBusinessName, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { QuotationHoverCard } from './components/QuotationHoverCard';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';

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
import { Customer } from '@/src/domain/schema/customer.schema';

export const getQuotationColumns = (
  contracts: Contract[],
  payments: import('@/src/domain/schema/payment.schema').Payment[],
  deliveries: import('@/src/domain/schema/delivery.schema').Delivery[],
  onEditStatus: (quotation: Quotation, status: "MỚI" | "ĐANG CHỜ" | "ĐÃ CHỐT" | "HỦY") => void,
  onEditPic: (quotation: Quotation, pic: string) => void,
  nguoiPhuTrachList: string[],
  onSendZns: (quotation: Quotation, targetPhoneOverride?: string) => void,
  onEdit?: (quotation: Quotation) => void,
  allCustomers?: Customer[],
): ColumnDef<Quotation>[] => [
  createSttColumn<Quotation>(),
  {
    id: 'customerId',
    accessorFn: (row) => {
      const liveCustomer = allCustomers?.find(c => c.id === row.customerId || (c.maKh && c.maKh === row.customerId));
      return liveCustomer?.tenKhachHang || row.tenKhachHang || row.customerId;
    },
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
    size: 290,
    accessorFn: (row: any) => {
      const c = row.__customerInfo;
      const name = row.tenKhachHang || c?.tenKhachHang || '';
      const phone = row.sdt || row.phone || c?.sdt || '';
      const rep = row.nguoiDaiDien || c?.nguoiDaiDien || '';
      const code = row.maKh || c?.maKh || '';
      return `${name} ${phone} ${rep} ${code}`;
    },
    cell: (info) => {
      const q = info.row.original;
      const liveCustomer = allCustomers?.find(c => c.id === q.customerId || (c.maKh && c.maKh === q.customerId));
      const displayName = liveCustomer?.tenKhachHang || q.tenKhachHang || '---';
      const name = normalizeBusinessName(displayName);
      // Ưu tiên đầu mối & SĐT gốc của chính báo giá này, bảo toàn phả hệ khi khách hàng được gộp
      const rawRep = q.nguoiDaiDien || liveCustomer?.nguoiDaiDien || '';
      const normalizedNguoiDaiDien = normalizePersonName(rawRep);
      
      // Gom toàn bộ số điện thoại từ Báo giá & Khách hàng liên kết & Danh bạ để đảm bảo có nút gửi ZNS di động
      const rawPhonesPool = [
        q.sdt,
        q.phone,
        liveCustomer?.sdt,
        liveCustomer?.phone,
        ...(liveCustomer?.contacts?.map((c: any) => c.sdt) || []),
        ...(liveCustomer?.contacts?.flatMap((c: any) => c.danhSachSdt || []) || [])
      ].filter(Boolean).join(' , ');

      const address = q.diaChi || liveCustomer?.diaChi || '';
      const telecom = rawPhonesPool ? extractVietnamesePhones(rawPhonesPool, address) : null;
      const mobileList = telecom?.mobilePhones || [];
      const landlineList = telecom?.landlinePhones || [];
      
      return (
        <QuotationHoverCard quotation={{ ...q, tenKhachHang: displayName, nguoiDaiDien: rawRep, sdt: rawPhonesPool || q.sdt }}>
          <div className="w-full min-w-0 flex flex-col justify-center gap-1 pointer-events-auto py-1">
            <span className="font-semibold text-slate-900 text-xs leading-snug whitespace-normal break-words line-clamp-3 transition-colors group-hover:text-blue-600" title={name}>
              {name}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-2xs leading-tight">
              {normalizedNguoiDaiDien && (
                <span className="text-slate-700 font-medium">👤 {normalizedNguoiDaiDien}</span>
              )}
              {mobileList.length > 0 && mobileList.map((m: any, mIdx: number) => (
                <button 
                  type="button"
                  key={`m-${mIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendZns(q, m.cleaned);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs hover:bg-blue-600 hover:text-white hover:border-blue-700 active:scale-95 transition-all cursor-pointer group/pill"
                  title={m.carrier ? `${m.carrier} - Bấm để gửi tin ZNS trực tiếp đến số ${m.formatted}` : `Bấm để gửi tin ZNS trực tiếp đến số ${m.formatted}`}
                >
                  <span>{m.formatted}</span>
                  {m.carrier && (
                    <span className="text-4xs px-1 rounded bg-blue-100/90 text-blue-800 font-sans group-hover/pill:bg-white/20 group-hover/pill:text-white transition-colors">
                      {m.carrier}
                    </span>
                  )}
                </button>
              ))}
              {landlineList.length > 0 && landlineList.map((l: any, lIdx: number) => (
                <span 
                  key={`l-${lIdx}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200/60 shadow-2xs"
                  title="Máy bàn cố định (Không ZNS)"
                >
                  <span>☎️ {l.formatted}</span>
                </span>
              ))}
              {!telecom && rawPhone && (
                <span className="text-2xs text-slate-500 font-mono">{rawPhone}</span>
              )}
            </div>
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
      
      const relatedContract = contracts.find(c => c.quotationId === q.id);
      const hasContract = Boolean(relatedContract);
      const hasPayment = payments.some(p => p.quotationId === q.id || (relatedContract && relatedContract.id === p.contractId));
      
      const relatedDeliveries = deliveries.filter(d => d.quotationId === q.id || (relatedContract && relatedContract.id === d.contractId));
      const hasDelivery = relatedDeliveries.length > 0;
      const isDeliveryConfirmed = relatedDeliveries.some(d => 
        Boolean(d.ngayGiaoThucTe) || 
        ['HOAN_TAT', 'DA_GIAO', 'ĐÃ GIAO', 'HOÀN TẤT'].includes(d.tinhTrangGiaoHang || '') ||
        (Array.isArray(d.cacDotGiao) && d.cacDotGiao.length > 0 && d.cacDotGiao.every(s => Boolean(s.ngayGiaoThucTe)))
      );
      
      const isMachine = normalizeLoai(q.loai) === QUOTATION_LOAI.MAY;
      const znsStatus = normalizeLegacyStatus(q.trangThaiGuiTinBaoGia);

      let statusLabel: string;
      let statusColor: string;
      let statusTooltip: string | undefined = undefined;
      let statusErrorCode: string | number | undefined = undefined;
      const isZnsSent = isZnsSuccessStatus(q.trangThaiGuiTinBaoGia) || isZnsSuccessStatus((q as any).trangThaiZns);

      if (q.tinhTrangBaoGia !== 'ĐÃ CHỐT') {
        if (znsStatus === EntityZnsStatus.THAT_BAI || znsStatus === EntityZnsStatus.VUOT_HAN_MUC) {
          statusLabel = 'ZNS Thất bại';
          statusColor = 'bg-red-50 text-red-700 border-red-200';
          const errReason = (q as any).thongTinGuiZnsBaoGia?.lyDoThatBai || 
                            (q as any).znsErrorReason || 
                            (q as any).errorReason || 
                            (q as any).znsErrorMessage;
          const errCode = (q as any).thongTinGuiZnsBaoGia?.maLoi || 
                          (q as any).znsErrorCode || 
                          (q as any).errorCode;
          if (errReason) {
            statusTooltip = errCode ? `[Mã lỗi ${errCode}] ${errReason}` : `Lý do: ${errReason}`;
            statusErrorCode = errCode;
          } else {
            statusTooltip = 'Gửi tin ZNS không thành công (Xem chi tiết trong ZNS Hub)';
          }
        } else if (!isZnsSent) {
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
        } else if (!isDeliveryConfirmed) {
          statusLabel = 'Đang giao hàng';
          statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else {
          statusLabel = 'Hoàn tất';
          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
      }
      
      return (
        <WorkflowStatusCell 
          label={statusLabel} 
          colorClass={statusColor} 
          tooltip={statusTooltip} 
          errorCode={statusErrorCode} 
        />
      );
    }
  },
  {
    accessorFn: (row) => normalizeLegacyStatus(row.trangThaiGuiTinBaoGia),
    id: 'trangThaiGuiTinBaoGia',
    header: 'Log ZNS',
    size: 110,
    cell: (info) => (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (onSendZns) onSendZns(info.row.original);
        }}
        className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
        title="Bấm để mở xem trước & gửi ZNS báo giá (#533064)"
      >
        <ZnsStatusCell status={info.getValue() as EntityZnsStatus} />
      </div>
    )
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

