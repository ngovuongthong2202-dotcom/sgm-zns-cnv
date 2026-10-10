import React, { useState, useEffect, useMemo } from 'react';
import { Customer, ContactItem } from '@/src/domain/schema/customer.schema';
import { Button } from '@/src/design-system/Button';
import { 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Building2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  History,
  Search,
  ShieldCheck,
  Check,
  Smartphone
} from 'lucide-react';
import { UniversalZnsPreviewModal } from '@/src/platform/ui/zns/UniversalZnsPreviewModal';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { znsMessagesRepo } from '@/src/data/repositories/system.repo';
import { useAuth } from '@/src/modules/iam';
import { extractVietnamesePhones } from '../utils/vietnameseTelecomExtractor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onRefresh?: () => Promise<void>;
}

export function CustomerZnsContactModal({
  isOpen,
  onClose,
  customer,
  onRefresh
}: Props) {
  const { userData } = useAuth();
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendingSinglePhone, setSendingSinglePhone] = useState<string | null>(null);
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'sent' | 'unsent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Load message logs from zns_messages for this customer
  useEffect(() => {
    if (!isOpen || !customer?.id) return;
    const unsub = znsMessagesRepo.subscribe(
      { fkField: 'entityId', fkId: customer.id, limit: 100 },
      (data) => {
        setContactMessages(data || []);
      }
    );
    return () => unsub();
  }, [isOpen, customer?.id]);

  // Extract all valid contacts of this customer, disambiguating composite phones and omitting landlines
  const contactsList = useMemo<ContactItem[]>(() => {
    if (!customer) return [];
    const rawList: ContactItem[] = [];
    if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
      const valid = customer.contacts.filter(c => c && (c.sdt || c.nguoiDaiDien));
      if (valid.length > 0) rawList.push(...valid);
    }
    // Fallback to primary customer fields
    if (rawList.length === 0 && (customer.sdt || customer.nguoiDaiDien)) {
      rawList.push({
        danhXung: '',
        nguoiDaiDien: customer.nguoiDaiDien || '',
        sdt: customer.sdt || '',
        chucVu: '',
        chiNhanh: customer.chiNhanh || ''
      });
    }

    // Disambiguate composite phones and strictly prune landlines for ZNS
    const processed: ContactItem[] = [];
    for (const raw of rawList) {
      if (!raw.sdt) {
        processed.push(raw);
        continue;
      }
      const ext = extractVietnamesePhones(raw.sdt, customer.diaChi);
      if (ext.mobilePhones.length > 0) {
        // Unpack each valid mobile number into its own selectable contact
        ext.mobilePhones.forEach(m => {
          processed.push({
            ...raw,
            sdt: m.cleaned,
            chucVu: raw.chucVu ? `${raw.chucVu} (${m.carrier || 'Di động'})` : (m.carrier ? `Di động ${m.carrier}` : raw.chucVu)
          });
        });
      } else if (ext.landlinePhones.length > 0) {
        // Landline only: Do not include in ZNS recipients to prevent failed sends
        continue;
      } else {
        processed.push(raw);
      }
    }
    return processed;
  }, [customer]);

  // Map each phone to its ZNS logs and latest status
  const contactZnsMap = useMemo(() => {
    const map = new Map<string, {
      isSent: boolean;
      pending: boolean;
      status: string;
      latestTime: string | null;
      messages: any[];
    }>();

    contactsList.forEach(ct => {
      const phone = (ct.sdt || '').trim();
      if (!phone) return;

      // Find matching messages in znsMessages
      const matchedMsgs = contactMessages.filter(m => {
        const mPhone = (m.phone || m.data?.phone || '').trim();
        return mPhone && (mPhone === phone || mPhone.endsWith(phone.slice(-9)) || phone.endsWith(mPhone.slice(-9)));
      });

      // Also check customer's internal history
      const savedHistory = (customer as any)?.contactsZnsHistory?.[phone];
      const hasSentContact = ct.trangThaiZns === 'THANH_CONG' || Boolean(ct.ngayGuiZns) || Boolean(savedHistory);

      const hasSuccessMsg = matchedMsgs.some(m => String(m.status || '').toUpperCase() === 'SUCCESS');
      // Tin đang trên đường đi (chưa có kết quả từ Zalo): không coi là đã gửi, nhưng cũng không chọn sẵn để tránh gửi đúp
      const hasPendingMsg = matchedMsgs.some(m => ['INIT', 'SENDING', 'SENT_WAITING'].includes(String(m.status || '').toUpperCase()));
      const isSent = hasSuccessMsg || hasSentContact;

      let latestTime: string | null = null;
      if (matchedMsgs.length > 0) {
        latestTime = matchedMsgs[0].createdAt || matchedMsgs[0].timestamp || null;
      } else if (ct.ngayGuiZns) {
        latestTime = ct.ngayGuiZns;
      } else if (savedHistory?.sentAt) {
        latestTime = savedHistory.sentAt;
      }

      map.set(phone, {
        isSent,
        pending: hasPendingMsg,
        status: isSent ? 'SUCCESS' : (matchedMsgs[0]?.status || 'CHUA_GUI'),
        latestTime,
        messages: matchedMsgs
      });
    });

    return map;
  }, [contactsList, contactMessages, customer]);

  // Initialize selected phones (defaults to unsent contacts)
  useEffect(() => {
    if (!isOpen) return;
    const initial = new Set<string>();
    contactsList.forEach(ct => {
      const ph = (ct.sdt || '').trim();
      if (ph) {
        const info = contactZnsMap.get(ph);
        if (!info?.isSent && !info?.pending) {
          initial.add(ph);
        }
      }
    });
    // If all are already sent or none unsent, select all by default
    if (initial.size === 0) {
      contactsList.forEach(ct => {
        const ph = (ct.sdt || '').trim();
        if (ph) initial.add(ph);
      });
    }
    setSelectedPhones(initial);
  }, [isOpen, contactsList, contactZnsMap]);

  if (!isOpen || !customer) return null;

  const handleToggleSelect = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    setSelectedPhones(next);
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    contactsList.forEach(ct => {
      const ph = (ct.sdt || '').trim();
      if (ph) all.add(ph);
    });
    setSelectedPhones(all);
  };

  const handleSelectUnsent = () => {
    const unsent = new Set<string>();
    contactsList.forEach(ct => {
      const ph = (ct.sdt || '').trim();
      if (ph && !contactZnsMap.get(ph)?.isSent) {
        unsent.add(ph);
      }
    });
    setSelectedPhones(unsent);
  };

  const handleDeselectAll = () => {
    setSelectedPhones(new Set());
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1500);
  };

  // Gửi riêng lẻ 1 đầu mối tức thời (Single-contact direct dispatch)
  const handleSendSingleContact = async (contact: ContactItem) => {
    const phone = (contact.sdt || '').trim();
    if (!phone) {
      notify.error('Đầu mối này chưa có số điện thoại.');
      return;
    }
    const customerId = customer.id || customer.maKh;
    if (!customerId) return;

    setSendingSinglePhone(phone);
    try {
      await sendZnsAndToast({
        entityId: customerId,
        entityType: 'CUSTOMER',
        messageType: ZnsMessageType.CUSTOMER_PRE_QUOTE,
        phone: phone,
        payload: {
          ...customer,
          tenZns: customer.tenZns,
          customer_name: customer.tenZns || customer.tenKhachHang,
          sdt: phone,
          phone: phone,
          nguoiDaiDien: contact.nguoiDaiDien || customer.nguoiDaiDien || '',
          chucVu: contact.chucVu || ''
        },
        attemptBucket: nextAttempt(customer.trangThaiGuiTinQuangCao as string | undefined),
        userRole: userData?.role,
        forceResend: true
      }, `Đang gửi tin ZNS đến ${contact.nguoiDaiDien || phone}...`);

      notify.info(`Đã gửi lệnh ZNS tới ${contact.nguoiDaiDien || phone}. Kết quả sẽ cập nhật khi Zalo phản hồi.`);
    } catch (err) {
      console.error(`Error sending ZNS to contact ${phone}:`, err);
    } finally {
      setSendingSinglePhone(null);
    }
  };

  // Gửi hàng loạt các đầu mối được chọn (Batch dispatch)
  const handleSendSelected = async () => {
    const selectedContacts = contactsList.filter(ct => ct.sdt && selectedPhones.has(ct.sdt.trim()));
    if (selectedContacts.length === 0) {
      notify.warning('Vui lòng chọn ít nhất 1 đầu mối liên hệ để gửi tin ZNS.');
      return;
    }

    const customerId = customer.id || customer.maKh;
    if (!customerId) {
      notify.error('Lỗi: Khách hàng không có mã định danh.');
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const contact of selectedContacts) {
      const phone = (contact.sdt || '').trim();
      if (!phone) continue;

      try {
        await sendZnsAndToast({
          entityId: customerId,
          entityType: 'CUSTOMER',
          messageType: ZnsMessageType.CUSTOMER_PRE_QUOTE,
          phone: phone,
          payload: {
            ...customer,
            tenZns: customer.tenZns,
            customer_name: customer.tenZns || customer.tenKhachHang,
            sdt: phone,
            phone: phone,
            nguoiDaiDien: contact.nguoiDaiDien || customer.nguoiDaiDien || '',
            chucVu: contact.chucVu || ''
          },
          attemptBucket: nextAttempt(customer.trangThaiGuiTinQuangCao as string | undefined),
          userRole: userData?.role,
          forceResend: true
        }, `Đang gửi tin ZNS đến ${contact.nguoiDaiDien || phone}...`);

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`Error sending ZNS to contact ${phone}:`, err);
      }
    }

    setIsSending(false);
    if (successCount > 0) {
      notify.info(`Đã gửi lệnh ZNS tới ${successCount} đầu mối. Kết quả sẽ cập nhật khi Zalo phản hồi.`);
    }
  };

  // Filter contacts by tab and search query
  const filteredContacts = contactsList.filter(ct => {
    const ph = (ct.sdt || '').trim();
    const info = contactZnsMap.get(ph);
    if (filterMode === 'sent' && !info?.isSent) return false;
    if (filterMode === 'unsent' && info?.isSent) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (ct.nguoiDaiDien || '').toLowerCase();
      const role = (ct.chucVu || '').toLowerCase();
      const branch = (ct.chiNhanh || '').toLowerCase();
      const phone = (ct.sdt || '').toLowerCase();
      return name.includes(q) || role.includes(q) || branch.includes(q) || phone.includes(q);
    }
    return true;
  });

  const totalCount = contactsList.length;
  const sentCount = contactsList.filter(ct => contactZnsMap.get((ct.sdt || '').trim())?.isSent).length;
  const unsentCount = totalCount - sentCount;

  // Lấy avatar chữ cái đầu cho đầu mối
  const getAvatarLetter = (name?: string, idx: number = 0) => {
    if (!name) return `Đ${idx + 1}`;
    const clean = name.trim().split(' ');
    const lastWord = clean[clean.length - 1];
    return lastWord ? lastWord.charAt(0).toUpperCase() : `Đ${idx + 1}`;
  };

  // Màu sắc avatar theo chức vụ
  const getRoleBadgeColor = (role?: string) => {
    if (!role) return 'bg-slate-100 text-slate-700 border-slate-200';
    const r = role.toLowerCase();
    if (r.includes('giám đốc') || r.includes('lãnh đạo') || r.includes('chủ')) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (r.includes('kế toán') || r.includes('tài chính')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (r.includes('kỹ thuật') || r.includes('xưởng') || r.includes('vận hành')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (r.includes('thu mua') || r.includes('kinh doanh')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. EXECUTIVE HEADER (SLATE-950 SIÊU TƯƠNG PHẢN & ĐẲNG CẤP DOANH NGHIỆP) */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between shrink-0 shadow-sm">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-inner">
                <Send size={16} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight leading-tight flex items-center gap-2">
                  <span>Gửi Tin ZNS Theo Đầu Mối Liên Hệ</span>
                  <span className="text-3xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Studio
                  </span>
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-2xs text-slate-300 flex-wrap">
              <span className="font-bold text-white truncate max-w-xs">{customer.tenKhachHang}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono bg-slate-800/90 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                {customer.maKh}
              </span>
              {customer.loaiKh && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-medium">
                    {customer.loaiKh}
                  </span>
                </>
              )}
              <span className="font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/40 font-bold flex items-center gap-1">
                ID MẪU ZBS: #533060
              </span>
              <span className="text-slate-400 font-medium">THÔNG TIN GIẢI PHÁP MÁY CÔNG NGHIỆP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="subtle"
              size="xs"
              onClick={() => setPreviewModalOpen(true)}
              className="bg-blue-600/30 text-blue-300 border border-blue-400/40 hover:bg-blue-600/50 text-2xs font-bold flex items-center gap-1.5 h-8 px-3"
            >
              <Smartphone size={13} />
              <span>Xem trước mẫu ZBS (#533060)</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Đóng modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOOLBAR & INSTANT SEARCH & FILTER TABS                                 */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Ô tìm kiếm tức thời */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, chức vụ..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Bộ lọc trạng thái & Phím chọn nhanh */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unsent')}
                className={`px-2 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer ${
                  filterMode === 'unsent'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Chưa gửi ({unsentCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('sent')}
                className={`px-2 py-1 rounded-md text-2xs font-bold transition-all cursor-pointer ${
                  filterMode === 'sent'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Đã gửi ({sentCount})
              </button>
            </div>

            <div className="flex items-center gap-1 text-2xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-700 hover:text-blue-800 font-semibold px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Chọn hết
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-700 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DANH SÁCH ĐẦU MỐI LIÊN HỆ ĐA CHIỀU (SMART CONTACT CARDS)             */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 min-h-0 bg-slate-50/50">
          {contactsList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-white rounded-xl border border-slate-200 p-8">
              <User size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Khách hàng chưa có đầu mối liên hệ</p>
              <p className="text-2xs text-slate-400">Vui lòng cập nhật thông tin người đại diện và số điện thoại trước khi gửi tin ZNS.</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-white rounded-xl border border-slate-200 p-8">
              <Search size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Không tìm thấy đầu mối liên hệ nào phù hợp</p>
              <p className="text-2xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc chuyển sang tab "Tất cả".</p>
            </div>
          ) : (
            filteredContacts.map((contact, idx) => {
              const phone = (contact.sdt || '').trim();
              const isSelected = selectedPhones.has(phone);
              const znsInfo = contactZnsMap.get(phone);
              const isSent = znsInfo?.isSent;
              const isExpanded = expandedPhone === phone;
              const isPrimaryContact = idx === 0 || contact.nguoiDaiDien === customer.nguoiDaiDien;
              const isCurrentlySendingSingle = sendingSinglePhone === phone;

              return (
                <div
                  key={phone || idx}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-white shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-3.5 flex items-start gap-3">
                    {/* Checkbox chọn hàng loạt */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(phone)}
                        disabled={!phone || isSending}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        id={`contact-check-${idx}`}
                      />
                    </div>

                    {/* Avatar Chữ cái theo chức vụ */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-200 shrink-0 font-mono">
                      {getAvatarLetter(contact.nguoiDaiDien, idx)}
                    </div>

                    {/* Chi tiết Đầu Mối */}
                    <label htmlFor={`contact-check-${idx}`} className="flex-1 min-w-0 cursor-pointer select-none space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {contact.nguoiDaiDien || `Đầu mối ${idx + 1}`}
                          </span>
                          
                          {/* Huy hiệu Người đại diện chính */}
                          {isPrimaryContact && (
                            <span className="inline-flex items-center gap-0.5 text-3xs font-extrabold bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded border border-blue-200 uppercase">
                              <ShieldCheck size={10} className="text-blue-600" /> Chính
                            </span>
                          )}

                          {/* Chức vụ */}
                          {contact.chucVu && (
                            <span className={`text-3xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(contact.chucVu)}`}>
                              {contact.chucVu}
                            </span>
                          )}
                        </div>

                        {/* Huy hiệu Trạng Thái ZNS */}
                        <div className="flex items-center gap-1.5">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Đã gửi ZNS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} className="text-amber-600" />
                              <span>Chưa gửi</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Số điện thoại, Chi nhánh & Thời gian gửi gần nhất */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1 font-mono">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 text-2xs">
                            {phone || 'Chưa có SĐT'}
                          </span>
                          {phone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCopyPhone(phone);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-0.5"
                              title="Sao chép SĐT"
                            >
                              {copiedPhone === phone ? <Check size={11} className="text-emerald-600" /> : <span className="text-3xs text-slate-400 hover:underline">Copy</span>}
                            </button>
                          )}
                        </div>

                        {contact.chiNhanh && (
                          <div className="flex items-center gap-1 text-slate-500 text-2xs">
                            <Building2 size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-xs">{contact.chiNhanh}</span>
                          </div>
                        )}

                        {znsInfo?.latestTime && (
                          <div className="text-3xs text-slate-400 ml-auto">
                            Gửi gần nhất: <strong className="text-slate-600">{new Date(znsInfo.latestTime).toLocaleString('vi-VN')}</strong>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Cụm hành động nhanh: Nút gửi ngay + Mở lịch sử */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {phone && (
                        <button
                          type="button"
                          onClick={() => handleSendSingleContact(contact)}
                          disabled={isSending || isCurrentlySendingSingle}
                          className="h-7 px-2.5 text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                          title="Gửi riêng đầu mối này"
                        >
                          <Send size={11} className={isCurrentlySendingSingle ? 'animate-spin' : ''} />
                          <span>{isCurrentlySendingSingle ? 'Đang gửi...' : 'Gửi ngay'}</span>
                        </button>
                      )}

                      {znsInfo && znsInfo.messages.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPhone(isExpanded ? null : phone);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                          title="Xem lịch sử gửi tin của đầu mối này"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lịch sử gửi tin mở rộng */}
                  {isExpanded && znsInfo && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                        <History size={12} /> Lịch sử gửi tin ZNS ({znsInfo.messages.length} lần gửi)
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {znsInfo.messages.map((m: any, mIdx: number) => (
                          <div key={m.id || mIdx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-2xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 block">
                                {m.templateName || m.templateId || 'Tin nhắn Zalo ZNS'}
                              </span>
                              <span className="text-3xs text-slate-400 font-mono">
                                Tracking: {m.trackingId || m.id}
                              </span>
                            </div>
                            <div className="text-right space-y-0.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-3xs font-extrabold uppercase ${
                                String(m.status).toUpperCase() === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {m.status}
                              </span>
                              <span className="block text-3xs text-slate-400">
                                {new Date(m.createdAt || m.timestamp).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER: BỘ ĐIỀU PHỐI HÀNH ĐỘNG GỬI HÀNG LOẠT (EXECUTIVE ACTION BAR)   */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            Đã chọn: <strong className="text-blue-700 font-bold text-sm">{selectedPhones.size}</strong> / {contactsList.length} đầu mối
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSending}
              className="h-9 px-4 font-semibold text-xs"
            >
              Đóng
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSendSelected}
              isLoading={isSending}
              disabled={isSending || selectedPhones.size === 0}
              className="h-9 px-4 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Send size={13} />
              <span>Gửi ZNS ({selectedPhones.size} đầu mối)</span>
            </Button>
          </div>
        </div>
      </div>

      {previewModalOpen && customer && (
        <UniversalZnsPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          messageType={ZnsMessageType.CUSTOMER_PRE_QUOTE}
          entityType="CUSTOMER"
          entityId={customer.id || customer.maKh || ''}
          documentCode={customer.maKh}
          customerName={customer.tenZns || customer.tenKhachHang}
          phone={contactsList[0]?.sdt || customer.sdt}
          payload={{
            ...customer,
            customerId: customer.id || customer.maKh,
            tenKhachHang: customer.tenKhachHang,
            tenZns: customer.tenZns,
            sdt: contactsList[0]?.sdt || customer.sdt
          }}
          availablePhones={contactsList.filter(c => !!c.sdt).map(c => ({ phone: c.sdt as string, label: c.nguoiDaiDien || c.chucVu }))}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </div>
  );
}
