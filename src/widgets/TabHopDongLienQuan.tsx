import React from "react";
import { Button } from "@/src/design-system/Button";
import { Contract } from "@/src/domain/schema/contract.schema";
import { formatDate } from "@/src/shared/utils/formatDate";
import { useDrawerStack } from "@/src/contexts/DrawerStackContext";
import { FileSignature, Calendar, Clock, DollarSign, Package, ExternalLink, UserCheck, ShieldCheck } from "lucide-react";
import { addVietnamWorkingDays } from "@/src/shared/utils/vietnamBusinessDays";

interface TabHopDongLienQuanProps {
  matchingContracts: Partial<Contract>[];
  onNavigateNew?: () => void;
  showCreateButton?: boolean;
}

export function TabHopDongLienQuan({ matchingContracts, onNavigateNew, showCreateButton }: TabHopDongLienQuanProps) {
  const { openDrawer } = useDrawerStack();

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
  };

  const getContractAmount = (c: any) => {
    return c.giaTriHopDong || c.tongGiaTri || c.totalAmount || c.totalValue || 0;
  };

  const calcTargetDate = (ngayKy?: string, days?: number) => {
    if (!ngayKy) return "—";
    if (!days) return formatDate(ngayKy);
    const target = addVietnamWorkingDays(ngayKy, days);
    return target ? formatDate(target) : "—";
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileSignature size={16} className="text-blue-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Hợp Đồng Kinh Tế ({matchingContracts.length})
          </h4>
        </div>
        {showCreateButton && (
          <Button 
            aria-label="Tạo hợp đồng" 
            variant="secondary" 
            onClick={onNavigateNew} 
            className="text-2xs font-bold py-1 px-3 h-7 bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
          >
            + Tạo Hợp Đồng
          </Button>
        )}
      </div>

      <div className="space-y-3.5">
        {matchingContracts.map((c) => {
          const totalVal = getContractAmount(c);
          const products = (c as any).products || [];

          return (
            <div 
              key={c.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all group"
            >
              {/* Card Header */}
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100/70 text-blue-700 rounded-lg">
                    <FileSignature size={15} />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                      {c.soHopDong || "Hợp đồng chưa đặt tên"}
                    </span>
                    {(c as any).tenCongTy && (
                      <span className="text-2xs text-slate-500 block truncate max-w-xs">{(c as any).tenCongTy}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    {c.tinhTrangHopDong || "Đã ký"}
                  </span>
                  <button
                    type="button"
                    onClick={() => c.id && openDrawer('contract', c.id)}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Mở chi tiết</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              {/* Card Body: Key Metrics & Timeline */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <DollarSign size={12} className="text-emerald-600" /> Giá trị Hợp đồng
                    </span>
                    <span className="font-currency font-black text-sm text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(totalVal)}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Calendar size={12} className="text-blue-600" /> Ngày ký kết
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {c.ngayKy ? formatDate(c.ngayKy) : "—"}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" /> Dự kiến hoàn tất
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {calcTargetDate(c.ngayKy, c.soNgayDuKienHoanThanh)}
                      {c.soNgayDuKienHoanThanh ? (
                        <span className="text-3xs text-slate-500 font-normal ml-1">({c.soNgayDuKienHoanThanh} ngày)</span>
                      ) : null}
                    </span>
                  </div>
                </div>

                {/* Danh sách sản phẩm của hợp đồng (Hiển thị trực diện 100%, không cần bấm mở thêm) */}
                {products.length > 0 && (
                  <div className="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-3xs font-bold uppercase text-slate-500 tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Package size={12} className="text-slate-400" /> Danh mục thiết bị / Sản phẩm ({products.length})
                      </span>
                      <span>Đơn giá & Thành tiền</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-2xs">
                      {products.map((p: any, pIdx: number) => {
                        const lineTotal = (Number(p.quantity) || 0) * (Number(p.unitPrice) || Number(p.donGia) || 0);
                        return (
                          <div key={pIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-800 block truncate">{p.productName || p.tenSanPham || `Sản phẩm #${pIdx + 1}`}</span>
                              {p.productId && (
                                <span className="font-mono text-3xs text-slate-400 block">{p.productId}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-currency font-bold text-slate-900 tabular-nums">
                                {formatMoney(lineTotal || p.totalPrice || p.thanhTien)}
                              </span>
                              <span className="text-3xs text-slate-500 font-medium block">
                                SL: <strong className="font-mono text-slate-700">{p.quantity || 1}</strong> × {formatMoney(p.unitPrice || p.donGia)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Info Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-3xs text-slate-500 border-t border-dashed border-slate-100">
                  {(c as any).daiDienBenB && (
                    <span className="flex items-center gap-1 font-medium">
                      <UserCheck size={12} className="text-slate-400" /> Đại diện ký: <strong className="text-slate-700">{(c as any).daiDienBenB}</strong>
                    </span>
                  )}
                  {(c as any).dieuKhoanGiaoHang && (
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck size={12} className="text-slate-400" /> Đ/K: <span className="text-slate-700">{(c as any).dieuKhoanGiaoHang}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {matchingContracts.length === 0 && (
          <div className="text-center py-8 text-slate-500 italic text-xs bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <p>Chưa có hợp đồng kinh tế nào được liên kết với hồ sơ này.</p>
            {showCreateButton && (
              <Button aria-label="Tạo hợp đồng" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-3 h-7 mx-auto">
                + Tạo Hợp Đồng
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
