import { Customer } from '@/src/domain/schema/customer.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
/* eslint-disable max-lines */
import { formatDate } from '@/src/shared/utils/formatDate';
import React, { useState, useRef, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Payment } from '@/src/domain/schema/payment.schema';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { PaymentHoverCard } from './components/PaymentHoverCard';
import { normalizeBusinessName, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';
import { resolvePaymentLoai } from '../domain/resolvePaymentLoai';
import { createSttColumn } from '@/src/shared/utils/enrichWithStt';
import { PicCell } from '@/src/design-system/dataview/cells/PicCell';

function QuickEditAmount({ value, onSave }: { value: number, onSave: (v: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value || 0));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      setTempVal(value ? new Intl.NumberFormat('vi-VN').format(value) : '');
    }
  }, [isEditing, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setTempVal(rawValue ? new Intl.NumberFormat('vi-VN').format(Number(rawValue)) : '');
  };

  const handleSave = () => {
    const num = Number(tempVal.replace(/\D/g, ''));
    onSave(num);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end w-full" onClick={(e) => e.stopPropagation()}>
        <input 
          ref={inputRef}
          type="text" 
          aria-label="Số tiền"
          value={tempVal}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setIsEditing(false);
              setTempVal(String(value || 0));
            }
          }}
          onBlur={handleSave}
          className="w-full min-w-[80px] max-w-[120px] text-right px-2 py-1 text-sm font-mono font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-500 rounded outline-none"
        />
      </div>
    );
  }

  return (
    <div 
       className="font-mono font-bold text-emerald-700 text-right w-full min-w-[80px] hover:bg-emerald-50 px-2 py-1 rounded cursor-pointer border border-transparent hover:border-emerald-200 transition-colors tabular-nums"
       onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
       title="Nhấp để sửa số tiền"
    >
      {new Intl.NumberFormat('vi-VN').format(value || 0)} <span className="text-2xs text-slate-600 font-sans">₫</span>
    </div>
  );
}

