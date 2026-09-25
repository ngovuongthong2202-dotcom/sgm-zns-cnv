import { Contract } from '@/src/domain/schema/contract.schema';
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { ProductItem } from '@/src/domain/schema/product.schema';
import React from 'react';
import { FileSignature, Calendar, Clock, ExternalLink } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { getStatusBadgeMeta } from '@/src/domain/enums/zns-status';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const calcCompletionDate = (ngayKyStr?: string, days?: number) => {
  if (!ngayKyStr) return '—';
  if (!days) return formatDate(ngayKyStr);
  try {
    const date = new Date(ngayKyStr);
    if (isNaN(date.getTime())) return '—';
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
};

interface ContractsTabContentProps {
  loading: boolean;
  contracts: Contract[];
}

export function ContractsTabContent({ loading, contracts }: ContractsTabContentProps) {
  const { openDrawer } = useDrawerStack();

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 animate-pulse bg-white rounded-xl border">
        Đang tải dữ liệu hợp đồng...
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-8 text-center text-xs bg-slate-50/50 text-slate-550 rounded-xl border border-dashed border-slate-200">
        Không phát hiện hợp đồng thương mại nào được hoàn tất.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map((c) => {
        const znsMeta = getStatusBadgeMeta((c as any).trangThaiGuiTinHopDong || (c as any).trangThaiGuiTin);
        const ZnsIcon = znsMeta.icon;

        return (
          <div 
            key={c.id} 
            onClick={() => openDrawer('contract', c.id as string)}
            className="bg-white rounded-xl border border-slate-200 hover:border-slate-350 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer overflow-hidden group"
          >
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 select-none group-hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <FileSignature size={14} className="text-slate-500" />
                <span className="font-mono text-xs font-bold text-slate-850 group-hover:text-blue-600 transition-colors">{getEntityDisplayLabel('contract', c)}</span>
                {c.ngayKy && (
                  <span className="text-xs text-slate-450 font-medium font-mono">({formatDate(c.ngayKy)})</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-2xs font-semibold border ${znsMeta.color}`}>
                  <ZnsIcon size={10} />
                  <span>ZNS: {znsMeta.label}</span>
                </span>
                <span className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-bold bg-blue-50 text-blue-850 border border-blue-105">
                  {c.tinhTrangHopDong || 'Đã ký'}
                </span>
                <ExternalLink size={12} className="text-slate-400 group-hover:text-slate-600 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-400 shrink-0" />
                  <span>Ngày ký kết: <span className="font-medium text-slate-800">{c.ngayKy ? formatDate(c.ngayKy) : '—'}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>Dự kiến hoàn thành: <span className="font-semibold text-slate-800">{calcCompletionDate(c.ngayKy, c.soNgayDuKienHoanThanh)}</span> <span className="text-2xs text-slate-500 font-mono">({c.soNgayDuKienHoanThanh || 0} ngày)</span></span>
                </div>
              </div>

              {c.products && Array.isArray(c.products) && c.products.length > 0 && (
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 font-semibold text-2xs uppercase tracking-wide border-b border-slate-100">
                        <th className="p-2 pl-3">Sản phẩm</th>
                        <th className="p-2 text-center w-20">Số lượng</th>
                        <th className="p-2 text-right">Giá</th>
                        <th className="p-2 text-right pr-3">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.products.map((p: ProductItem, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/45 text-slate-650">
                          <td className="p-2 pl-3 font-medium text-slate-800">{p.productName}</td>
                          <td className="p-2 text-center text-slate-500 font-mono text-2xs">{p.quantity} {p.unit || 'cái'}</td>
                          <td className="p-2 text-right text-slate-555 font-mono text-2xs">{formatCurrency(p.price || 0)}</td>
                          <td className="p-2 text-right pr-3 text-slate-950 font-bold font-mono text-2xs">{formatCurrency(p.total || ((p.price || 0) * p.quantity))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center pt-1 bg-white select-none">
                <span className="text-2xs font-mono text-slate-500 font-bold">Đơn vị: {c.dvt || 'VND'}</span>
                <div className="text-right">
                  <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide mr-1.5">Giá trị hợp đồng:</span>
                  <span className="text-sm font-extrabold text-blue-650 font-mono">{formatCurrency(c.totalAmount || c.totalAmount || c.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
