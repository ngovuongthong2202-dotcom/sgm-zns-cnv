import { formatDate } from '@/src/shared/utils/formatDate';
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { DeliveryHoverCard } from './components/DeliveryHoverCard';
import { normalizeBusinessName, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { t } from '@/src/i18n/vi';

export const getDeliveryColumns = (): ColumnDef<Delivery & { __customerInfo?: any }>[] => [
  {
    accessorKey: 'deliveryId',
    id: 'deliveryId',
    header: 'Số PGH',
    size: 160,
    cell: (info) => {
      const p = info.row.original;
      const isLate = !p.ngayGiaoThucTe && p.ngayGiaoMay && p.ngayGiaoMay < new Date().toISOString().split('T')[0];
      
      return (
        <DeliveryHoverCard delivery={p}>
          <div className="w-full min-w-0 flex flex-col items-start justify-center text-xs h-full cursor-pointer py-1">
            <span className={`font-mono font-bold truncate transition-colors ${isLate ? 'text-red-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
              {p.deliveryId}
            </span>
            {p.soPhieuXuat ? (
              <span className="text-2xs text-slate-500 font-mono tracking-tight shrink-0">PX: {p.soPhieuXuat}</span>
            ) : <span className="text-2xs text-slate-500 italic">---</span>}
          </div>
        </DeliveryHoverCard>
      );
    },
    meta: {
      isSticky: true,
    }
  },
  {
    accessorKey: 'nguoiPhuTrach',
    id: 'nguoiPhuTrach',
    header: 'Người Phụ Trách',
    size: 150,
    cell: (info) => {
      const fullName = (info.getValue() as string) || '';
      const lastName = fullName.trim().split(' ').pop() || '---';
      return (
        <div className="w-full min-w-0 flex items-center text-xs">
          <span className="truncate block font-medium text-slate-700" title={fullName}>{lastName}</span>
        </div>
      );
    },
  },
  {
    id: 'customerId',
    accessorFn: (row) => row.tenKhachHang || row.customerId,
    header: 'Khách hàng',
    enableHiding: true,
  },
  {
    id: 'khachHangDetails',
    accessorFn: (row) => row.tenKhachHang,
    header: 'Khách hàng',
    size: 260,
    cell: (info) => {
      const p = info.row.original;
      const c = p.__customerInfo;
      const contacts = c?.contacts || [];
      
      const tenKH = normalizeBusinessName(p.tenKhachHang || c?.tenKhachHang || '---');

      return (
        <div className="w-full min-w-0 flex flex-col py-1 justify-center space-y-0.5">
          <span className="font-semibold text-xs text-slate-800 truncate block" title={tenKH}>{tenKH}</span>
          
          {contacts.length > 0 ? (
            contacts.map((contact: any, index: number) => (
              <span key={index} className="text-2xs text-slate-500 truncate block" title={`${normalizePersonName(contact.nguoiDaiDien || '')} ${contact.sdt ? `- ${contact.sdt}` : ''}`}>
                {normalizePersonName(contact.nguoiDaiDien || '')}
                {contact.sdt && (
                  <>
                    <span className="mx-1 text-slate-400">-</span>
                    <span className="font-mono">{contact.sdt}</span>
                  </>
                )}
              </span>
            ))
          ) : (
            (p.nguoiDaiDien || c?.nguoiDaiDien || p.sdt || c?.sdt) ? (
              <span className="text-2xs text-slate-500 truncate block">
                {normalizePersonName(p.nguoiDaiDien || c?.nguoiDaiDien || '')}
                {(p.sdt || c?.sdt) && (
                  <>
                    <span className="mx-1 text-slate-400">-</span>
                    <span className="font-mono">{p.sdt || c?.sdt}</span>
                  </>
                )}
              </span>
            ) : null
          )}
        </div>
      );
    }
  },
  {
    id: 'tinhThanh',
    header: 'Tỉnh/Thành',
    size: 130,
    cell: (info) => {
      const p = info.row.original;
      const tinhThanh = p.__customerInfo?.tinhThanh || (p as any).tinhThanh || '---';
      return (
        <div className="w-full min-w-0 flex items-center text-xs">
          <span className="truncate block text-slate-700" title={tinhThanh}>{tinhThanh}</span>
        </div>
      );
    }
  },
  {
    id: 'soBGHdDh',
    header: 'Tham chiếu',
    size: 150,
    cell: (info) => {
      const p = info.row.original as any;
      
      return (
        <div className="w-full flex flex-col justify-center py-1 gap-[2px]">
          {p.soHopDong && (
            <div className="flex items-center w-full group/ref leading-[14px]">
              <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 px-1 rounded uppercase tracking-wider shrink-0 w-[24px] text-center border border-emerald-100">HĐ</span>
              <span className="font-mono text-2xs text-slate-600 font-semibold truncate ml-1.5 group-hover/ref:text-slate-900 transition-colors" title={p.soHopDong}>{p.soHopDong}</span>
            </div>
          )}
          {p.soDonHang && (
            <div className="flex items-center w-full group/ref leading-[14px]">
              <span className="text-3xs text-blue-600 font-bold bg-blue-50 px-1 rounded uppercase tracking-wider shrink-0 w-[24px] text-center border border-blue-100">ĐH</span>
              <span className="font-mono text-2xs text-slate-600 font-semibold truncate ml-1.5 group-hover/ref:text-slate-900 transition-colors" title={p.soDonHang}>#{p.soDonHang}</span>
            </div>
          )}
          {(!p.soHopDong && !p.soDonHang) && (
            <span className="text-2xs text-slate-500 italic leading-none block pt-1">---</span>
          )}
        </div>
      );
    }
  },
  {
    id: 'soPhieuBaoGia',
    header: 'Số phiếu báo giá',
    size: 140,
    cell: (info) => {
      const p = info.row.original as any;
      const soPhieuBaoGia = p.__quotationInfo?.soPhieuBaoGia || p.soPhieuBaoGia || (p.quotationId ? 'Có BG' : null);
      const ngayBaoGia = p.__quotationInfo?.ngayBaoGia ? formatDate(p.__quotationInfo.ngayBaoGia) : (p.ngayBaoGia ? formatDate(p.ngayBaoGia) : null);
      
      return (
        <div className="w-full flex flex-col justify-center py-1 gap-[2px]">
          {soPhieuBaoGia ? (
            <>
              <div className="flex items-center w-full group/ref leading-[14px]">
                <span className="text-3xs text-amber-600 font-bold bg-amber-50 px-1 rounded uppercase tracking-wider shrink-0 w-[24px] text-center border border-amber-100">BG</span>
                <span className="font-mono text-2xs text-slate-600 font-semibold truncate ml-1.5 group-hover/ref:text-slate-900 transition-colors" title={soPhieuBaoGia}>{soPhieuBaoGia}</span>
              </div>
              {ngayBaoGia && (
                <span className="text-2xs text-slate-500 font-medium font-mono pl-[30px]">{ngayBaoGia}</span>
              )}
            </>
          ) : (
            <span className="text-2xs text-slate-500 italic leading-none block pt-1">---</span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'ngayGiaoMayMonth',
    id: 'ngayGiaoMayMonth',
    header: 'Tháng',
    size: 90,
    enableHiding: true,
    accessorFn: (row) => {
      if (!row.ngayGiaoMay) return t('missing.date');
      const [year, month] = row.ngayGiaoMay.split('-');
      return `${month}/${year}`;
    },
    cell: (info) => (
      <div className="w-full min-w-0 flex items-center text-xs">
         <span className="truncate block font-mono text-slate-700">{info.getValue() as string}</span>
      </div>
    )
  },
  {
    accessorKey: 'ngayLapPgh',
    id: 'ngayLapPgh',
    header: 'Ngày lập phiếu',
    size: 110,
    cell: (info) => {
      const p = info.row.original;
      const dateVal = p.ngayLapPgh || (p as any).createdAt || (p as any).ngayTao || '';
      return (
        <div className="w-full min-w-0 flex items-center text-xs font-mono text-slate-750 font-medium">
          <span className="truncate">{dateVal ? formatDate(dateVal) : '---'}</span>
        </div>
      );
    }
  },
  {
    id: 'ngayGiaoMay',
    accessorFn: (row) => row.ngayGiaoMay,
    header: 'Ngày giao',
    size: 140,
    cell: (info) => {
      const p = info.row.original;
      return (
        <div className="w-full min-w-0 flex flex-col justify-center text-2xs font-mono space-y-0.5">
          <div className="flex items-center gap-1 leading-tight">
            <span className="text-3xs text-amber-700 font-extrabold bg-amber-50 px-1 rounded border border-amber-100/70 scale-90 origin-left shrink-0">Dự kiến</span>
            <span className="text-slate-900 font-semibold truncate" title={p.ngayGiaoMay ? formatDate(p.ngayGiaoMay) : '---'}>{p.ngayGiaoMay ? formatDate(p.ngayGiaoMay) : t('missing.date')}</span>
          </div>
          <div className="flex items-center gap-1 leading-tight">
            <span className="text-3xs text-emerald-700 font-extrabold bg-emerald-50 px-1 rounded border border-emerald-100/70 scale-90 origin-left shrink-0">Xác nhận</span>
            <span className="text-slate-600 truncate" title={p.ngayGiaoThucTe ? formatDate(p.ngayGiaoThucTe) : 'Chưa giao'}>
              {p.ngayGiaoThucTe ? formatDate(p.ngayGiaoThucTe) : (
                <span className="text-slate-400 italic font-sans text-2xs">Chờ xác nhận</span>
              )}
            </span>
          </div>
        </div>
      );
    }
  },
  {
    id: 'workflow',
    header: 'Tiến độ',
    meta: { label: 'Tiến độ' },
    size: 140,
    cell: (info) => {
      const d = info.row.original;
      
      const znsStatus = normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang);
      const isDelivered = !!d.ngayGiaoThucTe;
      const isCancelled = (d as any).tinhTrangGiaoHang === 'HUY' || (d as any).tinhTrangGiaoHang === 'Hủy';

      let statusLabel: string;
      let statusColor: string;

      if (isCancelled) {
        statusLabel = 'Đã hủy';
        statusColor = 'bg-red-50 text-red-700 border-red-200';
      } else if (!isDelivered) {
        statusLabel = 'Đang giao hàng';
        statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (znsStatus === EntityZnsStatus.THAT_BAI) {
        statusLabel = 'ZNS Thất bại';
        statusColor = 'bg-red-50 text-red-700 border-red-200';
      } else if (znsStatus !== EntityZnsStatus.THANH_CONG) {
        statusLabel = 'Chờ gửi ZNS';
        statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
      } else {
        statusLabel = 'Hoàn tất';
        statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }
      
      return (
        <div className="w-full flex items-center min-w-0 py-1">
          <div className={`px-2 py-0.5 text-2xs font-medium rounded-md border ${statusColor} truncate max-w-full`} title={statusLabel}>
            {statusLabel}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'tinhTrangGiaoHang',
    id: 'tinhTrangGiaoHang',
    header: 'Tình trạng',
    enableHiding: true,
  },
  {
    accessorKey: 'donViVanChuyen',
    id: 'donViVanChuyen',
    header: 'Vận tải',
    size: 140,
    cell: (info) => {
      const v = String(info.getValue() || '---');
      return (
        <div className="w-full min-w-0 flex items-center text-xs">
          <span className="truncate block text-slate-700" title={v}>{v}</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'trangThaiGuiTinGiaoHang',
    id: 'trangThaiGuiTinGiaoHang',
    header: 'ZNS',
    size: 120,
    cell: (info) => {
       const status = normalizeLegacyStatus(String(info.getValue() || ''));
       return (
         <div onClick={(e) => e.stopPropagation()} className="w-full min-w-0 flex items-center max-w-full">
           <StatusPill statusStr={status as any} />
         </div>
       );
    }
  }
];