export const getPaymentColumns = (
  onEditStatus: (payment: Payment, status: string) => void,
  onQuickUpdate?: (payment: Payment, field: string, value: any) => void,
  confirm?: (opts: any) => Promise<boolean>,
  onSendZns?: (payment: Payment) => void,
  contracts: Contract[] = [],
  quotations: Quotation[] = [],
  deliveries: Delivery[] = [],
  customers: Customer[] = []
): ColumnDef<any>[] => [
  createSttColumn<any>(),
  {
    accessorKey: 'paymentId',
    id: 'paymentId',
    header: 'Mã PT',
    size: 130,
    cell: (info) => (
      <div className="flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div className="font-mono font-bold text-slate-800 tracking-tight">{String(info.getValue() || 'N/A')}</div>
      </div>
    ),
    meta: {
      isSticky: true,
    }
  },
  {
    accessorKey: 'soHopDong',
    id: 'soHopDong',
    header: 'Hợp đồng / Đơn hàng',
    size: 160,
    cell: (info) => {
      const p = info.row.original as Payment;
      const hd = p.soHopDong || '';
      const order = p.soDonHang || '';
      const fallback = p.contractId || '';
      
      let displayNode;
      if (hd && order) {
         displayNode = (
           <div className="flex flex-col gap-0.5" title={`${hd} | ${order}`}>
              <span className="font-semibold text-blue-600 hover:text-blue-700 tracking-tight text-xs transition-colors">{hd.startsWith('HĐ') ? hd : `HĐ: ${hd}`}</span>
              <span className="font-mono text-slate-500 font-medium text-2xs uppercase">{order.replace(/^ĐH/, '')}</span>
           </div>
         );
      } else if (hd) {
         displayNode = <span className="font-semibold text-blue-600 hover:text-blue-700 tracking-tight text-xs transition-colors">{hd.startsWith('HĐ') ? hd : `HĐ: ${hd}`}</span>;
      } else if (order) {
         displayNode = <span className="font-semibold text-blue-600 hover:text-blue-700 tracking-tight text-xs transition-colors">{order}</span>;
      } else if (fallback) {
         displayNode = <span className="font-mono text-slate-400 font-medium text-xs">{fallback}</span>;
      } else {
         displayNode = <span className="text-slate-400 text-2xs italic">Chưa gắn</span>;
      }

      return (
        <PaymentHoverCard payment={p} contracts={contracts} quotations={quotations} deliveries={deliveries}>
            {displayNode}
        </PaymentHoverCard>
      );
    }
  },
  {
    id: 'customerId',
    accessorFn: (row) => row.tenKhachHang || row.customerId,
    header: 'Khách hàng',
    size: 200,
    cell: (info) => {
      const p = info.row.original as Payment;
      const contactsToDisplay: { name: string; phone: string }[] = [];
      const cName = normalizeBusinessName(String(info.getValue() || p.tenKhachHang || 'Chưa rõ'));
      
      if (customers.length > 0 && p.customerId) {
        const customer = customers.find(c => c.id === p.customerId);
        if (customer) {
           if (customer.nguoiDaiDien || customer.sdt) {
             contactsToDisplay.push({ name: normalizePersonName(customer.nguoiDaiDien || 'Không tên'), phone: customer.sdt || '' });
           }
           if (Array.isArray(customer.contacts)) {
             customer.contacts.forEach((contact) => {
               if (contact.nguoiDaiDien || contact.sdt) {
                 contactsToDisplay.push({ name: normalizePersonName(contact.nguoiDaiDien || 'Không tên'), phone: contact.sdt || '' });
               }
             });
           }
        }
      } else {
         if (p.tenNguoiNop || p.sdt) {
            contactsToDisplay.push({ name: p.tenNguoiNop || 'Không tên', phone: p.sdt || '' });
         }
      }

      // Deduplicate contacts
      const uniqueContacts = Array.from(new Map(contactsToDisplay.map(item => [`${item.name}-${item.phone}`, item])).values());

      return (
        <div className="flex flex-col gap-0.5" title={cName}>
          <span className="font-semibold text-slate-900 tracking-tight line-clamp-1">{cName}</span>
          {uniqueContacts.map((contact, idx) => (
             <span key={idx} className="text-2xs text-slate-500 line-clamp-1">
               {contact.name} {contact.phone ? `- ${contact.phone}` : ''}
             </span>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: 'tinhThanh',
    id: 'tinhThanh',
    header: 'Tỉnh/Thành',
    size: 140,
    cell: (info) => {
      const p = info.row.original as Payment;
      let tinhThanh = '';
      if (customers.length > 0 && p.customerId) {
         const customer = customers.find(c => c.id === p.customerId);
         if (customer && customer.tinhThanh) {
            tinhThanh = customer.tinhThanh;
         }
      }
      return <span className="text-xs font-medium text-slate-700">{tinhThanh || '---'}</span>;
    }
  },
  {
    accessorKey: 'phanLoai',
    id: 'phanLoai',
    header: 'Phân loại',
    size: 110,
    meta: {
      label: 'Phân loại',
      filterable: true,
      groupable: true,
      options: [QUOTATION_LOAI.MAY, QUOTATION_LOAI.VAT_TU, QUOTATION_LOAI.DICH_VU]
    },
    cell: (info) => {
      const p = info.row.original as Payment;
      const typeStr = resolvePaymentLoai(p);

      let bg = 'bg-slate-100 text-slate-700';
      if (typeStr === QUOTATION_LOAI.MAY) bg = 'bg-blue-50 text-blue-700 border border-blue-200';
      else if (typeStr === QUOTATION_LOAI.VAT_TU) bg = 'bg-orange-50 text-orange-700 border border-orange-200';
      else if (typeStr === QUOTATION_LOAI.DICH_VU) bg = 'bg-cyan-50 text-cyan-700 border border-cyan-200';

      return (
        <span className={`px-2 py-0.5 rounded text-2xs font-bold tracking-wider inline-block ${bg}`}>
          {typeStr}
        </span>
      );
    }
  },
  {
    accessorKey: 'ngayThanhToan',
    id: 'ngayThanhToan',
    header: 'Ngày TT',
    size: 110,
    cell: (info) => {
      const p = info.row.original as Payment;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-slate-800 font-semibold">{formatDate(p.ngayThanhToan || '')}</span>
          {p.ngayDenHan && (
            <span className="text-2xs text-amber-700 font-mono font-medium" title="Hạn chót thu tiền">
              EXP: {formatDate(p.ngayDenHan)}
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'ngayDenHan',
    id: 'ngayDenHan',
    header: 'Hạn chót thu tiền',
    enableHiding: true,
  },
  {
    accessorKey: 'tinhTrangThanhToan',
    id: 'tinhTrangThanhToan',
    header: 'Tình trạng',
    size: 130,
    cell: (info) => {
      const val = String(info.getValue() || 'Chưa TT');
      let badgeColor = 'bg-slate-50 text-slate-800 border border-slate-200';
      if (val === 'Tất toán' || val === 'ĐÃ THANH TOÁN') {
        badgeColor = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      } else if (val === 'Công nợ') {
        badgeColor = 'bg-amber-50 text-amber-800 border border-amber-200';
      } else if (val === 'Chưa TT') {
        badgeColor = 'bg-red-50 text-red-800 border border-red-200';
      } else if (val === 'Miễn phí') {
        badgeColor = 'bg-slate-100 text-slate-700 border border-slate-200';
      }
      return (
        <span className={`px-2 py-0.5 rounded-md text-2xs font-bold tracking-tight uppercase leading-none inline-flex items-center ${badgeColor}`}>
          {val}
        </span>
      );
    }
  },
  {
    accessorKey: 'phuongThucThanhToan',
    id: 'phuongThucThanhToan',
    header: 'Phương thức',
    size: 130,
    cell: (info) => {
      const val = String(info.getValue() || 'Chuyển khoản');
      return (
        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block max-w-fit text-xs border border-slate-200">{val}</span>
      );
    }
  },
  {
    id: 'workflow',
    header: 'Tiến độ',
    meta: { label: 'Tiến độ' },
    size: 200,
    cell: (info) => {
      const p = info.row.original as Payment;
      
 
      const isFree = ['Miễn phí', 'Miễn Phí'].includes(p.tinhTrangThanhToan || '');
// eslint-disable-next-line unused-imports/no-unused-vars -- temporarily disabled
      const isPaid = ['Tất toán', 'ĐÃ THANH TOÁN'].includes(p.tinhTrangThanhToan || '');
      const isPartial = ['Công nợ'].includes(p.tinhTrangThanhToan || '');

      const paidAmt = p.soTien || 0;
      const totalAmt = p.totalAmount || p.giaTriHopDong || 0;
      let pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : paidAmt > 0 ? 100 : 0;
      if (pct > 100) pct = 100;

      // Delivery info
      const relatedDeliveries = deliveries.filter(d => {
         if (p.contractId && d.contractId === p.contractId) return true;
         if (p.quotationId && d.quotationId === p.quotationId) return true;
         return false;
      });
      
      const isDelivered = relatedDeliveries.some(d => d.tinhTrangGiaoHang === 'Đã Giao' || !!d.ngayGiaoThucTe);
      const hasDeliveries = relatedDeliveries.length > 0;
      
      const inlineDeliveryNode = hasDeliveries ? (
         <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
            {isDelivered ? (
               <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span className="text-3xs uppercase font-bold text-emerald-600 tracking-wider" title="Đã giao hàng">Đã giao</span>
               </>
            ) : (
               <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                  <span className="text-3xs uppercase font-bold text-amber-600 tracking-wider" title="Chờ giao hàng">Chờ giao</span>
               </>
            )}
         </div>
      ) : null;

      if (isFree) {
        return (
          <div className="w-full flex items-center min-w-0">
             <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center">
                     <span className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Miễn phí</span>
                     {inlineDeliveryNode}
                   </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-full rounded-full" />
                </div>
             </div>
          </div>
        );
      }

      if (pct === 100) {
        return (
          <div className="w-full flex items-center min-w-0">
             <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center">
                     <span className="text-2xs font-bold text-emerald-600 uppercase tracking-wide">{paidAmt >= totalAmt && totalAmt > 0 ? 'Thu đủ' : 'Tất toán'}</span>
                     {inlineDeliveryNode}
                   </div>
                   <span className="text-2xs font-bold font-mono text-emerald-700">100%</span>
                </div>
                <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full" />
                </div>
             </div>
          </div>
        );
      }

      if (pct > 0) {
        return (
          <div className="w-full flex items-center min-w-0">
             <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center">
                     <span className="text-2xs font-bold uppercase tracking-wide text-amber-600">Thu 1 phần</span>
                     {inlineDeliveryNode}
                   </div>
                   <span className="text-2xs font-bold font-mono text-amber-700">{Math.round(pct)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-amber-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
             </div>
          </div>
        );
      }

      return (
        <div className="w-full flex items-center min-w-0">
           <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-1">
                 <div className="flex items-center">
                    <span className="text-2xs font-bold uppercase tracking-wide text-blue-600">Chưa thu (0%)</span>
                    {inlineDeliveryNode}
                 </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-0 rounded-full" />
              </div>
           </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'soTien',
    header: 'Số tiền',
    size: 140,
    meta: { align: 'right' },
    aggregationFn: 'sum',
    cell: (info) => {
      const p = info.row.original;
      const soTien = p.soTien || 0;
      const totalAmount = p.totalAmount || p.giaTriHopDong || p.subTotal || 0;
      
      return (
        <div className="flex flex-col items-end w-full" onClick={(e) => e.stopPropagation()}>
           <QuickEditAmount 
             value={soTien} 
             onSave={(val) => {
                if (onQuickUpdate) onQuickUpdate(p, 'soTien', val);
             }} 
           />
           {totalAmount > 0 && totalAmount !== soTien && (
              <div className="text-2xs text-slate-500 font-medium mt-0.5 font-mono" title={`Tổng: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}`}>
                 / {new Intl.NumberFormat('vi-VN').format(totalAmount)}
              </div>
           )}
        </div>
      );
    }
  },

  {
    accessorKey: 'nguoiPhuTrach',
    header: 'Người Phụ Trách',
    size: 150,
    cell: (info) => (
      <PicCell fullName={info.getValue() as string} />
    )
  },
  {
    accessorFn: (row) => normalizeLegacyStatus(row.trangThaiGuiTinThanhToan),
    id: 'trangThaiGuiTinThanhToan',
    header: 'Trạng thái ZNS',
    size: 130,
    cell: (info) => {
       const status = info.getValue() as EntityZnsStatus;
       return (
         <div onClick={(e) => e.stopPropagation()}>
           <StatusPill statusStr={status as string} />
         </div>
       );
    }
  }
];
