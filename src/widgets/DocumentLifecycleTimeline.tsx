import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  FileSignature, 
  Wallet, 
  Truck, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { TabLichSuHoatDong } from './TabLichSuHoatDong';
import { formatDate } from '@/src/shared/utils/formatDate';
import { formatCurrency as formatMoney } from '@/src/shared/utils/formatCurrency';

interface DocumentLifecycleTimelineProps {
  currentType: 'quotation' | 'contract' | 'payment';
  currentDoc: any;
  relatedQuotations?: any[];
  relatedContracts?: any[];
  relatedPayments?: any[];
  relatedDeliveries?: any[];
}

export function DocumentLifecycleTimeline({
  currentType,
  currentDoc,
  relatedQuotations = [],
  relatedContracts = [],
  relatedPayments = [],
  relatedDeliveries = [],
}: DocumentLifecycleTimelineProps) {
  const navigate = useNavigate();

  const handleOpenDoc = (route: string, doc: any) => {
    if (doc?.id) {
      navigate(`/${route}?id=${doc.id}`, { state: { openDrawer: doc } });
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Vòng đời chứng từ liên quan */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Tiến trình nghiệp vụ & Chuỗi chứng từ liên kết
          </h3>
          <span className="text-3xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-150 uppercase tracking-wider">
            Vòng đời giao dịch
          </span>
        </div>

        <div className="space-y-3">
          {/* Mốc Báo Giá */}
          {currentType === 'quotation' ? (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Báo giá hiện tại: {currentDoc.soPhieuBaoGia}</span>
                  <span className="text-3xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 uppercase">
                    Chứng từ gốc
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                  <span>Trị giá: <strong className="text-slate-900 font-mono">{formatMoney(currentDoc.totalAmount || currentDoc.tongTien)}</strong></span>
                  <span>Ngày lập: <span className="font-mono">{currentDoc.ngayBaoGia ? formatDate(currentDoc.ngayBaoGia) : '---'}</span></span>
                  <span>Phân loại: <span className="font-semibold text-slate-800">{currentDoc.loai || '---'}</span></span>
                </div>
              </div>
            </div>
          ) : relatedQuotations.length > 0 ? (
            relatedQuotations.map(q => (
              <div 
                key={q.id}
                onClick={() => handleOpenDoc('quotations', q)}
                className="p-3.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 group-hover:bg-blue-600 text-slate-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      Báo giá căn cứ: {q.soPhieuBaoGia}
                    </span>
                    <span className="text-3xs text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors inline-flex items-center gap-1">
                      Bấm mở chi tiết <ExternalLink size={10} />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                    <span>Trị giá: <strong className="text-slate-900 font-mono">{formatMoney(q.totalAmount || q.tongTien)}</strong></span>
                    <span>Ngày lập: <span className="font-mono">{q.ngayBaoGia ? formatDate(q.ngayBaoGia) : '---'}</span></span>
                  </div>
                </div>
              </div>
            ))
          ) : null}

          {/* Mốc Hợp Đồng */}
          {currentType === 'contract' ? (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileSignature size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Hợp đồng hiện tại: {currentDoc.soHopDong}</span>
                  <span className="text-3xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Chứng từ gốc
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                  <span>Giá trị HĐ: <strong className="text-slate-900 font-mono">{formatMoney(currentDoc.giaTriHopDong || currentDoc.totalAmount)}</strong></span>
                  <span>Ngày ký: <span className="font-mono">{currentDoc.ngayKy ? formatDate(currentDoc.ngayKy) : '---'}</span></span>
                  {currentDoc.soDonHang && <span>Mã ĐH: <strong className="text-blue-700 font-mono">#{currentDoc.soDonHang}</strong></span>}
                </div>
              </div>
            </div>
          ) : relatedContracts.length > 0 ? (
            relatedContracts.map(c => (
              <div 
                key={c.id}
                onClick={() => handleOpenDoc('contracts', c)}
                className="p-3.5 bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-xl transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <FileSignature size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      Hợp đồng kinh tế: {c.soHopDong}
                    </span>
                    <span className="text-3xs text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors inline-flex items-center gap-1">
                      Bấm mở chi tiết <ExternalLink size={10} />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                    <span>Giá trị HĐ: <strong className="text-slate-900 font-mono">{formatMoney(c.giaTriHopDong || c.totalAmount)}</strong></span>
                    <span>Ngày ký: <span className="font-mono">{c.ngayKy ? formatDate(c.ngayKy) : '---'}</span></span>
                  </div>
                </div>
              </div>
            ))
          ) : null}

          {/* Mốc Thanh Toán */}
          {currentType === 'payment' ? (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wallet size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Phiếu thu hiện tại: {currentDoc.paymentId || currentDoc.soPhieuThu || currentDoc.soChungTu}</span>
                  <span className="text-3xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 uppercase">
                    Chứng từ gốc
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                  <span>Số tiền thu: <strong className="text-slate-900 font-mono">{formatMoney(currentDoc.soTien || currentDoc.amount)}</strong></span>
                  <span>Ngày thanh toán: <span className="font-mono">{currentDoc.ngayThanhToan ? formatDate(currentDoc.ngayThanhToan) : '---'}</span></span>
                  <span>Trạng thái: <strong className="text-blue-800">{currentDoc.tinhTrangThanhToan || '---'}</strong></span>
                </div>
              </div>
            </div>
          ) : relatedPayments.length > 0 ? (
            relatedPayments.map(p => {
              const code = p.paymentId || p.soPhieuThu || p.soChungTu || p.code || 'Phiếu thu';
              return (
                <div 
                  key={p.id}
                  onClick={() => handleOpenDoc('payments', p)}
                  className="p-3.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-200 group-hover:bg-blue-600 text-slate-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <Wallet size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    Đợt thanh toán: {code}
                  </span>
                  <span className="text-3xs text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors inline-flex items-center gap-1">
                    Bấm mở chi tiết <ExternalLink size={10} />
                  </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                      <span>Đã thu: <strong className="text-slate-900 font-mono">{formatMoney(p.soTien || p.amount)}</strong></span>
                      <span>Ngày: <span className="font-mono">{p.ngayThanhToan ? formatDate(p.ngayThanhToan) : '---'}</span></span>
                      <span>Trạng thái: <span className="font-semibold text-emerald-700">{p.tinhTrangThanhToan || '---'}</span></span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}

          {/* Mốc Giao Hàng */}
          {relatedDeliveries.length > 0 ? (
            relatedDeliveries.map(d => {
              const dCode = d.deliveryId || d.soPhieuXuat || d.maGiaoHang || 'Lệnh giao hàng';
              const isDone = d.tinhTrangGiaoHang === 'Hoàn tất' || d.tinhTrangGiaoHang === 'HOÀN TẤT' || !!d.ngayGiaoThucTe;
              return (
                <div 
                  key={d.id}
                  onClick={() => handleOpenDoc('deliveries', d)}
                  className="p-3.5 bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 group-hover:bg-amber-600 text-slate-700 group-hover:text-white'
                  }`}>
                    <Truck size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                        Lệnh giao hàng: {dCode}
                      </span>
                      <span className="text-3xs text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors inline-flex items-center gap-1">
                        Bấm mở chi tiết <ExternalLink size={10} />
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-2xs text-slate-600">
                      <span>Tiến độ: <strong className={isDone ? 'text-emerald-700' : 'text-amber-700'}>{d.tinhTrangGiaoHang || (isDone ? 'Hoàn tất' : 'Đang xử lý')}</strong></span>
                      <span>Ngày giao: <span className="font-mono">{d.ngayGiaoThucTe ? formatDate(d.ngayGiaoThucTe) : (d.ngayGiaoMay ? formatDate(d.ngayGiaoMay) : '---')}</span></span>
                      {d.kyNhan && <span>Người nhận: <strong>{d.kyNhan}</strong></span>}
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>
      </div>

      {/* 2. Nhật ký hoạt động tương tác */}
      <TabLichSuHoatDong entityId={currentDoc?.id || ""} entityType={currentType} />
    </div>
  );
}
