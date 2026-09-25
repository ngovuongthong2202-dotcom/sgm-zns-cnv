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
  History
} from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { znsMessagesRepo } from '@/src/data/repositories/system.repo';
import { useAuth } from '@/src/modules/iam';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdateCustomer?: (id: string, data: Partial<Customer>) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function CustomerZnsContactModal({
  isOpen,
  onClose,
  customer,
  onUpdateCustomer,
  onRefresh
}: Props) {
  const { userData } = useAuth();
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'sent' | 'unsent'>('all');

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

  // Extract all valid contacts of this customer
  const contactsList = useMemo<ContactItem[]>(() => {
    if (!customer) return [];
    if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
      const valid = customer.contacts.filter(c => c && (c.sdt || c.nguoiDaiDien));
      if (valid.length > 0) return valid;
    }
    // Fallback to primary customer fields
    if (customer.sdt || customer.nguoiDaiDien) {
      return [{
        danhXung: '',
        nguoiDaiDien: customer.nguoiDaiDien || '',
        sdt: customer.sdt || '',
        chucVu: '',
        chiNhanh: customer.chiNhanh || ''
      }];
    }
    return [];
  }, [customer]);

  // Map each phone to its ZNS logs and latest status
  const contactZnsMap = useMemo(() => {
    const map = new Map<string, {
      isSent: boolean;
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
        if (!info?.isSent) {
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
  }, [isOpen, contactsList]);

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

    const updatedContacts = Array.isArray(customer.contacts) ? [...customer.contacts] : [];
    const updatedHistory: Record<string, any> = { ...((customer as any).contactsZnsHistory || {}) };

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

        // Mark sent in contacts array
        const foundIdx = updatedContacts.findIndex(c => (c.sdt || '').trim() === phone);
        const nowIso = new Date().toISOString();
        if (foundIdx >= 0) {
          updatedContacts[foundIdx] = {
            ...updatedContacts[foundIdx],
            trangThaiZns: 'THANH_CONG',
            ngayGuiZns: nowIso
          };
        }

        updatedHistory[phone] = {
          status: 'SUCCESS',
          sentAt: nowIso,
          nguoiDaiDien: contact.nguoiDaiDien,
          chucVu: contact.chucVu
        };
      } catch (err: any) {
        failCount++;
        console.error(`Error sending ZNS to contact ${phone}:`, err);
      }
    }

    // Save updated contact statuses to customer document
    if (onUpdateCustomer && (successCount > 0)) {
      try {
        await onUpdateCustomer(customerId, {
          contacts: updatedContacts,
          contactsZnsHistory: updatedHistory,
          trangThaiGuiTinQuangCao: 'THANH_CONG'
        } as any);
        await onRefresh?.();
      } catch (e) {
        console.error('Failed to sync customer contact status:', e);
      }
    }

    setIsSending(false);
    if (successCount > 0) {
      notify.success(`Đã gửi thành công tin ZNS cho ${successCount} đầu mối liên hệ!`);
    }
    if (failCount > 0) {
      notify.error(`Có ${failCount} đầu mối gửi tin thất bại.`);
    }
  };

  const filteredContacts = contactsList.filter(ct => {
    const ph = (ct.sdt || '').trim();
    const info = contactZnsMap.get(ph);
    if (filterMode === 'sent') return info?.isSent;
    if (filterMode === 'unsent') return !info?.isSent;
    return true;
  });

  const totalCount = contactsList.length;
  const sentCount = contactsList.filter(ct => contactZnsMap.get((ct.sdt || '').trim())?.isSent).length;
  const unsentCount = totalCount - sentCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
                <Send size={16} />
              </div>
              <h2 className="text-base font-bold truncate">
                Gửi Tin ZNS Theo Đầu Mối Liên Hệ
              </h2>
            </div>
            <div className="flex items-center gap-2 text-2xs text-blue-100 flex-wrap">
              <span className="font-semibold text-white truncate max-w-xs">{customer.tenKhachHang}</span>
              <span>•</span>
              <span className="font-mono bg-blue-800/80 px-1.5 py-0.5 rounded border border-blue-700/50">{customer.maKh}</span>
              {customer.loaiKh && (
                <>
                  <span>•</span>
                  <span className="bg-blue-700/50 px-1.5 py-0.5 rounded">{customer.loaiKh}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            title="Đóng modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unsent')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                filterMode === 'unsent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              Chưa gửi ({unsentCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('sent')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                filterMode === 'sent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Đã gửi ({sentCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-2xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-blue-700 hover:underline font-semibold px-2 py-0.5"
            >
              Chọn tất cả
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={handleSelectUnsent}
              className="text-amber-700 hover:underline font-semibold px-2 py-0.5"
            >
              Chọn chưa gửi
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-500 hover:underline font-medium px-2 py-0.5"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
          {contactsList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <User size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Khách hàng chưa có đầu mối liên hệ</p>
              <p className="text-2xs text-slate-400">Vui lòng cập nhật thông tin người đại diện và số điện thoại trước khi gửi tin ZNS.</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-medium">
              Không có đầu mối liên hệ nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredContacts.map((contact, idx) => {
              const phone = (contact.sdt || '').trim();
              const isSelected = selectedPhones.has(phone);
              const znsInfo = contactZnsMap.get(phone);
              const isSent = znsInfo?.isSent;
              const isExpanded = expandedPhone === phone;

              return (
                <div
                  key={phone || idx}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-3.5 flex items-start gap-3.5">
                    {/* Checkbox */}
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(phone)}
                        disabled={!phone}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        id={`contact-check-${idx}`}
                      />
                    </div>

                    {/* Details */}
                    <label htmlFor={`contact-check-${idx}`} className="flex-1 min-w-0 cursor-pointer select-none space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {contact.nguoiDaiDien || `Đầu mối ${idx + 1}`}
                          </span>
                          {contact.chucVu && (
                            <span className="text-3xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                              {contact.chucVu}
                            </span>
                          )}
                        </div>

                        {/* ZNS Status Badge */}
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

                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                            {phone || 'Chưa có SĐT'}
                          </span>
                        </div>
                        {contact.chiNhanh && (
                          <div className="flex items-center gap-1 text-slate-500 text-2xs">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-xs">{contact.chiNhanh}</span>
                          </div>
                        )}
                        {znsInfo?.latestTime && (
                          <div className="text-2xs text-slate-400 ml-auto">
                            Lần gửi gần nhất: <strong className="text-slate-600">{new Date(znsInfo.latestTime).toLocaleString('vi-VN')}</strong>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Expand History Button */}
                    {znsInfo && znsInfo.messages.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPhone(isExpanded ? null : phone);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        title="Xem lịch sử gửi tin của đầu mối này"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Contact History */}
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

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Đã chọn: <strong className="text-blue-700 font-bold">{selectedPhones.size}</strong> / {contactsList.length} đầu mối
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSending}
              className="h-9 px-4 font-semibold"
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
              className="h-9 px-4 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>Gửi ZNS ({selectedPhones.size} đầu mối)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
