import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Handshake,
  CreditCard,
  Package,
  ShieldCheck,
  X,
  Building2,
  Phone,
  MapPin,
  User,
  Hash,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { formatDate } from '@/src/shared/utils/formatDate';

export interface ChangedField {
  key: string;
  label: string;
  icon: React.ReactNode;
  oldVal: string;
  newVal: string;
}

/**
 * Đợt 0A: hộp này chỉ còn vai trò THÔNG BÁO. Chứng từ đã phát hành là bản ghi lịch sử, không bị cập nhật theo hồ sơ khách.
 * Hành động duy nhất: "Chỉ lưu Khách Hàng (Giữ nguyên chứng từ cũ)". Công cụ cập nhật có kiểm soát sẽ có ở Đợt 2A.
 */
interface CustomerCascadeImpactModalProps {
  show: boolean;
  onClose: () => void;
  originalCustomer: Customer;
  updatedData: Partial<Customer>;
  linkedDocs: {
    quotations: Quotation[];
    contracts: Contract[];
    payments: Payment[];
    deliveries: Delivery[];
  };
  isLoadingLinkedDocs?: boolean;
  onConfirmSaveMasterOnly: () => Promise<void>;
}

const KEEP_LABEL = 'Giữ nguyên';

type Tab = 'overview' | 'quotations' | 'contracts' | 'payments' | 'deliveries';

