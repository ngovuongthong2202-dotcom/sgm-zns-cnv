import { ColumnDef } from '@tanstack/react-table';
import { Customer } from '@/src/domain/schema/customer.schema';
import React from 'react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { isZnsSuccessStatus } from '@/src/domain/zns-client';
import { CustomerHoverCard } from './components/CustomerHoverCard';
import { Button } from '@/src/design-system/Button';
import { normalizeBusinessName, normalizeCode } from '@/src/shared/utils/textFormatter';

import { formatDate } from '@/src/shared/utils/formatDate';
import { createSttColumn } from '@/src/shared/utils/enrichWithStt';
import { PicCell } from '@/src/design-system/dataview/cells/PicCell';
import { extractVietnamesePhones } from './utils/vietnameseTelecomExtractor';

export const getCustomerColumns = (
  quotationCountMap: Map<string, Set<string>>,
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
    cell: (info) => {
      const val = info.getValue();
      const codeStr = (val && String(val) !== 'undefined' && String(val) !== 'null' && String(val).trim() !== '') 
        ? normalizeCode(String(val)) 
        : '---';
      return (
        <div className="w-full min-w-0 flex items-center">
          <span className="truncate block font-mono text-xs text-slate-600 font-medium" title={codeStr}>
            {codeStr}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'ngayTao',
    id: 'ngayTao',
    header: 'Ngày tạo',
    size: 105,
    cell: (info) => {
      const row = info.row.original;
      const dateVal = row.ngayTao || (row as any).createdAt || (row as any).created_at || (row as any).updated_at || (row as any).ngayCapNhat || '';
      return (
        <div className="w-full min-w-0 flex items-center">
          <span className="truncate block text-slate-600 font-medium text-xs font-mono" title={String(dateVal)}>
            {formatDate(dateVal) || '---'}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'tenKhachHang',
    header: 'Khách hàng',
    size: 300,
    cell: (info) => {
      const c = info.row.original;
      const active = c.id && presenceMap?.[c.id] ? presenceMap[c.id] : [];
      const normalizedName = normalizeBusinessName(c.tenKhachHang);
      const isIndiv = c.loaiKh === 'Cá nhân' || c.loaiHinhDoanhNghiep === 'CÁ NHÂN';
      
      // Sub-info: ưu tiên hiển thị Tên ZNS hoặc Tên Thương Mại gọn, tuyệt đối không lặp lại loại hình doanh nghiệp vì đã có cột Phân loại
      let subInfo = '';
      if (!isIndiv) {
        if (c.tenZns && c.tenZns !== normalizedName) {
          subInfo = `ZNS: ${c.tenZns}`;
        } else if (c.tenThuongMai && c.tenThuongMai !== normalizedName) {
          subInfo = `TM: ${c.tenThuongMai}`;
        }
      }
      return (
        <CustomerHoverCard customer={c}>
          <div className="w-full min-w-0 flex flex-col justify-center gap-0.5 pointer-events-auto py-1">
            <div className="flex items-start gap-1.5 w-full min-w-0">
              <span className="whitespace-normal break-words line-clamp-3 font-semibold text-slate-900 text-xs leading-snug flex-1" title={normalizedName}>
                {normalizedName}
              </span>
              {active.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-2xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 mt-0.5" title={active.map(u => u.displayName).join(', ')}>
                  👤 {active.length}
                </span>
              )}
            </div>
            {subInfo && (
              <span className="whitespace-normal break-words font-normal text-2xs text-slate-500 leading-tight" title={subInfo}>
                {subInfo}
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
            {c.diaChi && <span className="whitespace-normal break-words line-clamp-2 text-2xs text-slate-500" title={c.diaChi}>{c.diaChi}</span>}
          </div>
        );
      }

      return (
        <div className="w-full min-w-0 flex flex-col justify-center gap-1.5 py-1">
          {displayContacts.map((ct: any, idx: number) => {
            const rawPhones: string[] = [];
            if (ct.soZaloMacDinh) rawPhones.push(String(ct.soZaloMacDinh));
            if (ct.sdt) rawPhones.push(String(ct.sdt));
            if (ct.sdtPhu) rawPhones.push(String(ct.sdtPhu));
            if (Array.isArray(ct.danhSachSdt)) {
              ct.danhSachSdt.forEach((s: any) => { if (s) rawPhones.push(String(s)); });
            }
            const phoneStr = rawPhones.length > 0 ? rawPhones.join(' / ') : (ct.sdt || '');
            const telecom = phoneStr ? extractVietnamesePhones(phoneStr, c.diaChi) : null;
            
            // Deduplicate mobile phones by cleaned number
            const uniqueMobilePhones: any[] = [];
            const seenCleaned = new Set<string>();
            if (telecom?.mobilePhones) {
              for (const mob of telecom.mobilePhones) {
                if (!seenCleaned.has(mob.cleaned)) {
                  seenCleaned.add(mob.cleaned);
                  uniqueMobilePhones.push(mob);
                }
              }
            }

            const hasMobile = uniqueMobilePhones.length > 0;
            const contactLevelSent = isZnsSuccessStatus(ct.trangThaiZns) || Boolean(ct.ngayGuiZns);
            let anyPhoneHasBadge = false;

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
                {hasMobile ? (
                  // Có số di động: Render từng Badge di động riêng biệt, kèm huy hiệu ✓ ZNS cho số nào đã gửi
                  uniqueMobilePhones.map((p, pIdx) => {
                    const phoneHistEntry = (c as any)?.contactsZnsHistory?.[p.cleaned] || (c as any)?.contactsZnsHistory?.[p.raw];
                    const isPhoneSent = Boolean(
                      phoneHistEntry && 
                      isZnsSuccessStatus(typeof phoneHistEntry === 'object' ? phoneHistEntry?.status : phoneHistEntry)
                    );
                    const showBadgeOnPhone = isPhoneSent || (contactLevelSent && uniqueMobilePhones.length === 1);
                    if (showBadgeOnPhone) anyPhoneHasBadge = true;

                    return (
                      <span key={pIdx} className="inline-flex items-center gap-1">
                        <span 
                          className="font-mono text-2xs text-blue-700 bg-blue-50/90 hover:bg-blue-100 transition-colors px-1.5 py-0.5 rounded border border-blue-200 font-medium cursor-default shadow-2xs"
                          title={`${p.formatted} • ${p.carrier || 'Di động'} (Zalo/ZNS OK)`}
                        >
                          {p.formatted}
                        </span>
                        {showBadgeOnPhone && (
                          <span className="text-3xs text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-medium shrink-0" title="Đã gửi ZNS">
                            ✓ ZNS
                          </span>
                        )}
                      </span>
                    );
                  })
                ) : telecom && telecom.landlinePhones.length > 0 ? (
                  // Chỉ có số máy bàn: Render chip xám tinh tế cảnh báo không ZNS
                  telecom.landlinePhones.map((p, pIdx) => (
                    <span 
                      key={pIdx} 
                      className="font-mono text-3xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium cursor-default"
                      title={`${p.formatted} • Máy bàn cố định (Không hỗ trợ ZNS)`}
                    >
                      ☎️ {p.formatted}
                    </span>
                  ))
                ) : ct.sdt ? (
                  <span className="font-mono text-2xs text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                    {ct.sdt}
                  </span>
                ) : null}
                {/* Fallback hiển thị ✓ ZNS ở cấp đầu mối nếu không có mobile breakdown nhưng đã gửi thành công */}
                {contactLevelSent && !anyPhoneHasBadge && (
                  <span className="text-3xs text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-medium" title="Đã gửi ZNS">
                    ✓ ZNS
                  </span>
                )}
              </div>
            );
          })}
          {c.diaChi && (
            <span className="whitespace-normal break-words line-clamp-2 font-normal text-2xs text-slate-500 leading-tight mt-0.5" title={c.diaChi}>
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
    size: 170,
    cell: (info) => {
      const c = info.row.original;
      const isIndiv = c.loaiKh === 'Cá nhân' || c.loaiHinhDoanhNghiep === 'CÁ NHÂN';
      return (
        <div className="w-full min-w-0 flex flex-col justify-center gap-1 py-0.5">
          <span className="whitespace-normal break-words font-medium text-xs text-slate-800 leading-tight" title={c.tinhThanh}>
            {c.tinhThanh || '—'}
          </span>
          <div>
            {isIndiv ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                👤 Cá nhân
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200" title={c.loaiHinhDoanhNghiep || 'Doanh nghiệp'}>
                🏢 {c.loaiHinhDoanhNghiep && c.loaiHinhDoanhNghiep !== 'DOANH NGHIỆP' ? c.loaiHinhDoanhNghiep : 'Doanh nghiệp'}
              </span>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'nguoiPhuTrach',
    header: 'Người phụ trách',
    size: 150,
    cell: (info) => (
      <PicCell 
        fullName={info.getValue() as string} 
        onClick={onEditCustomer ? () => onEditCustomer(info.row.original) : undefined}
        emptyLabel="Chưa phân công"
      />
    )
  },
  {
    id: 'trangThaiGuiTinQuangCao',
    accessorFn: (row) => normalizeLegacyStatus(row.trangThaiGuiTinQuangCao),
    header: 'ZNS Quảng cáo',
    size: 140,
    cell: (info) => {
      const c = info.row.original;
      const status = info.getValue();
      return (
         <div 
           className="w-full min-w-0 flex items-center cursor-pointer hover:opacity-80 transition-opacity" 
           onClick={(e) => {
             e.stopPropagation();
             if (onSendZns) onSendZns(c);
           }}
           title="Bấm để mở xem trước & gửi ZNS giới thiệu giải pháp (#533060)"
         >
           <StatusPill statusStr={status as any} />
         </div>
      );
    }
  },
  {
    id: 'soBaoGia',
    accessorFn: (row) => {
      // Set-based dedup: mỗi quotation chỉ đếm 1 lần dù match trên id, maKh, sdt, MST hay tên KH
      const seen = new Set<string>();
      if (row.id) quotationCountMap.get(row.id)?.forEach(qId => seen.add(qId));
      if (row.maKh) {
        quotationCountMap.get(row.maKh)?.forEach(qId => seen.add(qId));
        quotationCountMap.get(row.maKh.toLowerCase())?.forEach(qId => seen.add(qId));
      }
      if (row.sdt) {
        quotationCountMap.get(row.sdt)?.forEach(qId => seen.add(qId));
        const digits = row.sdt.replace(/\D/g, '');
        if (digits) quotationCountMap.get(digits)?.forEach(qId => seen.add(qId));
        const ext = extractVietnamesePhones(row.sdt);
        ext.phones.forEach(p => quotationCountMap.get(p.cleaned)?.forEach(qId => seen.add(qId)));
      }
      if (row.maSoThue) {
        const cleanTax = row.maSoThue.trim().replace(/[\s\-_]/g, '');
        if (cleanTax) quotationCountMap.get(cleanTax)?.forEach(qId => seen.add(qId));
      }
      if (Array.isArray(row.contacts)) {
        for (const ct of row.contacts) {
          if (ct?.sdt) {
            const ext = extractVietnamesePhones(ct.sdt);
            ext.phones.forEach(p => quotationCountMap.get(p.cleaned)?.forEach(qId => seen.add(qId)));
          }
        }
      }
      if (row.tenKhachHang) {
        quotationCountMap.get(row.tenKhachHang.toLowerCase().trim())?.forEach(qId => seen.add(qId));
      }
      return seen.size;
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
