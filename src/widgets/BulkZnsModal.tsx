import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PhoneOff, 
  Smartphone, 
  Building2, 
  Pause, 
  Play, 
  StopCircle, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle,
  CheckSquare,
  Square,
  Search,
  Calendar
} from 'lucide-react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { sendZnsMessage } from '@/src/domain/zns';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { nextAttempt, isRecipientZnsAlreadySent, isZnsSuccessStatus } from '@/src/domain/zns-client';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { notify } from '@/src/shared/utils/notify';
import { Button } from '@/src/design-system';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { UpdateCustomer } from '@/src/modules/customers/application/use-cases/UpdateCustomer';
import { quotationRepo } from '@/src/modules/sales/infrastructure/QuotationRepoFirestore';
import { normalizeVietnameseSearch, extractDigits, cleanTaxCode } from '@/src/shared/utils/vietnameseSearchEngine';

export interface BulkZnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'CUSTOMER' | 'QUOTATION';
  items: (Customer | Quotation)[];
  customers?: Customer[];
  userRole?: string;
  onSuccess?: () => void;
  onUpdateCustomer?: (id: string, data: Partial<Customer>) => Promise<any>;
}

export interface TargetRecipient {
  id: string; // unique item key
  entityId: string;
  code: string;
  customerName: string;
  contactName: string;
  roleOrBranch?: string;
  phone: string;
  phoneFormatted: string;
  carrier?: string;
  phoneType: 'MOBILE' | 'LANDLINE' | 'UNKNOWN';
  isLandline: boolean;
  isAlreadySent: boolean;
  rawStatus?: string;
  willSend: boolean;
  skipReason?: string;
  originalEntity: any;
  contactObj?: any;
  // V50 Sovereign Omni-Mesh Enhancements
  amount?: number;
  amountFormatted?: string;
  dateStr?: string;
  isHydratedFromCustomer?: boolean;
  hydratedNote?: string;
  availablePhones?: Array<{ cleaned: string; formatted: string; carrier?: string }>;
  // V60 Apex Multi-Token Search & Card Layout
  customerId?: string;
  diaChi?: string;
  tinhThanh?: string;
  maKh?: string;
  maSoThue?: string;
}

export interface DispatchLogItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  status: 'PENDING' | 'SENDING' | 'QUEUED' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  messageId?: string;
  errorMsg?: string;
  timestamp: string;
}

