import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerHoverCard } from '@/src/modules/customers';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { checkQuotationLock } from '@/src/domain/policy/lock.policy';
import { User, ShieldCheck, MapPin, Calendar, FileText, ArrowUpRight, Zap, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { SearchableSelect } from '@/src/design-system/primitives/SearchableSelect';
import { extractAvatarBadge } from '@/src/shared/utils/userProfile';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { differenceInDays, differenceInHours } from 'date-fns';

interface QuotationDetailOverviewProps {
  quotation: Quotation;
  customer?: Customer;
  matchingContracts: any[];
  matchingPayments: any[];
  matchingDeliveries: any[];
  owners: string[];
  totalValue: number;
  handleOwnerChange: (newOwner: string) => Promise<void>;
  onClose?: () => void;
}

export function QuotationDetailOverview({
  quotation,
  customer,
  matchingContracts,
  matchingPayments,
  matchingDeliveries,
  owners,
  totalValue,
  handleOwnerChange,
  onClose
}: QuotationDetailOverviewProps) {
  const navigate = useNavigate();
  const lockResult = checkQuotationLock(quotation, matchingContracts, matchingPayments, matchingDeliveries);
  const isBgMay = normalizeLoai(quotation.loai) === QUOTATION_LOAI.MAY;

  // Realtime calculated financial lineage
  const totalPaid = (matchingPayments || []).reduce((sum, p) => sum + (Number(p.soTien) || 0), 0);
  const paymentPct = totalValue > 0 ? Math.min(100, Math.round((totalPaid / totalValue) * 100)) : 0;
  const remainingDebt = Math.max(0, totalValue - totalPaid);

  // Deal Health calculation
  const creationDate = (quotation as any).createdAt ? new Date((quotation as any).createdAt) : (quotation.ngayBaoGia ? new Date(quotation.ngayBaoGia) : new Date());
  const now = new Date();
  const daysSinceCreation = Math.max(0, differenceInDays(now, creationDate));

  const { dealHealthClass, dealHealthLabel } = (() => {
    if (totalValue > 0 && totalPaid >= totalValue) {
      return { dealHealthClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dealHealthLabel: 'Đã tất toán giao dịch' };
    }
    if (matchingContracts.length > 0) {
      return { dealHealthClass: 'bg-blue-50 text-blue-700 border-blue-200', dealHealthLabel: 'Đã ký kết hợp đồng' };
    }
    if (daysSinceCreation <= 3) {
      return { dealHealthClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dealHealthLabel: 'Khách hàng mới (Nóng)' };
    }
    if (daysSinceCreation <= 7) {
      return { dealHealthClass: 'bg-amber-50 text-amber-700 border-amber-200', dealHealthLabel: 'Đang đàm phán (Ấm)' };
    }
    return { dealHealthClass: 'bg-rose-50 text-rose-700 border-rose-200', dealHealthLabel: `Đã ngâm ${daysSinceCreation} ngày` };
  })();

  const znsStatus = normalizeLegacyStatus(quotation.trangThaiGuiTinBaoGia);

  return (
    <div className="flex flex-col gap-5 pb-6 pt-1">
      {/* 1. Active State Machine Stream */}
      <WorkflowTimeline 
        quotation={quotation} 
        contracts={matchingContracts} 
        payments={matchingPayments} 
        deliveries={matchingDeliveries}
        onCreateContract={() => {
          onClose?.();
          navigate(`/contracts/new?fromQuotation=${quotation.id}`);
        }}
        onCreatePayment={!isBgMay ? () => {
          onClose?.();
          navigate(`/payments/new?fromQuotation=${quotation.id}`);
        } : undefined}
        onCreateDelivery={!isBgMay ? () => {
          onClose?.();
          navigate(`/deliveries?fromQuotation=${quotation.id}`);
        } : undefined}
        className="shadow-xs border border-slate-200"
      />

      {/* 2. Business Lock Warning (if applicable) */}
      <EntityBusinessLockWarning {...lockResult} />

      {/* 3. Main Workspace: Asymmetric 72% Matrix / 28% Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ===================== CỘT CHÍNH (72%): SPREADSHEET-GRADE DATA MATRIX ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Khối Sản Phẩm Trung Tâm */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                  DANH MỤC THIẾT BỊ & CẤU HÌNH BÁO GIÁ
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200 text-2xs font-bold">
                  {quotation.products?.reduce((acc, p) => acc + (p.quantity || 1), 0) || 0} sản phẩm
                </span>
                <span className={`text-2xs font-bold px-2 py-0.5 rounded-md border ${dealHealthClass}`}>
                  {dealHealthLabel}
                </span>
              </div>
            </div>

            <div className="p-4">
              <DrawerProductList 
                products={quotation.products || []}
                subTotal={quotation.subTotal}
                discountRate={quotation.discountRate}
                discountAmount={quotation.discountAmount}
                vatRate={quotation.vatRate}
                vatAmount={quotation.vatAmount}
                totalAmount={quotation.totalAmount}
                deliveredQuantities={!isBgMay ? quotation.deliveredQuantities : undefined}
                accentColorClass="text-blue-700"
                paidAmount={totalPaid > 0 ? totalPaid : undefined}
                remainingDebt={remainingDebt > 0 && totalPaid > 0 ? remainingDebt : undefined}
              />
            </div>
          </section>

          {/* Khối Điều khoản thương mại & Bàn giao dự kiến */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText size={13} className="text-blue-600" />
              Điều khoản thương mại & Phạm vi thực hiện
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Loại hình báo giá</span>
                <span className="font-bold text-slate-800 text-xs">{quotation.loai || 'Chưa phân loại'}</span>
                <span className="text-3xs text-slate-500 block mt-0.5">
                  {isBgMay ? 'Bắt buộc qua hợp đồng' : 'Có thể xuất bán trực tiếp'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Thời hạn hiệu lực</span>
                <span className="font-bold font-mono text-slate-800 text-xs">
                  {quotation.ngayHetHan ? formatDate(quotation.ngayHetHan) : 'Không giới hạn'}
                </span>
                <span className="text-3xs text-amber-700 font-medium block mt-0.5">
                  Lập ngày: {formatDate(quotation.ngayBaoGia)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Địa điểm giao nhận dự kiến</span>
                <span className="font-semibold text-slate-800 text-xs line-clamp-1" title={(quotation as any).diaChiGiaoHang || customer?.diaChi || 'Theo thỏa thuận'}>
                  {(quotation as any).diaChiGiaoHang || customer?.diaChi || 'Theo thỏa thuận'}
                </span>
                <span className="text-3xs text-slate-500 block mt-0.5">
                  Khu vực: {(quotation as any).tinhThanh || customer?.tinhThanh || 'Toàn quốc'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ===================== CỘT VỆ TINH (28%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng tham chiếu */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <User size={13} className="text-blue-600" />
                Khách hàng pháp nhân
              </span>
              {customer?.maKh && (
                <span className="font-mono text-3xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {customer.maKh}
                </span>
              )}
            </div>

            {customer ? (
              <CustomerHoverCard customer={customer}>
                <div className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all rounded-lg cursor-pointer group">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors line-clamp-1" title={customer.tenKhachHang}>
                    {customer.tenKhachHang}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {customer.sdt && (
                      <span className="font-mono text-3xs font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                        {customer.sdt}
                      </span>
                    )}
                    {customer.loaiKh && (
                      <span className="text-3xs font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                        {customer.loaiKh}
                      </span>
                    )}
                  </div>
                  <p className="text-3xs text-slate-500 mt-2 flex items-center gap-1 line-clamp-1">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    {customer.diaChi || customer.tinhThanh || 'Chưa cập nhật địa chỉ'}
                  </p>
                </div>
              </CustomerHoverCard>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">{quotation.tenKhachHang || 'Khách hàng'}</h4>
                {quotation.sdt && <p className="font-mono text-2xs text-slate-600 mt-1">{quotation.sdt}</p>}
              </div>
            )}
          </section>

          {/* Thẻ 2: Quản trị & PIC Phụ trách */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
                Chuyên viên phụ trách
              </span>
              <StatusPill statusStr={znsStatus as any} />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 font-mono">
                {extractAvatarBadge(quotation.nguoiPhuTrach)}
              </div>
              <div className="flex-1 min-w-0">
                <SearchableSelect 
                  value={quotation.nguoiPhuTrach || ''}
                  onChange={handleOwnerChange}
                  options={owners.map(o => ({ value: o, label: o }))}
                  placeholder="-- Chọn PIC phụ trách --"
                />
              </div>
            </div>
            {!quotation.nguoiPhuTrach && (
              <p className="text-3xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                Báo giá chưa được phân công PIC. Vui lòng chọn người phụ trách để theo dõi.
              </p>
            )}
          </section>

          {/* Thẻ 3: Chuỗi liên kết chứng từ (Deal Lineage Pulse) */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Dòng chảy chứng từ liên kết
            </h4>

            <div className="space-y-2 text-xs">
              {/* Hợp đồng */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Hợp đồng pháp lý:</span>
                {matchingContracts.length > 0 ? (
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-3xs">
                    {matchingContracts[0].soHopDong || 'Đã ký HĐ'}
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-3xs">Chưa lập HĐ</span>
                )}
              </div>

              {/* Thanh toán */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Tiến độ thanh toán:</span>
                <span className={`font-mono font-bold text-3xs px-2 py-0.5 rounded border ${
                  paymentPct === 100 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : paymentPct > 0 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {paymentPct}% ({new Intl.NumberFormat('vi-VN').format(totalPaid)} ₫)
                </span>
              </div>

              {/* Giao hàng */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Xuất kho giao hàng:</span>
                <span className="font-mono font-bold text-slate-700 text-3xs">
                  {matchingDeliveries.length > 0 ? `${matchingDeliveries.length} phiếu giao` : 'Chưa giao'}
                </span>
              </div>
            </div>
          </section>

          {/* Thẻ 4: Ghi chú nội bộ / Phụ lục */}
          {quotation.noiDungGhiChu && (
            <section className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs shadow-2xs">
              <h4 className="text-2xs font-black text-amber-900 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Ghi chú nội bộ / Phụ lục
              </h4>
              <p className="text-slate-700 text-2xs leading-relaxed whitespace-pre-wrap font-medium">
                {quotation.noiDungGhiChu}
              </p>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