export function CustomerCascadeImpactModal({
  show,
  onClose,
  originalCustomer,
  updatedData,
  linkedDocs,
  isLoadingLinkedDocs = false,
  onConfirmSaveMasterOnly
}: CustomerCascadeImpactModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!show) return null;

  const changedFields: ChangedField[] = [];
  const checkField = (key: keyof Customer, label: string, icon: React.ReactNode) => {
    const oldVal = (originalCustomer?.[key] as string) || '';
    const newVal = (updatedData?.[key] as string) || '';
    if (String(oldVal).trim() !== String(newVal).trim()) {
      changedFields.push({ key: String(key), label, icon, oldVal: oldVal || '(Trống)', newVal: newVal || '(Trống)' });
    }
  };

  checkField('tenKhachHang', 'Tên khách hàng / Doanh nghiệp', <Building2 size={13} className="text-blue-600" />);
  checkField('nguoiDaiDien', 'Người đại diện / Đầu mối chính', <User size={13} className="text-blue-600" />);
  checkField('sdt', 'Số điện thoại', <Phone size={13} className="text-emerald-600" />);
  checkField('diaChi', 'Địa chỉ chi tiết', <MapPin size={13} className="text-amber-600" />);
  checkField('tinhThanh', 'Tỉnh / Thành phố', <MapPin size={13} className="text-teal-600" />);
  checkField('maSoThue', 'Mã số thuế', <Hash size={13} className="text-slate-600" />);

  const { quotations = [], contracts = [], payments = [], deliveries = [] } = linkedDocs;
  const totalLinked = quotations.length + contracts.length + payments.length + deliveries.length;

  const tabs: { id: Tab; label: string; count: number; activeClass: string }[] = [
    { id: 'overview', label: 'Tổng quan', count: totalLinked, activeClass: 'bg-slate-900 text-white shadow-xs' },
    { id: 'quotations', label: 'Báo giá', count: quotations.length, activeClass: 'bg-amber-600 text-white shadow-xs' },
    { id: 'contracts', label: 'Hợp đồng', count: contracts.length, activeClass: 'bg-emerald-600 text-white shadow-xs' },
    { id: 'payments', label: 'Phiếu thu', count: payments.length, activeClass: 'bg-sky-700 text-white shadow-xs' },
    { id: 'deliveries', label: 'Giao hàng', count: deliveries.length, activeClass: 'bg-amber-700 text-white shadow-xs' },
  ];

  const overviewCards = [
    { icon: <FileText size={14} />, tone: 'amber', title: `Báo giá (${quotations.length})`, note: 'Tên, SĐT, người đại diện, địa chỉ trên các báo giá này giữ nguyên như đã gửi khách.' },
    { icon: <Handshake size={14} />, tone: 'emerald', title: `Hợp đồng (${contracts.length})`, note: 'Bên mua, SĐT, địa chỉ, người đại diện trên hợp đồng giữ nguyên như bản đã ký.' },
    { icon: <CreditCard size={14} />, tone: 'sky', title: `Phiếu thu & UNC (${payments.length})`, note: 'Tên khách, người nộp, SĐT trên phiếu thu giữ nguyên như chứng từ đã lập.' },
    { icon: <Package size={14} />, tone: 'amber', title: `Phiếu Giao Hàng (${deliveries.length})`, note: 'Tên người nhận, địa chỉ giao, SĐT liên hệ trên phiếu giao giữ nguyên.' },
  ];

  const toneClass: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
  };

  const keepCell = (
    <td className="px-3 py-2 text-right text-3xs font-semibold text-slate-500">{KEEP_LABEL}</td>
  );

  const tableShell = (children: React.ReactNode) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
      <table className="w-full text-left text-xs">{children}</table>
    </div>
  );

  const headRow = (cols: string[]) => (
    <thead className="bg-slate-50 text-2xs uppercase text-slate-600 font-bold border-b border-slate-200">
      <tr>
        {cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}
        <th className="px-3 py-2 text-right">Sau khi lưu</th>
      </tr>
    </thead>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-all"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {/* Header */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide uppercase">
                    Phân tích Tác động Thay đổi Khách Hàng
                  </h3>
                  <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {originalCustomer.maKh || 'KH'}
                  </span>
                </div>
                <p className="text-2xs text-slate-400 truncate mt-0.5">
                  Khách hàng <span className="text-slate-200 font-semibold">{originalCustomer.tenKhachHang}</span> đã phát sinh {totalLinked} chứng từ liên quan. Các chứng từ này sẽ giữ nguyên.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-none"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Diff */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  1. So sánh Thay đổi Thông tin
                </h4>
                <span className="text-3xs text-slate-500 font-medium font-mono">
                  {changedFields.length} trường thông tin được điều chỉnh
                </span>
              </div>

              {changedFields.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                  Không có trường thông tin cốt lõi nào thay đổi.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-2xs uppercase text-slate-600 font-bold">
                      <tr>
                        <th className="px-4 py-2.5 w-1/3">Trường dữ liệu</th>
                        <th className="px-4 py-2.5 w-1/3">Giá trị Hiện tại (Cũ)</th>
                        <th className="px-4 py-2.5 w-1/3 text-emerald-800">Giá trị Mới cập nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {changedFields.map((f) => (
                        <tr key={f.key} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-700 flex items-center gap-2">
                            {f.icon}
                            <span>{f.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono line-through decoration-red-400 bg-red-50/20">
                            {f.oldVal}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-emerald-800 bg-emerald-50/40">
                            <span className="inline-flex items-center gap-1">
                              <ArrowRight size={11} className="text-emerald-600" />
                              {f.newVal}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Linked documents (read-only) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  2. Chứng từ liên kết (giữ nguyên sau khi lưu)
                </h4>
                <div className="flex items-center gap-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${activeTab === t.id ? t.activeClass : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingLinkedDocs ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                  Đang quét và phân tích dữ liệu chứng từ liên quan...
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {overviewCards.map((card) => (
                        <div key={card.title} className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${toneClass[card.tone]}`}>{card.icon}</div>
                              <span className="font-bold text-xs text-slate-900">{card.title}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-3xs font-bold bg-slate-200 text-slate-700">{KEEP_LABEL}</span>
                          </div>
                          <p className="text-2xs text-slate-600 leading-relaxed mt-2">{card.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'quotations' && tableShell(
                    <>
                      {headRow(['Mã Báo Giá', 'Ngày', 'Tổng tiền', 'Trạng thái'])}
                      <tbody className="divide-y divide-slate-100">
                        {quotations.map((q) => (
                          <tr key={q.id || q.soPhieuBaoGia} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{q.soPhieuBaoGia}</td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(q.ngayBaoGia)}</td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-800">{new Intl.NumberFormat('vi-VN').format(q.totalAmount || 0)}đ</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {q.lifecycleStatus || q.tinhTrangBaoGia || 'DRAFT'}
                              </span>
                            </td>
                            {keepCell}
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {activeTab === 'contracts' && tableShell(
                    <>
                      {headRow(['Số Hợp Đồng', 'Ngày Ký', 'Giá trị HĐ', 'Trạng thái'])}
                      <tbody className="divide-y divide-slate-100">
                        {contracts.map((c) => (
                          <tr key={c.id || c.soHopDong} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{c.soHopDong}</td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(c.ngayKy)}</td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-800">{new Intl.NumberFormat('vi-VN').format(c.totalAmount || 0)}đ</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {c.tinhTrangHopDong || 'Đã ký kết'}
                              </span>
                            </td>
                            {keepCell}
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {activeTab === 'payments' && tableShell(
                    <>
                      {headRow(['Mã Phiếu Thu', 'Ngày Thu', 'Số Tiền', 'Hình thức'])}
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p.id || p.paymentId} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{p.paymentId}</td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(p.ngayThanhToan)}</td>
                            <td className="px-3 py-2 font-mono font-semibold text-sky-800">{new Intl.NumberFormat('vi-VN').format(p.totalAmount || p.soTien || 0)}đ</td>
                            <td className="px-3 py-2 text-slate-600">{p.phuongThucThanhToan || 'Chuyển khoản'}</td>
                            {keepCell}
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {activeTab === 'deliveries' && tableShell(
                    <>
                      {headRow(['Mã Phiếu Giao', 'Ngày Giao Dự Kiến', 'ĐV Vận Chuyển', 'Trạng thái'])}
                      <tbody className="divide-y divide-slate-100">
                        {deliveries.map((d) => (
                          <tr key={d.id || d.deliveryId} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{d.soPhieuXuat || d.deliveryId}</td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(d.ngayGiaoMay)}</td>
                            <td className="px-3 py-2 text-slate-700">{d.donViVanChuyen || '---'}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {d.tinhTrangGiaoHang || 'CHO_GIAO'}
                              </span>
                            </td>
                            {keepCell}
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </>
              )}
            </div>

            {/* 3. Policy note */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-2xs text-blue-900">
              <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Nguyên tắc dữ liệu:</span>
                <p className="text-blue-800 leading-relaxed">
                  Chứng từ đã phát hành là bản ghi lịch sử. Lưu khách hàng chỉ cập nhật hồ sơ khách; báo giá, hợp đồng, phiếu thu và phiếu giao hàng
                  giữ nguyên nội dung đã in. Công cụ cập nhật chứng từ có kiểm soát (xem trước từng chứng từ, có nhật ký) sẽ có ở đợt nâng cấp sau.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border-none w-full sm:w-auto"
            >
              Quay lại chỉnh sửa
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={onConfirmSaveMasterOnly}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors shadow-xs w-full sm:w-auto"
            >
              Chỉ lưu Khách Hàng (Giữ nguyên chứng từ cũ)
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
