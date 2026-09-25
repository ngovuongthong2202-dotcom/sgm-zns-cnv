import React from 'react';
import useSWR from 'swr';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { ExternalLink, User, FileText, Handshake, CreditCard, Package } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Button } from '../design-system';
import type { Customer } from '@/src/domain/schema/customer.schema';
import type { Quotation } from '@/src/domain/schema/quotation.schema';
import type { Contract } from '@/src/domain/schema/contract.schema';
import type { Payment } from '@/src/domain/schema/payment.schema';
import type { Delivery } from '@/src/domain/schema/delivery.schema';

interface EntityLinksProps {
  entityId: string;
  entityType: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery' | string;
}

export function EntityLinks({ entityId, entityType }: EntityLinksProps) {
  const { openDrawer } = useDrawerStack();

  const getCollectionName = (type: string) => type === 'delivery' ? 'deliveries' : `${type}s`;

  // Load the current entity if it has parent pointers
  const { data: mainEntity, isLoading: isMainLoading } = useSWR<any>(
    entityId && entityType !== 'customer' ? `${getCollectionName(entityType)}:${entityId}` : null,
    swrDocFetcher
  );

  const customerId = entityType === 'customer' ? entityId : mainEntity?.customerId;
  const contractId = entityType === 'contract' ? entityId : (mainEntity?.contractId || '');
  const paymentId = entityType === 'payment' ? entityId : (mainEntity?.paymentId || '');

  // 1. Parent Customer
  const { data: parentCustomer, isLoading: isCustLoading } = useSWR<Customer | null>(
    customerId && entityType !== 'customer' ? `customers:${customerId}` : null,
    swrDocFetcher as any
  );

  // 3. Parent Contract (Fetch earliest)
  const { data: parentContract, isLoading: isContLoading } = useSWR<Contract | null>(
    contractId && entityType !== 'contract' ? `contracts:${contractId}` : null,
    swrDocFetcher as any
  );

  const quotationId = entityType === 'quotation' ? entityId : (mainEntity?.quotationId || parentContract?.quotationId || '');

  // 2. Parent Quotation
  const { data: parentQuotation, isLoading: isQuoteLoading } = useSWR<Quotation | null>(
    quotationId && entityType !== 'quotation' ? `quotations:${quotationId}` : null,
    swrDocFetcher as any
  );

  // Parent Payment
  const { data: parentPayment, isLoading: _isPaymentLoading } = useSWR<Payment | null>(
    paymentId && entityType !== 'payment' ? `payments:${paymentId}` : null,
    swrDocFetcher as any
  );

  // 4. Sub-Quotations (for customer only)
  const { data: relatedQuotations = [], isLoading: isRelQuotesLoading } = useSWR<Quotation[]>(
    entityType === 'customer' && entityId ? `quotations:500:customerId:${entityId}` : null,
    swrColFetcher
  );

  // 5. Sub-Contracts
  const { data: relatedContracts = [], isLoading: isRelContsLoading } = useSWR<Contract[]>(
    entityType === 'customer' && entityId ? `contracts:500:customerId:${entityId}` :
    entityType === 'quotation' && entityId ? `contracts:500:quotationId:${entityId}` : null,
    swrColFetcher
  );

  // 6. Sub-Payments
  const { data: relatedPayments = [], isLoading: isRelPaysLoading } = useSWR<Payment[]>(
    entityType === 'customer' && entityId ? `payments:500:customerId:${entityId}` :
    contractId ? `payments:500:contractId:${contractId}` : 
    quotationId ? `payments:500:quotationId:${quotationId}` : null,
    swrColFetcher
  );

  // 7. Sub-Deliveries
  const { data: relatedDeliveries = [], isLoading: isRelDelsLoading } = useSWR<Delivery[]>(
    entityType === 'customer' && entityId ? `deliveries:500:customerId:${entityId}` :
    contractId ? `deliveries:500:contractId:${contractId}` : 
    quotationId ? `deliveries:500:quotationId:${quotationId}` : null,
    swrColFetcher
  );

  const isLoading = isMainLoading || isCustLoading || isQuoteLoading || isContLoading || isRelQuotesLoading || isRelContsLoading || isRelPaysLoading || isRelDelsLoading;

  // Build the list of linked documents
  const items: any[] = [];

  // Add parent Customer
  if (parentCustomer) {
    items.push({
      id: parentCustomer.id,
      type: 'customer',
      label: 'Khách hàng liên kết',
      title: parentCustomer.tenKhachHang || '---',
      subtitle: parentCustomer.sdt || '---',
      icon: <User size={14} className="text-blue-600" />,
      tag: 'Khách hàng',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-150',
    });
  }

  // Add parent Quotation
  if (parentQuotation) {
    items.push({
      id: parentQuotation.id,
      type: 'quotation',
      label: 'Báo giá liên kết',
      title: parentQuotation.soPhieuBaoGia || '---',
      subtitle: parentQuotation.tenKhachHang || '---',
      icon: <FileText size={14} className="text-amber-600" />,
      tag: 'Báo giá',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-150',
    });
  }

  // Add parent Contract
  if (parentContract) {
    items.push({
      id: parentContract.id,
      type: 'contract',
      label: 'Hợp đồng liên kết',
      title: parentContract.soHopDong || '---',
      subtitle: `${parentContract.tenKhachHang || '---'} (Tổng: ${new Intl.NumberFormat('vi-VN').format(parentContract.totalAmount || 0)}đ)`,
      icon: <Handshake size={14} className="text-emerald-600" />,
      tag: 'Hợp đồng',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    });
  }

  // Add parent Payment
  if (parentPayment) {
    items.push({
      id: parentPayment.id,
      type: 'payment',
      label: 'Phiếu thu liên kết gốc',
      title: parentPayment.paymentId || '---',
      subtitle: `Thanh toán số tiền ${new Intl.NumberFormat('vi-VN').format(parentPayment.totalAmount || 0)}đ`,
      icon: <CreditCard size={14} className="text-cyan-600" />,
      tag: 'Thanh toán',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-150',
    });
  }

  // Add related Quotations
  relatedQuotations.forEach((q) => {
    items.push({
      id: q.id,
      type: 'quotation',
      label: 'Báo giá liên quan',
      title: q.soPhieuBaoGia || '---',
      subtitle: `Báo giá ngày ${formatDate(q.ngayBaoGia)}`,
      icon: <FileText size={14} className="text-amber-600" />,
      tag: 'Báo giá',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-150',
    });
  });

  // Add related Contracts
  relatedContracts.forEach((c) => {
    if (c.id === contractId) return; // avoid duplicating parent
    items.push({
      id: c.id,
      type: 'contract',
      label: 'Hợp đồng liên quan',
      title: c.soHopDong || '---',
      subtitle: `Hợp đồng giá trị ${new Intl.NumberFormat('vi-VN').format(c.totalAmount || 0)}đ`,
      icon: <Handshake size={14} className="text-emerald-600" />,
      tag: 'Hợp đồng',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    });
  });

  // Add related Payments
  relatedPayments.forEach((p) => {
    if (p.id === entityId) return; // avoid duplicating currently opened payment
    items.push({
      id: p.id,
      type: 'payment',
      label: 'Thanh toán liên kết',
      title: p.paymentId || '---',
      subtitle: `Thanh toán số tiền ${new Intl.NumberFormat('vi-VN').format(p.totalAmount || 0)}đ`,
      icon: <CreditCard size={14} className="text-cyan-600" />,
      tag: 'Thanh toán',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-150',
    });
  });

  // Add related Deliveries
  relatedDeliveries.forEach((d) => {
    if (d.id === entityId) return; // avoid duplicating currently opened delivery
    items.push({
      id: d.id,
      type: 'delivery',
      label: 'Phiếu giao hàng liên hệ',
      title: d.soPhieuXuat || d.deliveryId || '---',
      subtitle: `Giao hàng thông qua đơn vị: ${d.donViVanChuyen || '---'}`,
      icon: <Package size={14} className="text-orange-600" />,
      tag: 'Giao hàng',
      tagColor: 'bg-orange-50 text-orange-700 border-orange-150',
    });
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 animate-pulse bg-white border border-slate-200 rounded-xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="h-4 bg-slate-200/80 rounded w-1/4"></div>
              <div className="h-3 bg-slate-150/80 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-xs bg-slate-50 text-slate-500 rounded-xl border border-dashed border-slate-200">
        Không có bất kỳ thực thể hoặc chứng từ liên kết nào.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pl-1">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách Thực thể & Chứng từ liên kết chéo
          </h4>
          <p className="text-2xs text-slate-500 mt-0.5">Truy vết dòng chảy chứng từ quản trị tự động trong SGM OS.</p>
        </div>
        <span className="text-2xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold">
          Tổng số: {items.length} liên kết
        </span>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden select-none">
        <table className="w-full text-left text-xs table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-2xs">
            <tr>
              <th className="px-4 py-3 w-1/4">Phân loại liên kết</th>
              <th className="px-4 py-3 w-1/4">Mã chứng từ / Tên</th>
              <th className="px-4 py-3 w-2/5">Thông tin đối soát</th>
              <th className="px-4 py-3 text-right w-[60px] pr-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={`${item.id}-${index}`} className="hover:bg-slate-50/50 transition-colors font-semibold text-slate-700">
                <td className="px-4 py-3 truncate">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-2xs font-bold ${item.tagColor}`}>
                    {item.icon}
                    {item.tag}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-slate-900 block truncate" title={item.title}>{item.title}</span>
                  <span className="text-2xs text-slate-500 block font-normal truncate mt-0.5">{item.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={item.subtitle}>
                  {item.subtitle}
                </td>
                <td className="px-4 py-3 text-right pr-5">
                  <Button
                    variant="ghost"
                    onClick={() => openDrawer(item.type, item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors shrink-0"
                    title="Mở chi tiết liên kết"
                    aria-label="Mở chi tiết liên kết"
                  >
                    <ExternalLink size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