export function BulkZnsModal({
  isOpen,
  onClose,
  entityType,
  items = [],
  customers = [],
  userRole,
  onSuccess,
  onUpdateCustomer
}: BulkZnsModalProps) {
  // Pre-flight settings
  const [allowResend, setAllowResend] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(5); // 5s, 7s, 10s
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({});
  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});

  // Cockpit filters (v50/v60)
  const [filterTab, setFilterTab] = useState<'ALL' | 'READY' | 'SENT' | 'EXCLUDED' | 'SELECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time message subscription for 100% accurate dispatch history resolution
  const { data: realtimeZnsMessages = [] } = useRealtimeCollection<any>('zns_messages');

  // State machine: PRE_FLIGHT -> DISPATCHING -> COMPLETED
  const [stage, setStage] = useState<'PRE_FLIGHT' | 'DISPATCHING' | 'COMPLETED'>('PRE_FLIGHT');

  // Execution states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [logs, setLogs] = useState<DispatchLogItem[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);

  const pauseRef = useRef(false);
  pauseRef.current = isPaused;

  const abortRef = useRef(false);
  abortRef.current = isAborted;

  // 1. Phân tích đối tượng & Bóc tách danh sách người nhận (Pre-flight Audience Scanner: Dual-Tier Disambiguation)
  const recipients: TargetRecipient[] = useMemo(() => {
    const list: TargetRecipient[] = [];

    if (entityType === 'CUSTOMER') {
      const customers = items as Customer[];
      customers.forEach((c) => {
        if (!c || c.isArchived || (c as any).is_archived) return;

        // Trích xuất các đầu mối từ contacts array và primary fields
        const contactPool: Array<{ 
          name: string; 
          phonesRaw: string[]; 
          role?: string; 
          branch?: string; 
          isPrimaryContact: boolean;
          rawContact?: any 
        }> = [];

        if (Array.isArray(c.contacts) && c.contacts.length > 0) {
          c.contacts.forEach((ct, idx) => {
            if (ct && (ct.sdt || ct.nguoiDaiDien || ct.sdtPhu || ct.soZaloMacDinh || (ct as any).danhSachSdt)) {
              const rawPhones: string[] = [];
              if (ct.soZaloMacDinh) rawPhones.push(String(ct.soZaloMacDinh));
              if (ct.sdt) rawPhones.push(String(ct.sdt));
              if (ct.sdtPhu) rawPhones.push(String(ct.sdtPhu));
              if (Array.isArray((ct as any).danhSachSdt)) {
                (ct as any).danhSachSdt.forEach((s: any) => { if (s) rawPhones.push(String(s)); });
              }

              const isPrimaryContact = idx === 0 || 
                Boolean((ct as any).isPrimary) || 
                /giám đốc|chủ tịch|lãnh đạo|đại diện pháp luật|tổng giám đốc|founder|ceo/i.test(ct.chucVu || '');

              contactPool.push({
                name: ct.nguoiDaiDien || c.tenKhachHang || `Đầu mối ${idx + 1}`,
                phonesRaw: rawPhones,
                role: ct.chucVu,
                branch: ct.chiNhanh,
                isPrimaryContact,
                rawContact: ct
              });
            }
          });
        }

        // Bổ sung primary phone nếu chưa có trong pool
        if (c.sdt) {
          const hasInPool = contactPool.some(cp => cp.phonesRaw.some(r => r.includes(c.sdt!)));
          if (!hasInPool) {
            contactPool.unshift({
              name: c.nguoiDaiDien || c.tenKhachHang || 'Đại diện chính',
              phonesRaw: [c.sdt],
              role: 'Chính',
              isPrimaryContact: true,
              rawContact: undefined
            });
          }
        }

        if (contactPool.length === 0) {
          list.push({
            id: `cust-nophone-${c.id || c.maKh}`,
            entityId: c.id || c.maKh || '',
            code: c.maKh || 'KH',
            customerName: c.tenKhachHang || 'Khách hàng',
            contactName: c.nguoiDaiDien || 'Không tên',
            phone: '',
            phoneFormatted: '—',
            phoneType: 'UNKNOWN',
            isLandline: false,
            isAlreadySent: false,
            willSend: false,
            skipReason: 'Thiếu số điện thoại',
            originalEntity: c
          });
          return;
        }

        contactPool.forEach((ct, ctIdx) => {
          const combinedPhoneStr = ct.phonesRaw.join(' / ');
          const ext = extractVietnamesePhones(combinedPhoneStr, c.diaChi);

          // Deduplicate mobile phones by cleaned number
          const uniqueMobilePhones: any[] = [];
          const seenCleaned = new Set<string>();
          for (const mob of ext.mobilePhones) {
            if (!seenCleaned.has(mob.cleaned)) {
              seenCleaned.add(mob.cleaned);
              uniqueMobilePhones.push(mob);
            }
          }

          if (uniqueMobilePhones.length > 0) {
            uniqueMobilePhones.forEach((mob, mIdx) => {
              const isPrimaryPhone = mIdx === 0;
              const recId = `cust-${c.id || c.maKh}-${ctIdx}-${mob.cleaned}`;
              
              // Động cơ đối soát ZNS 4 cấp độ (Contact Phone, Contact Obj, Entity Status, Realtime Messages)
              const isAlreadySent = isRecipientZnsAlreadySent({
                entity: c,
                entityType: 'CUSTOMER',
                contact: ct.rawContact,
                phone: mob.cleaned,
                znsMessages: realtimeZnsMessages
              });

              // Quyết định gửi mặc định:
              // - Số chính: !isAlreadySent || allowResend
              // - Số phụ: false (Tự động bỏ qua để tránh gửi trùng 2 tin cho cùng 1 người)
              const defaultWillSend = isPrimaryPhone ? (!isAlreadySent || allowResend) : false;
              const willSend = manualToggles[recId] !== undefined ? manualToggles[recId] : defaultWillSend;

              let skipReason: string | undefined;
              if (isAlreadySent && !allowResend && manualToggles[recId] !== true) {
                skipReason = 'Đã gửi thành công trước đó (Tự động bỏ qua)';
              } else if (!isPrimaryPhone && !manualToggles[recId]) {
                skipReason = '📱 Bỏ qua số phụ (Tránh gửi trùng 2 tin cho cùng 1 người)';
              } else if (manualToggles[recId] === false) {
                skipReason = 'Bỏ chọn thủ công';
              }

              const roleBase = ct.role 
                ? `${ct.role}${ct.branch ? ` (${ct.branch})` : ''}` 
                : (ct.branch || (ct.isPrimaryContact ? 'Đầu mối chính' : 'Đầu mối'));
              const phoneLabel = isPrimaryPhone ? 'Số chính' : 'Số phụ';

              list.push({
                id: recId,
                entityId: c.id || c.maKh || '',
                customerId: c.id || c.maKh || '',
                code: c.maKh || 'KH',
                customerName: c.tenKhachHang || 'Khách hàng',
                contactName: ct.name,
                roleOrBranch: `${roleBase} • ${phoneLabel}`,
                phone: mob.cleaned,
                phoneFormatted: mob.formatted,
                carrier: mob.carrier,
                phoneType: 'MOBILE',
                isLandline: false,
                isAlreadySent,
                rawStatus: c.trangThaiGuiTinQuangCao || undefined,
                willSend,
                skipReason,
                originalEntity: { ...c, sdt: mob.cleaned, phone: mob.cleaned, nguoiDaiDien: ct.name, customerId: c.id || c.maKh || '' },
                contactObj: ct.rawContact,
                diaChi: c.diaChi || '',
                tinhThanh: c.tinhThanh || '',
                maKh: c.maKh || '',
                maSoThue: c.maSoThue || ''
              });
            });
          } else if (ext.landlinePhones.length > 0) {
            const land = ext.landlinePhones[0];
            const isAlreadySent = isRecipientZnsAlreadySent({
              entity: c,
              entityType: 'CUSTOMER',
              contact: ct.rawContact,
              phone: land.cleaned,
              znsMessages: realtimeZnsMessages
            });

            list.push({
              id: `cust-land-${c.id || c.maKh}-${ctIdx}`,
              entityId: c.id || c.maKh || '',
              customerId: c.id || c.maKh || '',
              code: c.maKh || 'KH',
              customerName: c.tenKhachHang || 'Khách hàng',
              contactName: ct.name,
              roleOrBranch: ct.role || 'Số bàn cố định',
              phone: land.cleaned,
              phoneFormatted: land.formatted,
              phoneType: 'LANDLINE',
              isLandline: true,
              isAlreadySent,
              willSend: false,
              skipReason: `Bỏ qua (Số bàn cố định ${land.cleaned.slice(0, 3)})`,
              originalEntity: { ...c, customerId: c.id || c.maKh || '' },
              diaChi: c.diaChi || '',
              tinhThanh: c.tinhThanh || '',
              maKh: c.maKh || '',
              maSoThue: c.maSoThue || ''
            });
          } else {
            list.push({
              id: `cust-inv-${c.id || c.maKh}-${ctIdx}`,
              entityId: c.id || c.maKh || '',
              customerId: c.id || c.maKh || '',
              code: c.maKh || 'KH',
              customerName: c.tenKhachHang || 'Khách hàng',
              contactName: ct.name,
              phone: combinedPhoneStr,
              phoneFormatted: combinedPhoneStr || '—',
              phoneType: 'UNKNOWN',
              isLandline: false,
              isAlreadySent: false,
              willSend: false,
              skipReason: 'Số điện thoại không hợp lệ',
              originalEntity: { ...c, customerId: c.id || c.maKh || '' },
              diaChi: c.diaChi || '',
              tinhThanh: c.tinhThanh || '',
              maKh: c.maKh || '',
              maSoThue: c.maSoThue || ''
            });
          }
        });
      });
    } else {
      // QUOTATION (V50: 1-to-1 Strict Cardinality with Smart Customer Mesh Hydration)
      const quotes = items as Quotation[];
      const customersMap = new Map<string, Customer>();
      if (Array.isArray(customers) && customers.length > 0) {
        customers.forEach(c => {
          if (c && c.id) customersMap.set(c.id, c);
          if (c && c.maKh) customersMap.set(c.maKh, c);
        });
      }

      quotes.forEach((q) => {
        if (!q || !q.id) return;

        const parentCust = (q.customerId && customersMap.get(q.customerId)) || 
                           (q.maKh && customersMap.get(q.maKh)) || 
                           null;

        const rawPhone = (q.sdt || '').trim();
        let ext = extractVietnamesePhones(rawPhone, q.diaChi);

        // Smart Customer Mesh Hydration: nếu báo giá thiếu số di động hoặc chỉ có số bàn, tra cứu hồ sơ KH
        let isHydrated = false;
        let hydratedNote: string | undefined;
        let hydratedContactName: string | undefined;

        if (ext.mobilePhones.length === 0 && parentCust) {
          const custRawPhones = [
            (parentCust as any).soZaloMacDinh,
            parentCust.sdt,
            (parentCust as any).sdtPhu,
            ...(Array.isArray((parentCust as any).danhSachSdt) ? (parentCust as any).danhSachSdt : []),
            ...(Array.isArray(parentCust.contacts) ? parentCust.contacts.map(ct => ct?.sdt) : [])
          ].filter(Boolean).join(' ');

          const custExt = extractVietnamesePhones(custRawPhones, parentCust.diaChi);
          if (custExt.mobilePhones.length > 0) {
            ext = custExt;
            isHydrated = true;
            hydratedNote = '📱 Từ hồ sơ KH';
            if (Array.isArray(parentCust.contacts) && parentCust.contacts.length > 0) {
              const primaryCt = parentCust.contacts.find(ct => ct?.sdt && custExt.mobilePhones.some(m => m.cleaned === ct.sdt?.replace(/\D/g, ''))) || parentCust.contacts[0];
              if (primaryCt?.nguoiDaiDien) {
                hydratedContactName = primaryCt.nguoiDaiDien;
              }
            }
          } else if (ext.landlinePhones.length === 0 && custExt.landlinePhones.length > 0) {
            ext = custExt;
            isHydrated = true;
            hydratedNote = '☎️ Số bàn từ hồ sơ KH';
          }
        }

        // Deduplicate mobile phones by cleaned number
        const uniqueMobilePhones: any[] = [];
        const seenCleaned = new Set<string>();
        for (const mob of ext.mobilePhones) {
          if (!seenCleaned.has(mob.cleaned)) {
            seenCleaned.add(mob.cleaned);
            uniqueMobilePhones.push(mob);
          }
        }

        // Distinct representative check: KHÔNG lặp lại tên công ty
        const hasDistinctRep = Boolean(
          q.nguoiDaiDien && 
          q.nguoiDaiDien.trim().toLowerCase() !== (q.tenKhachHang || '').trim().toLowerCase()
        );
        const resolvedContactName = hasDistinctRep 
          ? q.nguoiDaiDien! 
          : (hydratedContactName || '');

        const amount = q.totalAmount || q.subTotal || 0;
        const amountFormatted = amount > 0 ? formatCurrency(amount) : undefined;
        const dateStr = q.ngayBaoGia || '';

        // BẢO TOÀN TỶ LỆ 1-1: Mỗi báo giá tạo chính xác 1 dòng TargetRecipient
        if (uniqueMobilePhones.length > 0) {
          const recId = `quote-${q.id}`;
          const selectedCleaned = phoneOverrides[recId] || uniqueMobilePhones[0].cleaned;
          const activeMob = uniqueMobilePhones.find(m => m.cleaned === selectedCleaned) || uniqueMobilePhones[0];

          const isAlreadySent = isRecipientZnsAlreadySent({
            entity: q,
            entityType: 'QUOTATION',
            phone: activeMob.cleaned,
            znsMessages: realtimeZnsMessages
          });

          const defaultWillSend = !isAlreadySent || allowResend;
          const willSend = manualToggles[recId] !== undefined ? manualToggles[recId] : defaultWillSend;

          let skipReason: string | undefined;
          if (isAlreadySent && !allowResend && manualToggles[recId] !== true) {
            skipReason = 'Đã gửi thành công trước đó (Tự động bỏ qua)';
          } else if (manualToggles[recId] === false) {
            skipReason = 'Bỏ chọn thủ công';
          }

          const resolvedCustName = q.tenKhachHang || parentCust?.tenKhachHang || (parentCust as any)?.ten_khach_hang || 'Khách hàng';

          const targetCustomerId = q.customerId || parentCust?.id || (q as any).customer_id || '';

          list.push({
            id: recId,
            entityId: q.id || '',
            customerId: targetCustomerId,
            code: q.soPhieuBaoGia || 'BG',
            customerName: resolvedCustName,
            contactName: resolvedContactName,
            roleOrBranch: isHydrated ? 'Hồ sơ KH' : undefined,
            phone: activeMob.cleaned,
            phoneFormatted: activeMob.formatted,
            carrier: activeMob.carrier,
            phoneType: 'MOBILE',
            isLandline: false,
            isAlreadySent,
            rawStatus: q.trangThaiGuiTinBaoGia || undefined,
            willSend,
            skipReason,
            originalEntity: {
              ...q,
              customerId: targetCustomerId,
              tenKhachHang: resolvedCustName !== 'Khách hàng' ? resolvedCustName : (q.tenKhachHang || ''),
              sdt: activeMob.cleaned,
              phone: activeMob.cleaned,
              soPhieuBaoGia: q.soPhieuBaoGia || (q as any).maBaoGia || q.id
            },
            amount,
            amountFormatted,
            dateStr,
            isHydratedFromCustomer: isHydrated,
            hydratedNote,
            availablePhones: uniqueMobilePhones,
            diaChi: (q as any).diaChi || parentCust?.diaChi || '',
            tinhThanh: (q as any).tinhThanh || parentCust?.tinhThanh || '',
            maKh: q.maKh || parentCust?.maKh || '',
            maSoThue: (q as any).maSoThue || parentCust?.maSoThue || ''
          });
        } else if (ext.landlinePhones.length > 0) {
          const land = ext.landlinePhones[0];
          const recId = `quote-land-${q.id}`;
          const isAlreadySent = isRecipientZnsAlreadySent({
            entity: q,
            entityType: 'QUOTATION',
            phone: land.cleaned,
            znsMessages: realtimeZnsMessages
          });

          const targetCustomerId = q.customerId || parentCust?.id || (q as any).customer_id || '';

          list.push({
            id: recId,
            entityId: q.id || '',
            customerId: targetCustomerId,
            code: q.soPhieuBaoGia || 'BG',
            customerName: q.tenKhachHang || 'Khách hàng',
            contactName: resolvedContactName,
            roleOrBranch: isHydrated ? 'Hồ sơ KH' : undefined,
            phone: land.cleaned,
            phoneFormatted: land.formatted,
            phoneType: 'LANDLINE',
            isLandline: true,
            isAlreadySent,
            willSend: false,
            skipReason: `Bỏ qua (Số bàn cố định ${land.cleaned.slice(0, 3)})`,
            originalEntity: { ...q, customerId: targetCustomerId },
            amount,
            amountFormatted,
            dateStr,
            isHydratedFromCustomer: isHydrated,
            hydratedNote,
            diaChi: (q as any).diaChi || parentCust?.diaChi || '',
            tinhThanh: (q as any).tinhThanh || parentCust?.tinhThanh || '',
            maKh: q.maKh || parentCust?.maKh || '',
            maSoThue: (q as any).maSoThue || parentCust?.maSoThue || ''
          });
        } else {
          const recId = `quote-nophone-${q.id}`;
          const targetCustomerId = q.customerId || parentCust?.id || (q as any).customer_id || '';

          list.push({
            id: recId,
            entityId: q.id || '',
            customerId: targetCustomerId,
            code: q.soPhieuBaoGia || 'BG',
            customerName: q.tenKhachHang || 'Khách hàng',
            contactName: resolvedContactName,
            phone: rawPhone,
            phoneFormatted: rawPhone || '—',
            phoneType: 'UNKNOWN',
            isLandline: false,
            isAlreadySent: false,
            willSend: false,
            skipReason: rawPhone ? 'Số không hợp lệ' : 'Thiếu số điện thoại',
            originalEntity: { ...q, customerId: targetCustomerId },
            amount,
            amountFormatted,
            dateStr,
            diaChi: (q as any).diaChi || parentCust?.diaChi || '',
            tinhThanh: (q as any).tinhThanh || parentCust?.tinhThanh || '',
            maKh: q.maKh || parentCust?.maKh || '',
            maSoThue: (q as any).maSoThue || parentCust?.maSoThue || ''
          });
        }
      });
    }

    return list;
  }, [items, customers, entityType, allowResend, manualToggles, phoneOverrides, realtimeZnsMessages]);

  // Các danh sách con phục vụ thống kê & hàng đợi
  const eligibleRecipients = useMemo(() => recipients.filter(r => r.willSend), [recipients]);
  const skippedLandlineCount = useMemo(() => recipients.filter(r => r.isLandline).length, [recipients]);
  const skippedNoPhoneCount = useMemo(() => recipients.filter(r => !r.isLandline && !r.phone).length, [recipients]);
  const alreadySentCount = useMemo(() => recipients.filter(r => r.isAlreadySent).length, [recipients]);

  // Tổng tiền các bản ghi sẵn sàng gửi (áp dụng cho Báo giá)
  const totalDispatchedAmount = useMemo(() => {
    return eligibleRecipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [eligibleRecipients]);

  // Bộ lọc danh sách hiển thị trên bảng (Cockpit Filter Matrix)
  const displayedRecipients = useMemo(() => {
    return recipients.filter(r => {
      // 1. Tab filter
      if (filterTab === 'READY' && !r.willSend) return false;
      if (filterTab === 'SENT' && !r.isAlreadySent) return false;
      if (filterTab === 'EXCLUDED' && (!r.isLandline && r.phone)) return false;

      // 2. Search query filter (Multi-dimensional Omni-Search)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchName = (r.customerName || '').toLowerCase().includes(q);
        const matchContact = (r.contactName || '').toLowerCase().includes(q);
        const matchPhone = (r.phone || '').includes(q) || (r.phoneFormatted || '').includes(q);
        const matchAddress = (r.diaChi || '').toLowerCase().includes(q);
        const matchProvince = (r.tinhThanh || '').toLowerCase().includes(q);
        const matchCustCode = (r.maKh || '').toLowerCase().includes(q);
        const matchTax = (r.maSoThue || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchContact && !matchPhone && !matchAddress && !matchProvince && !matchCustCode && !matchTax) return false;
      }

      return true;
    });
  }, [recipients, filterTab, searchQuery]);

  // Reset state khi mở modal
  useEffect(() => {
    if (isOpen) {
      setStage('PRE_FLIGHT');
      setCurrentIndex(0);
      setIsPaused(false);
      setIsAborted(false);
      setCountdownRemaining(0);
      setLogs([]);
      setSuccessCount(0);
      setFailedCount(0);
      setQueuedCount(0);
      setPhoneOverrides({});
      setFilterTab('ALL');
      setSearchQuery('');
    }
  }, [isOpen]);

  // Realtime reconciliation for queued messages (Two-Phase Verification Landing)
  useEffect(() => {
    if (!realtimeZnsMessages || realtimeZnsMessages.length === 0) return;
    if (stage !== 'DISPATCHING' && stage !== 'COMPLETED') return;

    setLogs(prevLogs => {
      let hasChanges = false;
      const updated = prevLogs.map(log => {
        if (log.status !== 'QUEUED') return log;
        
        // Find matching message in realtime collection
        const cleanLogPhone = log.phone ? log.phone.replace(/\D/g, '') : '';
        const match = realtimeZnsMessages.find((m: any) => {
          if (log.messageId && (m.id === log.messageId || m.trackingId === log.messageId)) return true;
          const mPhone = (m.phone || '').replace(/\D/g, '');
          if (cleanLogPhone && mPhone === cleanLogPhone) {
            if (m.entityId === log.id || m.entityId === log.code) return true;
          }
          return false;
        });

        if (!match) return log;

        if (match.status === 'SUCCESS') {
          hasChanges = true;
          setSuccessCount(s => s + 1);
          setQueuedCount(q => Math.max(0, q - 1));
          return { ...log, status: 'SUCCESS' as const };
        } else if (match.status === 'FAILED' || match.status === 'LIMIT_EXCEEDED' || match.status === 'DLQ') {
          hasChanges = true;
          setFailedCount(f => f + 1);
          setQueuedCount(q => Math.max(0, q - 1));
          let errMsg = match.errorLog || match.status;
          if (errMsg.includes('-118') || errMsg.includes('not existed')) {
            errMsg = 'Chưa có Zalo (-118)';
          } else if (errMsg.includes('-124')) {
            errMsg = 'SĐT không hợp lệ (-124)';
          } else if (errMsg.includes('-136')) {
            errMsg = 'Quá 30 ký tự (-136)';
          } else if (errMsg.includes('-1472') || errMsg.includes('limit')) {
            errMsg = 'Vượt hạn mức (-1472)';
          }
          return { ...log, status: 'FAILED' as const, errorMsg: errMsg };
        }
        return log;
      });
      return hasChanges ? updated : prevLogs;
    });
  }, [realtimeZnsMessages, stage]);

  // Hàm chờ nhịp độ (cooldown) kèm đếm ngược
  const waitWithCountdown = async (seconds: number): Promise<boolean> => {
    for (let s = seconds; s > 0; s--) {
      if (abortRef.current) return false;
      setCountdownRemaining(s);
      await new Promise(r => setTimeout(r, 1000));
      while (pauseRef.current) {
        if (abortRef.current) return false;
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setCountdownRemaining(0);
    return true;
  };

  // Khởi động Dispatcher
  const handleStartDispatch = async () => {
    if (eligibleRecipients.length === 0) {
      return notify.warning('Không có bản ghi nào hợp lệ để gửi ZNS.');
    }

    setStage('DISPATCHING');
    setIsPaused(false);
    setIsAborted(false);
    abortRef.current = false;
    pauseRef.current = false;
    setCurrentIndex(0);
    setLogs([]);
    setSuccessCount(0);
    setFailedCount(0);
    setQueuedCount(0);

    let success = 0;
    let failed = 0;
    let queued = 0;

    // Bộ đệm tích lũy cập nhật nguyên tử chống ghi đè khi 1 khách hàng có nhiều đầu mối
    const customerAccumulators = new Map<string, {
      contacts: any[];
      contactsZnsHistory: Record<string, any>;
      trangThaiGuiTinQuangCao: string;
    }>();

    for (let i = 0; i < eligibleRecipients.length; i++) {
      if (abortRef.current) break;

      while (pauseRef.current) {
        if (abortRef.current) break;
        await new Promise(r => setTimeout(r, 500));
      }
      if (abortRef.current) break;

      const target = eligibleRecipients[i];
      setCurrentIndex(i);

      // Log tạm thời: Đang gửi
      setLogs(prev => [
        {
          id: target.id,
          code: target.code,
          name: `${target.customerName} (${target.contactName})`,
          phone: target.phoneFormatted,
          status: 'SENDING',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      try {
        const msgType = entityType === 'CUSTOMER' 
          ? ZnsMessageType.CUSTOMER_PRE_QUOTE 
          : ZnsMessageType.BAOGIA;

        const attempt = nextAttempt(target.rawStatus);

        const res = await sendZnsMessage({
          entityId: target.entityId,
          entityType,
          messageType: msgType,
          phone: target.phone,
          payload: { 
            ...target.originalEntity, 
            phone: target.phone, 
            sdt: target.phone,
            customerId: target.customerId || target.originalEntity?.customerId || (entityType === 'CUSTOMER' ? target.entityId : undefined),
            tenZns: target.originalEntity?.tenZns || (target.originalEntity as any)?.ten_zns,
            customer_name: target.originalEntity?.tenZns || (target.originalEntity as any)?.ten_zns || target.customerName
          },
          attemptBucket: attempt,
          forceResend: allowResend || target.isAlreadySent
        });

        const nowIso = new Date().toISOString();
        const isSynchronousSuccess = res?.status === 'SUCCESS' || (!res?.status && res?.success);

        if (isSynchronousSuccess) {
          success++;
          setSuccessCount(success);
          setLogs(prev => prev.map(l => l.id === target.id ? { ...l, status: 'SUCCESS' } : l));
        } else {
          queued++;
          setQueuedCount(queued);
          setLogs(prev => prev.map(l => l.id === target.id ? { ...l, status: 'QUEUED', messageId: res?.messageId } : l));
        }

        // Lưu trữ nguyên tử tức thời vào Supabase PostgreSQL (In-Flight Atomic Persistence)
        if (entityType === 'CUSTOMER') {
          let accum = customerAccumulators.get(target.entityId);
          if (!accum) {
            const orig = target.originalEntity || {};
            accum = {
              contacts: Array.isArray(orig.contacts) ? JSON.parse(JSON.stringify(orig.contacts)) : [],
              contactsZnsHistory: { ...(orig.contactsZnsHistory || {}) },
              trangThaiGuiTinQuangCao: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ'
            };
            customerAccumulators.set(target.entityId, accum);
          }

          // 1. Cập nhật contactsZnsHistory cho đúng số điện thoại này
          accum.contactsZnsHistory[target.phone] = {
            status: isSynchronousSuccess ? 'SUCCESS' : 'SENT_WAITING',
            sentAt: nowIso,
            nguoiDaiDien: target.contactName,
            roleOrBranch: target.roleOrBranch
          };

          // 2. Cập nhật mảng contacts
          const foundIdx = accum.contacts.findIndex((c: any) => {
            const rawPhone = (c?.sdt || '').trim();
            const ext = extractVietnamesePhones(rawPhone);
            return ext.phones.some(p => p.cleaned === target.phone) || 
                   rawPhone === target.phone ||
                   (target.contactObj && c === target.contactObj);
          });

          if (foundIdx >= 0) {
            accum.contacts[foundIdx] = {
              ...accum.contacts[foundIdx],
              trangThaiZns: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ',
              ngayGuiZns: nowIso
            };
          } else if (target.contactName && target.phone) {
            accum.contacts.push({
              nguoiDaiDien: target.contactName,
              sdt: target.phone,
              trangThaiZns: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ',
              ngayGuiZns: nowIso,
              chucVu: target.roleOrBranch || ''
            });
          }

          accum.trangThaiGuiTinQuangCao = isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ';

          try {
            if (onUpdateCustomer) {
              await onUpdateCustomer(target.entityId, {
                contacts: accum.contacts,
                contactsZnsHistory: accum.contactsZnsHistory,
                trangThaiGuiTinQuangCao: accum.trangThaiGuiTinQuangCao
              } as any);
            } else {
              await UpdateCustomer.execute(target.entityId, {
                contacts: accum.contacts,
                contactsZnsHistory: accum.contactsZnsHistory,
                trangThaiGuiTinQuangCao: accum.trangThaiGuiTinQuangCao
              } as any);
            }
          } catch (persistErr) {
            console.error(`[BulkZnsModal] Lỗi lưu trạng thái ZNS khách hàng ${target.entityId}:`, persistErr);
          }
        } else if (entityType === 'QUOTATION') {
          try {
            await quotationRepo.update(target.entityId, {
              trangThaiGuiTinBaoGia: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ',
              trangThaiZns: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ',
              lifecycleStatus: 'SENT',
              sentAt: nowIso,
              thongTinGuiZnsBaoGia: {
                soDienThoaiNhan: target.phone,
                tenNguoiNhan: target.contactName || '',
                thoiGianGui: nowIso,
                trangThai: isSynchronousSuccess ? 'THANH_CONG' : 'DA_DAY_CHO_KQ'
              }
            });
          } catch (qErr) {
            console.error(`[BulkZnsModal] Lỗi lưu trạng thái ZNS báo giá ${target.entityId}:`, qErr);
          }
        }
      } catch (err: any) {
        failed++;
        setFailedCount(failed);
        let errMsg = err?.message || 'Lỗi gửi tin ZNS';
        if (errMsg.includes('-118') || errMsg.includes('not existed')) {
          errMsg = 'Chưa có Zalo (-118)';
        } else if (errMsg.includes('-124')) {
          errMsg = 'SĐT không hợp lệ (-124)';
        } else if (errMsg.includes('-136')) {
          errMsg = 'Quá 30 ký tự (-136)';
        } else if (errMsg.includes('-1472') || errMsg.includes('limit')) {
          errMsg = 'Vượt hạn mức (-1472)';
        }

        // Update log thất bại
        setLogs(prev => prev.map(l => l.id === target.id ? { ...l, status: 'FAILED', errorMsg: errMsg } : l));
      }

      // Giãn cách nhịp độ an toàn cho Webhook CNV nếu chưa phải bản ghi cuối
      if (i < eligibleRecipients.length - 1 && !abortRef.current) {
        const ok = await waitWithCountdown(cooldownSeconds);
        if (!ok) break;
      }
    }

    setStage('COMPLETED');
    clearSwrColCache(entityType === 'CUSTOMER' ? 'customers' : 'quotations');
    crossTabSync.broadcast({ 
      type: 'COLLECTION_REFRESH', 
      collectionName: entityType === 'CUSTOMER' ? 'customers' : 'quotations' 
    });
    onSuccess?.();

    if (failed === 0 && queued === 0) {
      notify.success(`Đã gửi thành công toàn bộ ${success} tin ZNS!`);
    } else if (queued > 0) {
      notify.info(`Đã điều phối ${queued} tin sang Webhook CNV (chờ Zalo phản hồi), ${failed} tin lỗi.`);
    } else {
      notify.warning(`Đã gửi ${success} tin thành công, ${failed} tin thất bại.`);
    }
  };

  const handleAbort = () => {
    setIsAborted(true);
    abortRef.current = true;
    notify.info('Đang dừng gửi khẩn cấp...');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Send size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Hệ Thống Gửi ZNS Hàng Loạt ({entityType === 'CUSTOMER' ? 'Khách Hàng' : 'Báo Giá'})
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                  {eligibleRecipients.length} {entityType === 'CUSTOMER' ? 'lượt gửi sẵn sàng' : 'báo giá sẵn sàng'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {entityType === 'CUSTOMER' 
                  ? 'Tự động bóc tách đa đầu mối • Loại trừ 100% số bàn • Hàng đợi an toàn Webhook CNV' 
                  : 'Bảo toàn tỷ lệ 1-1 • Tự động liên kết khách hàng • Loại trừ số bàn • Đồng bộ vòng đời SENT'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={stage === 'DISPATCHING' ? handleAbort : onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STAGE 1: PRE-FLIGHT AUDIENCE & SAFETY CONFIGURATION */}
          {stage === 'PRE_FLIGHT' && (
            <div className="space-y-5">
              
              {/* Audience Metric Bento Grid */}
              <div className={`grid gap-3 text-center ${entityType === 'QUOTATION' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                    {entityType === 'QUOTATION' ? 'Tổng báo giá nguồn' : 'Tổng bản ghi nguồn'}
                  </span>
                  <span className="text-base font-black font-mono text-slate-900">{items.length}</span>
                  <span className="text-3xs text-slate-500 block mt-0.5">
                    {entityType === 'QUOTATION' ? 'Khớp tỷ lệ 1-1' : 'Danh sách hiện tại'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  allowResend 
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/50 border-emerald-300 shadow-2xs' 
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <span className="text-3xs uppercase font-bold text-emerald-700 block mb-1 flex items-center justify-center gap-1">
                    <Smartphone size={11} /> SĐT Di động (ZNS OK)
                  </span>
                  <span className="text-base font-black font-mono text-emerald-800">{eligibleRecipients.length}</span>
                  <span className="text-3xs text-emerald-600 block mt-0.5 font-medium">
                    {allowResend ? 'Bao gồm gửi mới + gửi lại' : 'Sẵn sàng gửi mới (Đã chặn trùng)'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xs uppercase font-bold text-slate-500 block mb-1 flex items-center justify-center gap-1">
                    <PhoneOff size={11} /> {entityType === 'QUOTATION' ? 'Số bàn / Thiếu SĐT' : 'Số bàn cố định'}
                  </span>
                  <span className="text-base font-black font-mono text-slate-700">
                    {entityType === 'QUOTATION' ? skippedLandlineCount + skippedNoPhoneCount : skippedLandlineCount}
                  </span>
                  <span className="text-3xs text-slate-400 block mt-0.5">Tự động loại trừ</span>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  allowResend 
                    ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/40 text-blue-900 shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span className={`text-3xs uppercase font-bold block mb-1 flex items-center justify-center gap-1 ${
                    allowResend ? 'text-blue-800' : 'text-slate-500'
                  }`}>
                    <CheckCircle2 size={11} /> Đã gửi thành công
                  </span>
                  <span className={`text-base font-black font-mono ${allowResend ? 'text-blue-900' : 'text-slate-800'}`}>
                    {alreadySentCount}
                  </span>
                  <span className={`text-3xs block mt-0.5 font-medium ${allowResend ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                    {allowResend ? `Đã mở khóa gửi lại (${alreadySentCount} lượt)` : 'Tự động bỏ qua (Chặn trùng)'}
                  </span>
                </div>

                {entityType === 'QUOTATION' && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 col-span-2 sm:col-span-1">
                    <span className="text-3xs uppercase font-bold text-blue-700 block mb-1">
                      Tổng tiền đợt gửi
                    </span>
                    <span className="text-xs font-black font-mono text-blue-900 truncate block" title={formatCurrency(totalDispatchedAmount)}>
                      {formatCurrency(totalDispatchedAmount)}
                    </span>
                    <span className="text-3xs text-blue-600 block mt-0.5">
                      {eligibleRecipients.length} phiếu sẵn sàng
                    </span>
                  </div>
                )}
              </div>

              {/* Security & Cooldown Configuration Panel */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <strong className="text-slate-900 block font-bold">Cho phép gửi lại bản ghi đã thành công</strong>
                    <p className="text-slate-500 text-3xs mt-0.5">
                      Nếu bật, các khách hàng/báo giá đã từng nhận ZNS thành công trước đó vẫn sẽ được gửi lại (chăm sóc định kỳ).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={allowResend} 
                      onChange={(e) => {
                        setAllowResend(e.target.checked);
                        setManualToggles({});
                      }} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {/* Cooldown Webhook CNV Rate Limiting */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="text-slate-900 block font-bold flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" />
                      Giãn cách nhịp độ gửi an toàn (Bảo vệ Webhook CNV)
                    </strong>
                    <p className="text-slate-500 text-3xs mt-0.5">
                      Hàng đợi tuần tự có độ trễ giữa mỗi tin nhắn để triệt tiêu lỗi HTTP 429 và xung đột Webhook.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { sec: 5, label: '5 giây (Chuẩn)' },
                      { sec: 7, label: '7 giây (An toàn)' },
                      { sec: 10, label: '10 giây (Tối đa)' }
                    ].map(item => (
                      <button
                        key={item.sec}
                        type="button"
                        onClick={() => setCooldownSeconds(item.sec)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          cooldownSeconds === item.sec
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recipient Audience Preview Table (Cockpit Matrix) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700">
                      {entityType === 'QUOTATION' 
                        ? `Danh Sách Báo Giá Tiếp Nhận (${recipients.length} Báo Giá)` 
                        : `Danh Sách Đầu Mối Tiếp Nhận (${recipients.length} mục)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const validMobiles = recipients.filter(r => !r.isLandline && r.phone);
                        const allSelected = validMobiles.every(r => r.willSend);
                        const next: Record<string, boolean> = {};
                        validMobiles.forEach(r => {
                          next[r.id] = !allSelected;
                        });
                        setManualToggles(next);
                      }}
                      className="text-3xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {eligibleRecipients.length === 0 ? 'Chọn tất cả di động' : 'Đảo chọn'}
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={entityType === 'QUOTATION' ? 'Tìm mã BG, khách hàng, SĐT...' : 'Tìm khách hàng, người liên hệ, SĐT...'}
                      className="w-full pl-7 pr-7 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Smart Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-3xs border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFilterTab('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      filterTab === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('READY')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'READY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 size={11} />
                    Sẵn sàng gửi ({eligibleRecipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('SENT')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'SENT'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <RotateCcw size={11} />
                    Đã gửi trước đó ({alreadySentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('EXCLUDED')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === 'EXCLUDED'
                        ? 'bg-slate-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <PhoneOff size={11} />
                    Loại trừ ({skippedLandlineCount + skippedNoPhoneCount})
                  </button>
                </div>

                {/* Recipient Table Rows */}
                <div className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  {displayedRecipients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Không tìm thấy bản ghi nào phù hợp với bộ lọc.
                    </div>
                  ) : (
                    displayedRecipients.map((r, idx) => {
                      const isCheckboxDisabled = r.isLandline || !r.phone;
                      return (
                        <div 
                          key={r.id || idx} 
                          onClick={() => {
                            if (!isCheckboxDisabled) {
                              setManualToggles(prev => ({ ...prev, [r.id]: !r.willSend }));
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                            r.willSend ? 'bg-white hover:bg-blue-50/30' : 'bg-slate-50/70 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={r.willSend}
                              disabled={isCheckboxDisabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                setManualToggles(prev => ({ ...prev, [r.id]: e.target.checked }));
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <span className="font-mono text-3xs text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-800 text-2xs">{r.code}</span>
                                <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={r.customerName}>{r.customerName}</span>
                                
                                {r.contactName && (
                                  <span className="text-3xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    👤 {r.contactName} {r.roleOrBranch ? `• ${r.roleOrBranch}` : ''}
                                  </span>
                                )}

                                {r.amountFormatted && (
                                  <span className="text-3xs font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    💰 {r.amountFormatted}
                                  </span>
                                )}

                                {r.dateStr && (
                                  <span className="text-3xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                    📅 {r.dateStr}
                                  </span>
                                )}

                                {r.isHydratedFromCustomer && (
                                  <span className="text-3xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    {r.hydratedNote || '📱 Từ hồ sơ KH'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              {r.availablePhones && r.availablePhones.length > 1 ? (
                                <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 rounded-md px-2 py-0.5 shadow-2xs">
                                  <span className="font-mono text-xs font-bold text-blue-900">
                                    {r.phoneFormatted}
                                  </span>
                                  {r.carrier && (
                                    <span className="text-3xs text-blue-700 bg-blue-50 px-1 py-0.1 rounded border border-blue-200 font-bold">
                                      {r.carrier}
                                    </span>
                                  )}
                                  <select
                                    aria-label="Đổi số nhận ZNS"
                                    value={r.phone}
                                    onChange={(e) => {
                                      const newPhone = e.target.value;
                                      setPhoneOverrides(prev => ({
                                        ...prev,
                                        [r.id]: newPhone
                                      }));
                                    }}
                                    disabled={stage !== 'PRE_FLIGHT'}
                                    className="text-xs font-mono font-bold bg-white text-blue-900 border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed ml-1"
                                  >
                                    {r.availablePhones.map(p => (
                                      <option key={p.cleaned} value={p.cleaned}>
                                        {p.formatted} {p.carrier ? `(${p.carrier})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <span className={`font-mono text-xs font-bold ${r.isLandline ? 'text-slate-400 line-through' : 'text-blue-900'}`}>
                                    {r.phoneFormatted}
                                  </span>
                                  {r.carrier && (
                                    <span className="text-3xs text-blue-700 bg-blue-50 px-1 py-0.1 rounded border border-blue-200 ml-1.5 font-bold">
                                      {r.carrier}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            <div>
                              {r.isLandline ? (
                                <span className="text-3xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  ☎️ {r.skipReason || 'Bỏ qua (Số bàn)'}
                                </span>
                              ) : !r.phone ? (
                                <span className="text-3xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                  Thiếu SĐT
                                </span>
                              ) : r.willSend && !r.isAlreadySent ? (
                                <span className="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Sẵn sàng gửi mới
                                </span>
                              ) : r.willSend && r.isAlreadySent ? (
                                <span className="text-3xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                                  <RotateCcw size={11} /> Sẵn sàng gửi lại
                                </span>
                              ) : !r.willSend && r.isAlreadySent ? (
                                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Đã gửi (Bỏ qua)
                                </span>
                              ) : (
                                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                  {r.skipReason || 'Bỏ qua'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STAGE 2: LIVE FLIGHT CONSOLE (DISPATCHING) */}
          {stage === 'DISPATCHING' && (
            <div className="space-y-5">
              
              {/* Flight Progress HUD */}
              <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                    Đang gửi tin ZNS ({currentIndex + 1} / {eligibleRecipients.length})
                  </span>
                  <span className="font-mono text-blue-300 font-bold">
                    {Math.round(((currentIndex + 1) / eligibleRecipients.length) * 100)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIndex + 1) / eligibleRecipients.length) * 100}%` }}
                  />
                </div>

                {/* Countdown Timer Cooldown Indicator */}
                {countdownRemaining > 0 && (
                  <div className="p-2 bg-slate-800/90 border border-blue-900/60 rounded-lg flex items-center justify-between text-2xs text-blue-200 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-400 animate-spin" />
                      Giữ nhịp an toàn Webhook CNV (tránh spam / rate limit):
                    </span>
                    <strong className="text-amber-300 text-xs">{countdownRemaining} giây nữa...</strong>
                  </div>
                )}

                {/* Flight Stats Counter */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-slate-800 text-2xs">
                  <div>
                    <span className="text-slate-400 block">Thành công</span>
                    <strong className="text-emerald-400 text-sm font-mono">{successCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Chờ Zalo</span>
                    <strong className="text-amber-400 text-sm font-mono">{queuedCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Thất bại</span>
                    <strong className="text-red-400 text-sm font-mono">{failedCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Còn lại</span>
                    <strong className="text-blue-300 text-sm font-mono">{eligibleRecipients.length - (currentIndex + 1)}</strong>
                  </div>
                </div>
              </div>

              {/* Emergency Flight Controls */}
              <div className="flex items-center justify-between">
                <span className="text-2xs font-extrabold uppercase text-slate-500 tracking-wider">
                  Nhật Ký Gửi Trực Tiếp (Real-time Stream)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    leftIcon={isPaused ? <Play size={13} /> : <Pause size={13} />}
                    className="h-8 px-2.5 text-xs font-semibold"
                  >
                    {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleAbort}
                    leftIcon={<StopCircle size={13} />}
                    className="h-8 px-2.5 text-xs font-semibold"
                  >
                    Hủy khẩn cấp
                  </Button>
                </div>
              </div>

              {/* Streaming Logs Table */}
              <div className="max-h-[250px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-700 text-2xs">{log.code}</span>
                      <span className="text-slate-900 truncate font-medium">{log.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-slate-600 text-2xs">{log.phone}</span>
                      {log.status === 'SENDING' && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                          Đang gửi...
                        </span>
                      )}
                      {log.status === 'QUEUED' && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock size={11} className="text-amber-600 animate-spin" /> Chờ Zalo
                        </span>
                      )}
                      {log.status === 'SUCCESS' && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Thành công
                        </span>
                      )}
                      {log.status === 'FAILED' && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200" title={log.errorMsg}>
                          {log.errorMsg?.includes('(-118)') ? 'Chưa có Zalo (-118)' : `Lỗi: ${log.errorMsg?.slice(0, 25) || 'Thất bại'}`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* STAGE 3: POST-FLIGHT SUMMARY & RETRY ENGINE */}
          {stage === 'COMPLETED' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hoàn Tất Đợt Gửi ZNS Hàng Loạt</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Hệ thống đã điều phối gửi tuần tự và cập nhật lịch sử tương tác khách hàng thành công.
                </p>
              </div>

              {/* Summary Scoreboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-center">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-3xs uppercase font-bold text-emerald-700 block mb-0.5">Thành công</span>
                  <span className="text-lg font-black font-mono text-emerald-800">{successCount}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-3xs uppercase font-bold text-amber-700 block mb-0.5">Chờ Zalo xác nhận</span>
                  <span className="text-lg font-black font-mono text-amber-800">{queuedCount}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-3xs uppercase font-bold text-red-700 block mb-0.5">Thất bại</span>
                  <span className="text-lg font-black font-mono text-red-800">{failedCount}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Đã bỏ qua (Số bàn)</span>
                  <span className="text-lg font-black font-mono text-slate-700">{skippedLandlineCount + skippedNoPhoneCount}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-3xs text-slate-500 font-medium">
            {stage === 'PRE_FLIGHT' && `Dự kiến: ${eligibleRecipients.length * cooldownSeconds}s tổng thời gian an toàn.`}
            {stage === 'DISPATCHING' && 'Vui lòng không đóng tab trình duyệt khi đang gửi.'}
            {stage === 'COMPLETED' && 'Dữ liệu đã được đồng bộ tự động sang toàn bộ hệ thống.'}
          </div>

          <div className="flex items-center gap-2">
            {stage === 'PRE_FLIGHT' && (
              <>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Hủy bỏ
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  leftIcon={<Send size={13} />}
                  onClick={handleStartDispatch}
                  disabled={eligibleRecipients.length === 0}
                  className="font-bold cursor-pointer"
                >
                  Bắt đầu gửi ({eligibleRecipients.length} lượt)
                  {eligibleRecipients.some(r => r.isAlreadySent) && (
                    <span className="text-2xs font-normal opacity-90 ml-1">
                      ({eligibleRecipients.filter(r => !r.isAlreadySent).length} mới + {eligibleRecipients.filter(r => r.isAlreadySent).length} gửi lại)
                    </span>
                  )}
                </Button>
              </>
            )}

            {stage === 'COMPLETED' && (
              <Button variant="primary" size="sm" onClick={onClose} className="font-bold">
                Đóng & Hoàn Tất
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
