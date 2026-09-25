import { ColumnDef } from '@tanstack/react-table';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import React from 'react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { CustomerHoverCard } from './components/CustomerHoverCard';
import { Button } from '@/src/design-system/Button';
import { normalizeBusinessName, normalizePersonName, normalizeCode } from '@/src/shared/utils/textFormatter';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { Printer } from 'lucide-react';

import { createSttColumn } from '@/src/shared/utils/enrichWithStt';

export const getCustomerColumns = (
  quotations: Quotation[] = [],
  onEditCustomer?: (customer: Customer) => void,
  onDeleteCustomer?: (customer: Customer) => void,
  onSendZns?: (customer: Customer) => void,
  presenceMap?: Record<string, any[]>,
  sendingZnsIds?: Record<string, boolean>,
  onSelectQuotationTab?: (customer: Customer) => void,
  onPrintReport?: (customer: Customer) => void,
): ColumnDef<Customer>[] => [
  createSttColumn<Customer>(),
  {
    accessorKey: 'maKh',
    header: 'Mã KH',
    size: 100,
    cell: (info) => (
      <div className="w-full min-w-0 flex items-center">
        <span className="truncate block font-mono text-xs text-slate-600 font-medium" title={String(info.getValue())}>
          {normalizeCode(String(info.getValue()))}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'ngayTao',
    id: 'ngayTao',
    header: 'Ngày tạo',
    size: 100,
    cell: (info) => {
      const row = info.row.original;
      const dateVal = row.ngayTao || '';
      return (
        <div className="w-full min-w-0 flex items-center">
          <span className="truncate block text-slate-600 font-medium text-xs" title={String(dateVal)}>
            {dateVal ? new Date(String(dateVal)).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'tenKhachHang',
    header: 'Khách hàng',
    size: 260,
    cell: (info) => {
      const c = info.row.original;
      const active = c.id && presenceMap?.[c.id] ? presenceMap[c.id] : [];
      const normalizedName = normalizeBusinessName(c.tenKhachHang);
      return (
        <CustomerHoverCard customer={c}>
          <div className="w-full min-w-0 flex flex-col justify-center gap-0.5 pointer-events-auto">
            <div className="flex items-center gap-1.5 w-full min-w-0">
              <span className="truncate block font-medium text-slate-900 text-xs leading-tight" title={normalizedName}>
                {normalizedName}
              </span>
              {active.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-2xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0" title={active.map(u => u.displayName).join(', ')}>
                  👤 {active.length}
                </span>
              )}
            </div>
            {c.nguoiDaiDien && (
              <span className="truncate block font-normal text-xs text-slate-500 leading-tight" title={normalizePersonName(c.nguoiDaiDien)}>
                {normalizePersonName(c.nguoiDaiDien)}
              </span>
            )}
          </div>
        </CustomerHoverCard>
      );
    }
  },
  {
    id: 'lienHe',
    accessorFn: (row) => {
      const contactsStr = (row.contacts || []).map(ct => `${ct.nguoiDaiDien || ''} ${ct.sdt || ''} ${ct.chucVu || ''}`).join(' ');
      return `${row.sdt || ''} ${row.nguoiDaiDien || ''} ${contactsStr} ${row.diaChi || ''}`;
    },
    header: 'Đầu mối liên hệ & SĐT',
    size: 260,
    cell: (info) => {
      const c = info.row.original;
      const contacts = (Array.isArray(c.contacts) && c.contacts.length > 0)
        ? c.contacts.filter(ct => ct && (ct.nguoiDaiDien || ct.sdt))
        : [];

      // Fallback to primary customer fields if no array contacts
      const displayContacts = contacts.length > 0
        ? contacts
        : (c.nguoiDaiDien || c.sdt ? [{ nguoiDaiDien: c.nguoiDaiDien || '', sdt: c.sdt || '', chucVu: '', chiNhanh: c.chiNhanh || '', trangThaiZns: c.trangThaiGuiTinQuangCao || undefined, ngayGuiZns: undefined }] : []);

      if (displayContacts.length === 0) {
        return (
          <div className="w-full min-w-0 flex flex-col justify-center gap-0.5">
            <span className="text-xs text-slate-400 italic">Chưa có đầu mối</span>
            {c.diaChi && <span className="truncate block text-2xs text-slate-500" title={c.diaChi}>{c.diaChi}</span>}
          </div>
        );
      }

      return (
        <div className="w-full min-w-0 flex flex-col justify-center gap-1.5 py-1">
          {displayContacts.map((ct: any, idx: number) => {
            const hasSentZns = ct.trangThaiZns === 'THANH_CONG' || Boolean(ct.ngayGuiZns) || Boolean((c as any)?.contactsZnsHistory?.[ct.sdt || '']);
            return (
              <div key={idx} className="flex items-center gap-1.5 flex-wrap text-xs leading-tight">
                <span className="font-semibold text-slate-800" title={ct.nguoiDaiDien || `Đầu mối ${idx + 1}`}>
                  {ct.nguoiDaiDien || `Đầu mối ${idx + 1}`}
                </span>
                {ct.chucVu && (
                  <span className="text-3xs bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                    {ct.chucVu}
                  </span>
                )}
                {ct.sdt && (
                  <span className="font-mono text-2xs text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                    {ct.sdt}
                  </span>
                )}
                {hasSentZns && (
                  <span className="text-3xs text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-medium" title="Đã gửi ZNS">
                    ✓ ZNS
                  </span>
                )}
              </div>
            );
          })}
          {c.diaChi && (
            <span className="truncate block font-normal text-2xs text-slate-500 leading-tight mt-0.5" title={c.diaChi}>
              {c.diaChi}
            </span>
          )}
        </div>
      );
    }
  },
  {
    id: 'tinhThanh',
    accessorKey: 'tinhThanh',
    header: 'Tỉnh/Thành',
    size: 110,
    enableHiding: true,
  },
  {
    id: 'loaiKh',
    accessorKey: 'loaiKh',
    header: 'Loại KH',
    size: 110,
    enableHiding: true,
  },
  {
    id: 'khuVuc',
    accessorFn: (row) => `${row.tinhThanh || ''} ${row.loaiKh || ''}`,
    header: 'Khu vực & Phân loại',
    size: 160,
    cell: (info) => {
      const c = info.row.original;
      return (
        <div className="w-full min-w-0 flex flex-col justify-center gap-0.5">
          <span className="truncate block font-medium text-xs text-slate-700 leading-tight" title={c.tinhThanh}>
            {c.tinhThanh || '—'}
          </span>
          {c.loaiKh && (
            <span className="truncate block font-normal text-xs text-slate-500 leading-tight" title={c.loaiKh}>
              {c.loaiKh}
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'nguoiPhuTrach',
    header: 'Người phụ trách',
    size: 150,
    cell: (info) => {
       const c = info.row.original;
       const v = info.getValue() as string;
       const firstName = v ? v.split(' ').pop() : '';
       return (
         <div className="flex items-center w-full min-w-0 gap-2 group cursor-pointer" onClick={(e) => { e.stopPropagation(); onEditCustomer?.(c); }}>
            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-2xs shrink-0 uppercase tracking-widest">
               {firstName ? firstName.substring(0, 2) : '?'}
            </div>
            <span className="text-xs font-medium border-b border-transparent group-hover:border-blue-500/30 text-slate-700 truncate block" title={v || 'Chạm để phân công'}>{firstName || <span className="text-slate-500 italic font-normal">Chưa phân công</span>}</span>
         </div>
       );
    }
  },
  {
    id: 'trangThaiGuiTinQuangCao',
    accessorFn: (row) => normalizeLegacyStatus(row.trangThaiGuiTinQuangCao),
    header: 'ZNS Quảng cáo',
    size: 140,
    cell: (info) => {
      const status = info.getValue();
      return (
         <div className="w-full min-w-0 flex items-center" onClick={(e) => e.stopPropagation()}>
           <StatusPill statusStr={status as any} />
         </div>
      );
    }
  },
  {
    id: 'soBaoGia',
    accessorFn: (row) => {
      const fromParam = quotations.filter(q => q.customerId === row.id).length;
      if (fromParam > 0) return fromParam;
      return entityCachePool.filter('quotations', (q: any) => q.customerId === row.id).length;
    },
    header: 'Số BG',
    size: 80,
    cell: (info) => {
      const c = info.row.original;
      const val = Number(info.getValue());
      return (
        <div className="w-full min-w-0 flex items-center">
          <Button aria-label="Xem báo giá" 
            className="text-blue-600 hover:underline font-medium text-xs px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onClick={(e) => { 
              e.stopPropagation(); 
              onSelectQuotationTab?.(c); 
            }}
          >
            {val} BG
          </Button>
        </div>
      );
    }
  },
  {
    accessorKey: 'ngayCapNhat',
    header: 'Cập nhật',
    size: 100,
    cell: (info) => (
       <div className="w-full min-w-0 flex items-center">
         <span className="truncate block text-slate-500 font-normal text-xs" title={String(info.getValue())}>
           {info.getValue() ? new Date(String(info.getValue())).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
         </span>
       </div>
    )
  }
];
