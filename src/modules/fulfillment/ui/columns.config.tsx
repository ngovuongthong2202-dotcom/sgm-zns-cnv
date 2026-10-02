import { formatDate } from '@/src/shared/utils/formatDate';
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { DeliveryHoverCard } from './components/DeliveryHoverCard';
import { normalizeBusinessName, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { t } from '@/src/i18n/vi';
import { createSttColumn } from '@/src/shared/utils/enrichWithStt';
import { PicCell } from '@/src/design-system/dataview/cells/PicCell';
import { isPaymentFullyPaid, isPaymentPartial } from '@/src/domain/enums/payment-status';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';

export const getDeliveryColumns = (): ColumnDef<Delivery & { __customerInfo?: any }>[] => [
  createSttColumn() as any,
  {
    accessorKey: 'deliveryId',
    id: 'deliveryId',
    header: 'Số PGH',
    size: 160,
    cell: (info) => {
      const p = info.row.original;
      const isLate = !p.ngayGiaoThucTe && p.ngayGiaoMay && p.ngayGiaoMay < new Date().toISOString().split('T')[0];
      const shipments = Array.isArray(p.cacDotGiao) ? p.cacDotGiao : [];
      const hasMulti = shipments.length > 1;
      const latestShipment = shipments.length > 0 ? shipments[shipments.length - 1] : null;
      const isSinglePartial = shipments.length === 1 && shipments[0]?.isDotCuoiCung === false;
      
      return (
        <DeliveryHoverCard delivery={p}>
          <div className="w-full min-w-0 flex flex-col items-start justify-center text-xs h-full cursor-pointer py-1">
            <div className="flex items-center gap-1.5 max-w-full">
              <span className={`font-mono font-bold truncate transition-colors ${isLate ? 'text-red-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                {p.deliveryId}
              </span>
              {hasMulti ? (
                <span className="text-3xs font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0" title={`Tổng cộng ${shipments.length} đợt giao`}>
                  {shipments.length} đợt
                </span>
              ) : isSinglePartial ? (
                <span className="text-3xs font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 shrink-0" title="Đợt giao phân kỳ">
                  Đợt 1
                </span>
              ) : p.dotGiaoHang && p.dotGiaoHang > 1 ? (
                <span className="text-3xs font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 shrink-0">
                  Đợt {p.dotGiaoHang}{p.isDotCuoiCung ? ' (Cuối)' : ''}
                </span>
              ) : null}
              {p.dacCachGiaoTruoc ? (
                <span className="text-3xs font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 shrink-0" title="Đặc cách Ban Giám Đốc xuất hàng trước">
                  ⭐ ĐC
                </span>
              ) : null}
            </div>
            {latestShipment?.soPhieuXuat ? (
              <span className="text-2xs text-slate-500 font-mono tracking-tight shrink-0">
                PX: {latestShipment.soPhieuXuat}{hasMulti ? ` (Đ${latestShipment.dotGiaoHang || shipments.length})` : ''}
              </span>
            ) : p.soPhieuXuat ? (
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
    cell: (info) => (
      <PicCell fullName={info.getValue() as string} />
    ),
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
    size: 280,
    cell: (info) => {
      const p = info.row.original;
      const c = p.__customerInfo;
      const specificReceiver = (p as any).nguoiNhanHang || (p as any).nguoiLienHe || p.nguoiDaiDien || '';
      const specificPhone = (p as any).sdtNguoiNhan || (p as any).sdtLienHe || p.sdt || '';
      const contacts = c?.contacts || [];
      
      const tenKH = normalizeBusinessName(c?.tenKhachHang || p.tenKhachHang || '---');
      
      const formatPhoneHelper = (rawPhone: string) => {
        if (!rawPhone) return '';
        const ext = extractVietnamesePhones(rawPhone);
        const parts: string[] = [];
        if (ext.mobilePhones.length > 0) parts.push(ext.mobilePhones.map(m => m.formatted).join(' • '));
        if (ext.landlinePhones.length > 0) parts.push(`☎️ ${ext.landlinePhones.map(m => m.formatted).join(' • ')}`);
        return parts.length > 0 ? parts.join(' | ') : rawPhone;
      };

      const displaySpecificPhone = formatPhoneHelper(specificPhone);

      return (
        <div className="w-full min-w-0 flex flex-col py-1 justify-center space-y-0.5">
          <span className="font-semibold text-xs text-slate-800 line-clamp-3 whitespace-normal break-words leading-snug block" title={tenKH}>{tenKH}</span>
          
          {specificReceiver || specificPhone ? (
            <span className="text-2xs text-slate-700 whitespace-normal break-words leading-tight block font-medium" title={`${normalizePersonName(specificReceiver)} ${displaySpecificPhone ? `- ${displaySpecificPhone}` : ''}`}>
              👤 {normalizePersonName(specificReceiver || 'Người nhận')}
              {displaySpecificPhone && (
                <>
                  <span className="mx-1 text-slate-400">-</span>
                  <span className="font-mono text-blue-700 font-semibold">{displaySpecificPhone}</span>
                </>
              )}
            </span>
          ) : null}

          {contacts.length > 0 ? (
            contacts.filter((ct: any) => ct.sdt !== specificPhone).slice(0, 2).map((contact: any, index: number) => {
              const ctPhone = formatPhoneHelper(contact.sdt);
              return (
                <span key={index} className="text-2xs text-slate-500 whitespace-normal break-words leading-tight block" title={`${normalizePersonName(contact.nguoiDaiDien || '')} ${ctPhone ? `- ${ctPhone}` : ''}`}>
                  {normalizePersonName(contact.nguoiDaiDien || '')}
                  {ctPhone && (
                    <>
                      <span className="mx-1 text-slate-400">-</span>
                      <span className="font-mono">{ctPhone}</span>
                    </>
                  )}
                </span>
              );
            })
          ) : (
            !specificReceiver && (c?.nguoiDaiDien || c?.sdt) ? (
              <span className="text-2xs text-slate-500 whitespace-normal break-words leading-tight block">
                {normalizePersonName(c?.nguoiDaiDien || '')}
                {c?.sdt && (
                  <>
                    <span className="mx-1 text-slate-400">-</span>
                    <span className="font-mono">{formatPhoneHelper(c?.sdt)}</span>
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
    id: 'diaChiGiaoHang',
    header: 'Địa chỉ giao hàng',
    size: 260,
    cell: (info) => {
      const p = info.row.original as any;
      const diaChi = p.diaChiGiaoHang || p.diaChi || p.__customerInfo?.diaChi || p.__customerInfo?.tinhThanh || p.tinhThanh || '---';
      return (
        <div className="w-full min-w-0 flex items-center text-xs py-0.5">
          <span className="line-clamp-2 text-slate-750 font-medium leading-relaxed break-words" title={diaChi}>
            {diaChi}
          </span>
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
          {((p as any).dacCachGiaoTruoc || (p as any).hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU') && (() => {
            const rawStatus = (p as any).tinhTrangThanhToan || (p as any).__paymentInfo?.tinhTrangThanhToan || '';
            const approver = (p as any).nguoiPheDuyetDacCach ? ` [Duyệt: ${(p as any).nguoiPheDuyetDacCach}]` : '';
            const reason = (p as any).lyDoDacCach ? ` - ${(p as any).lyDoDacCach}` : '';
            const tooltip = `Đặc cách Giao trước TT sau${approver}${reason}`;

            if (isPaymentFullyPaid(rawStatus)) {
              return (
                <div className="flex items-center w-full mt-0.5" title={tooltip}>
                  <span className="text-3xs text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-300 uppercase tracking-wider truncate flex items-center gap-0.5">
                    ✓ Đã tất toán (Đặc cách xong)
                  </span>
                </div>
              );
            }
            if (isPaymentPartial(rawStatus)) {
              return (
                <div className="flex items-center w-full mt-0.5" title={tooltip}>
                  <span className="text-3xs text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-300 uppercase tracking-wider truncate flex items-center gap-0.5">
                    ⚡ Giao trước - Đã thu 1 phần
                  </span>
                </div>
              );
            }
            return (
              <div className="flex items-center w-full mt-0.5" title={tooltip}>
                <span className="text-3xs text-red-700 font-bold bg-red-50 px-1 py-0.5 rounded border border-red-300 uppercase tracking-wider truncate flex items-center gap-0.5 animate-pulse">
                  ⚡ Giao trước - Chưa thanh toán
                </span>
              </div>
            );
          })()}
          {(!p.soHopDong && !p.soDonHang && !p.dacCachGiaoTruoc) && (
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
      const soPhieuBaoGia = p.__quotationInfo?.soPhieuBaoGia || p.__quotationInfo?.soBaoGia || p.soPhieuBaoGia || p.soBaoGia || (p.quotationId ? 'Có BG' : null);
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
    size: 145,
    cell: (info) => {
      const d = info.row.original;
      const shipments = Array.isArray(d.cacDotGiao) ? d.cacDotGiao : [];
      const hasShipments = shipments.length > 0;
      
      const isCancelled = (d as any).tinhTrangGiaoHang === 'HUY' || (d as any).tinhTrangGiaoHang === 'Hủy';
      if (isCancelled) {
        return (
          <div className="w-full flex items-center min-w-0 py-1">
            <div className="px-2 py-0.5 text-2xs font-medium rounded-md border bg-red-50 text-red-700 border-red-200 truncate">
              Đã hủy
            </div>
          </div>
        );
      }

      if (hasShipments) {
        let totalBaseline = (d.products || []).reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        if (totalBaseline === 0 && Number(d.slMay) > 0) totalBaseline = Number(d.slMay);

        const totalShipped = shipments.reduce((sum, s) => {
          const sQty = (s.products || []).reduce((ssum, sp) => ssum + (Number(sp.quantity) || 0), 0);
          return sum + (sQty || Number(s.slMay) || 0);
        }, 0);

        const pct = totalBaseline > 0 ? Math.min(100, Math.round((totalShipped / totalBaseline) * 100)) : (d.tienDoLuyKe || 100);
        const isPhysicalConfirmed = Boolean(d.ngayGiaoThucTe) || 
          ['HOAN_TAT', 'DA_GIAO', 'ĐÃ GIAO', 'HOÀN TẤT'].includes(d.tinhTrangGiaoHang || '') ||
          (shipments.length > 0 && shipments.every(s => Boolean(s.ngayGiaoThucTe)));

        const isDone = pct >= 100 && isPhysicalConfirmed;
        const isAwaitingConfirm = pct >= 100 && !isPhysicalConfirmed;

        let statusText = `${pct}%`;
        let statusTitle = `Tiến độ: ${pct}%`;
        let barColor = 'bg-blue-600';
        let textColor = 'text-blue-700';

        if (isDone) {
          statusText = 'Hoàn tất 100%';
          statusTitle = 'Đã bàn giao và xác nhận nhận hàng 100%';
          barColor = 'bg-emerald-500';
          textColor = 'text-emerald-700 font-extrabold';
        } else if (isAwaitingConfirm) {
          statusText = 'Chờ xác nhận (100%)';
          statusTitle = 'Đã xuất đủ 100% hàng nhưng chưa có ngày giao thực tế / xác nhận ký nhận';
          barColor = 'bg-blue-500';
          textColor = 'text-blue-700 font-bold';
        } else {
          statusText = shipments.length > 1 ? `Giao ${shipments.length} đợt (${pct}%)` : `Đã xuất ${pct}%`;
          statusTitle = `Đã giao ${totalShipped}/${totalBaseline} sản phẩm (${pct}%)`;
          barColor = 'bg-blue-600';
          textColor = 'text-blue-700 font-semibold';
        }

        return (
          <div className="w-full flex flex-col justify-center min-w-0 py-1 gap-1" title={statusTitle}>
            <div className="flex items-center justify-between text-3xs font-mono">
              <span className={`truncate ${textColor}`}>
                {statusText}
              </span>
              <span className="font-bold text-slate-750">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div 
                style={{ width: `${pct}%` }} 
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              />
            </div>
          </div>
        );
      }

      const znsStatus = normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang);
      const isDelivered = Boolean(d.ngayGiaoThucTe) || ['HOAN_TAT', 'DA_GIAO', 'ĐÃ GIAO', 'HOÀN TẤT'].includes(d.tinhTrangGiaoHang || '');

      let statusLabel: string;
      let statusColor: string;

      if (!isDelivered) {
        statusLabel = 'Chờ xác nhận';
        statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (znsStatus === EntityZnsStatus.THAT_BAI) {
        statusLabel = 'ZNS Thất bại';
        statusColor = 'bg-red-50 text-red-700 border-red-200';
      } else if (znsStatus !== EntityZnsStatus.THANH_CONG) {
        statusLabel = 'Chờ gửi ZNS';
        statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
      } else {
        statusLabel = 'Hoàn tất 100%';
        statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
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
