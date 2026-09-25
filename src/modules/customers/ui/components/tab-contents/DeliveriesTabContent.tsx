import { Delivery } from '@/src/domain/schema/delivery.schema';
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { ProductItem } from '@/src/domain/schema/product.schema';
import React from 'react';
import { Truck, ExternalLink } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { getStatusBadgeMeta } from '@/src/domain/enums/zns-status';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';

interface DeliveriesTabContentProps {
  loading: boolean;
  deliveries: Delivery[];
}

export function DeliveriesTabContent({ loading, deliveries }: DeliveriesTabContentProps) {
  const { openDrawer } = useDrawerStack();

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 animate-pulse bg-white rounded-xl border">
        Đang tải tiến trình giao nhận máy...
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="p-8 text-center text-xs bg-slate-50/50 text-slate-550 rounded-xl border border-dashed border-slate-200">
        Chưa phát sinh giao dịch nhận máy hay biên bản bàn giao nào.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deliveries.map((d) => {
        const znsMeta = getStatusBadgeMeta((d as any).trangThaiGuiTinGiaoHang || (d as any).trangThaiGuiTin);
        const ZnsIcon = znsMeta.icon;

        return (
          <div 
            key={d.id} 
            onClick={() => openDrawer('delivery', d.id as string)}
            className="bg-white rounded-xl border border-slate-200 hover:border-slate-350 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer overflow-hidden group"
          >
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 select-none group-hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-slate-500" />
                <span className="font-mono text-xs font-bold text-slate-805 group-hover:text-blue-600 transition-colors">Số hiệu: {getEntityDisplayLabel('delivery', d)}</span>
                {d.soPhieuXuat && (
                  <span className="font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.2 rounded text-2xs font-bold">
                    Phiếu xuất: {d.soPhieuXuat}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-2xs font-semibold border ${znsMeta.color}`}>
                  <ZnsIcon size={10} />
                  <span>ZNS: {znsMeta.label}</span>
                </span>
                <span className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-100">
                  {(d as any).trangThaiGiaoHang || 'HOÀN THÀNH'}
                </span>
                <ExternalLink size={12} className="text-slate-400 group-hover:text-slate-600 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  Ngày giao: <span className="font-semibold text-slate-800">{(d.ngayGiaoMay || d.ngayGiaoThucTe) ? formatDate(d.ngayGiaoMay || d.ngayGiaoThucTe) : '—'}</span>
                </div>
                <div>
                  Đơn vị vận tải: <span className="font-semibold text-slate-800">{d.donViVanChuyen || '—'}</span>
                </div>
              </div>

              {d.ghiChu && (
                <p className="text-xs text-slate-600 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100">
                  <span className="font-bold text-slate-700">Ghi chú vận chuyển:</span> {d.ghiChu}
                </p>
              )}

              {d.products && Array.isArray(d.products) && d.products.length > 0 && (
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 font-semibold text-2xs uppercase tracking-wide border-b border-slate-100">
                        <th className="p-2 pl-3">Dòng sản phẩm bàn giao</th>
                        <th className="p-2 text-center w-24">Số lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.products.map((prod: ProductItem, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/45 text-slate-650">
                          <td className="p-2 pl-3 font-medium text-slate-800">{prod.productName}</td>
                          <td className="p-2 text-center text-slate-500 font-mono text-2xs">{prod.quantity} {prod.unit || 'bộ/cái'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
