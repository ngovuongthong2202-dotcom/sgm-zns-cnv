import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Handshake, 
  CreditCard, 
  Package, 
  RefreshCw, 
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

export interface CascadeSyncScope {
  syncQuotations?: boolean;
  syncContracts?: boolean;
  syncPayments?: boolean;
  syncDeliveries?: boolean;
}

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
  onConfirmSafeSync: (scope?: CascadeSyncScope) => Promise<void>;
  isSyncing?: boolean;
}

export function CustomerCascadeImpactModal({
  show,
  onClose,
  originalCustomer,
  updatedData,
  linkedDocs,
  isLoadingLinkedDocs = false,
  onConfirmSaveMasterOnly,
  onConfirmSafeSync,
  isSyncing = false
}: CustomerCascadeImpactModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'contracts' | 'payments' | 'deliveries'>('overview');
  const [syncScope, setSyncScope] = useState<CascadeSyncScope>({
    syncQuotations: true,
    syncContracts: true,
    syncPayments: true,
    syncDeliveries: true
  });

  if (!show) return null;

  // Extract Diff
  const changedFields: ChangedField[] = [];

  const checkField = (key: keyof Customer, label: string, icon: React.ReactNode) => {
    const oldVal = (originalCustomer?.[key] as string) || '';
    const newVal = (updatedData?.[key] as string) || '';
    if (String(oldVal).trim() !== String(newVal).trim()) {
      changedFields.push({
        key: String(key),
        label,
        icon,
        oldVal: oldVal || '(Trống)',
        newVal: newVal || '(Trống)'
      });
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


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSyncing ? onClose : undefined}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-all"
        />

        {/* Modal Window */}
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
                    Phân tích Tác động Thay đổi Khách Hàng (Impact Analysis)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {originalCustomer.maKh || 'KH'}
                  </span>
                </div>
                <p className="text-2xs text-slate-400 truncate mt-0.5">
                  Khách hàng <span className="text-slate-200 font-semibold">{originalCustomer.tenKhachHang}</span> đã phát sinh {totalLinked} chứng từ liên quan trong hệ thống.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSyncing}
              className="w-8 h-8 p-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-none"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Visual Diff Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  1. So sánh Thay đổi Thông tin (Field-by-Field Visual Diff)
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

            {/* Section 2: Multi-Module Impact Breakdown Bento */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  2. Bản Đồ Tác Động Chứng Từ Liên Kết (Cross-Module Cascade Grid)
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${
                      activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tổng quan ({totalLinked})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('quotations')}
                    className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${
                      activeTab === 'quotations' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Báo giá ({quotations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contracts')}
                    className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${
                      activeTab === 'contracts' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Hợp đồng ({contracts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${
                      activeTab === 'payments' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Phiếu thu ({payments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deliveries')}
                    className={`px-2 py-1 text-3xs rounded-md font-bold transition-all ${
                      activeTab === 'deliveries' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Giao hàng ({deliveries.length})
                  </button>
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
                      {/* Quotations Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        syncScope.syncQuotations ? 'bg-amber-50/50 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncScope.syncQuotations}
                              onChange={(e) => setSyncScope(prev => ({ ...prev, syncQuotations: e.target.checked }))}
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                            />
                            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                              <FileText size={14} />
                            </div>
                            <span className="font-bold text-xs text-slate-900">Báo giá ({quotations.length})</span>
                          </label>
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                            syncScope.syncQuotations ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {syncScope.syncQuotations ? 'Sẵn sàng đồng bộ' : 'Bỏ qua'}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 leading-relaxed mt-2">
                          Hệ thống sẽ cập nhật tên, SĐT, người đại diện và địa chỉ cho tất cả {quotations.length} bản báo giá liên kết của khách hàng.
                        </p>
                        {changedFields.some(f => f.key === 'sdt') && (
                          <div className="mt-2 p-1.5 rounded-md bg-amber-100/70 border border-amber-300 text-3xs font-medium text-amber-900 flex items-start gap-1.5">
                            <span className="shrink-0 font-bold">ℹ️</span>
                            <span>Báo giá đã từng gửi ZNS thành công sẽ tự động chuyển sang <strong>Chờ gửi ZNS</strong> để gửi lại cho số điện thoại mới. Lịch sử tin nhắn cũ vẫn được bảo lưu 100%.</span>
                          </div>
                        )}
                      </div>

                      {/* Contracts Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        syncScope.syncContracts ? 'bg-emerald-50/50 border-emerald-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncScope.syncContracts}
                              onChange={(e) => setSyncScope(prev => ({ ...prev, syncContracts: e.target.checked }))}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                              <Handshake size={14} />
                            </div>
                            <span className="font-bold text-xs text-slate-900">Hợp đồng ({contracts.length})</span>
                          </label>
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                            syncScope.syncContracts ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {syncScope.syncContracts ? 'Sẵn sàng đồng bộ' : 'Bỏ qua'}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 leading-relaxed mt-2">
                          Đồng bộ tên bên mua, số điện thoại, địa chỉ và người đại diện cho {contracts.length} hợp đồng kinh tế liên quan.
                        </p>
                      </div>

                      {/* Payments Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        syncScope.syncPayments ? 'bg-cyan-50/50 border-cyan-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncScope.syncPayments}
                              onChange={(e) => setSyncScope(prev => ({ ...prev, syncPayments: e.target.checked }))}
                              className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                            />
                            <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                              <CreditCard size={14} />
                            </div>
                            <span className="font-bold text-xs text-slate-900">Phiếu thu & UNC ({payments.length})</span>
                          </label>
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                            syncScope.syncPayments ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {syncScope.syncPayments ? 'Sẵn sàng đồng bộ' : 'Bỏ qua'}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 leading-relaxed mt-2">
                          Đồng bộ tên khách hàng, người nộp tiền và SĐT cho {payments.length} phiếu thu/biên nhận thanh toán.
                        </p>
                      </div>

                      {/* Deliveries Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        syncScope.syncDeliveries ? 'bg-orange-50/50 border-orange-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncScope.syncDeliveries}
                              onChange={(e) => setSyncScope(prev => ({ ...prev, syncDeliveries: e.target.checked }))}
                              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                            />
                            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                              <Package size={14} />
                            </div>
                            <span className="font-bold text-xs text-slate-900">Phiếu Giao Hàng ({deliveries.length})</span>
                          </label>
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                            syncScope.syncDeliveries ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {syncScope.syncDeliveries ? 'Sẵn sàng đồng bộ' : 'Bỏ qua'}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 leading-relaxed mt-2">
                          Cập nhật tên khách nhận hàng, địa chỉ giao máy và SĐT liên hệ cho {deliveries.length} phiếu giao vận chuyển.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'quotations' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-2xs uppercase text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Mã Báo Giá</th>
                            <th className="px-3 py-2">Ngày</th>
                            <th className="px-3 py-2">Tổng tiền</th>
                            <th className="px-3 py-2">Trạng thái</th>
                            <th className="px-3 py-2 text-right">Tác động đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {quotations.map((q) => {
                            return (
                              <tr key={q.id || q.soPhieuBaoGia} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-mono font-bold text-slate-900">{q.soPhieuBaoGia}</td>
                                <td className="px-3 py-2 text-slate-600">{formatDate(q.ngayBaoGia)}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                  {new Intl.NumberFormat('vi-VN').format(q.totalAmount || 0)}đ
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {q.lifecycleStatus || q.tinhTrangBaoGia || 'DRAFT'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {syncScope.syncQuotations ? (
                                    <span className="text-emerald-700 text-3xs font-bold inline-flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Cập nhật theo KH mới
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-3xs">Bảo toàn snapshot</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'contracts' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-2xs uppercase text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Số Hợp Đồng</th>
                            <th className="px-3 py-2">Ngày Ký</th>
                            <th className="px-3 py-2">Giá trị HĐ</th>
                            <th className="px-3 py-2">Trạng thái</th>
                            <th className="px-3 py-2 text-right">Tác động đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {contracts.map((c) => (
                            <tr key={c.id || c.soHopDong} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">{c.soHopDong}</td>
                              <td className="px-3 py-2 text-slate-600">{formatDate(c.ngayKy)}</td>
                              <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                {new Intl.NumberFormat('vi-VN').format(c.totalAmount || 0)}đ
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {c.tinhTrangHopDong || 'Đã ký kết'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-3xs font-medium">
                                {syncScope.syncContracts ? (
                                  <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 size={11} /> Cập nhật bên mua
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Bảo toàn nguyên văn</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-2xs uppercase text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Mã Phiếu Thu</th>
                            <th className="px-3 py-2">Ngày Thu</th>
                            <th className="px-3 py-2">Số Tiền</th>
                            <th className="px-3 py-2">Hình thức</th>
                            <th className="px-3 py-2 text-right">Tác động đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.map((p) => (
                            <tr key={p.id || p.paymentId} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">{p.paymentId}</td>
                              <td className="px-3 py-2 text-slate-600">{formatDate(p.ngayThanhToan)}</td>
                              <td className="px-3 py-2 font-mono font-semibold text-cyan-800">
                                {new Intl.NumberFormat('vi-VN').format(p.totalAmount || p.soTien || 0)}đ
                              </td>
                              <td className="px-3 py-2 text-slate-600">{p.phuongThucThanhToan || 'Chuyển khoản'}</td>
                              <td className="px-3 py-2 text-right text-3xs font-medium">
                                {syncScope.syncPayments ? (
                                  <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 size={11} /> Cập nhật tên KH & nộp
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Bảo toàn chứng từ</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'deliveries' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-2xs uppercase text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Mã Phiếu Giao</th>
                            <th className="px-3 py-2">Ngày Giao Dự Kiến</th>
                            <th className="px-3 py-2">ĐV Vận Chuyển</th>
                            <th className="px-3 py-2">Trạng thái</th>
                            <th className="px-3 py-2 text-right">Tác động đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deliveries.map((d) => {
                            return (
                              <tr key={d.id || d.deliveryId} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-mono font-bold text-slate-900">{d.soPhieuXuat || d.deliveryId}</td>
                                <td className="px-3 py-2 text-slate-600">{formatDate(d.ngayGiaoMay)}</td>
                                <td className="px-3 py-2 text-slate-700">{d.donViVanChuyen || '---'}</td>
                                <td className="px-3 py-2">
                                  <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                    {d.tinhTrangGiaoHang || 'CHO_GIAO'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {syncScope.syncDeliveries ? (
                                    <span className="text-emerald-700 text-3xs font-bold inline-flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Cập nhật địa chỉ & SĐT mới
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-3xs">Bảo toàn snapshot</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Note & Policy Info Banner */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-2xs text-blue-900">
              <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Chính sách Đồng bộ Dữ liệu Toàn vẹn (SGM Data Integrity Standard):</span>
                <p className="text-blue-800 leading-relaxed">
                  Lựa chọn <strong>&ldquo;1-Click Đồng bộ an toàn&rdquo;</strong> sẽ cập nhật hồ sơ khách hàng đồng thời tự động đồng bộ hóa thông tin mới (Tên, SĐT, Địa chỉ, Đầu mối, MST) vào toàn bộ Báo giá, Hợp đồng, Phiếu thu và Phiếu giao hàng liên quan theo các phân hệ đã chọn.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action Controls */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              disabled={isSyncing}
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border-none w-full sm:w-auto"
            >
              Quay lại chỉnh sửa
            </Button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isSyncing}
                onClick={onConfirmSaveMasterOnly}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors shadow-xs"
              >
                Chỉ lưu Khách Hàng (Giữ nguyên chứng từ cũ)
              </Button>

              <Button
                type="button"
                disabled={isSyncing}
                onClick={() => onConfirmSafeSync(syncScope)}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2 border-none"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang đồng bộ...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} />
                    <span>1-Click Đồng bộ an toàn (Khuyên dùng)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
