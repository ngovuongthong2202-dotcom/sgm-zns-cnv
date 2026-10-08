import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  ShieldCheck, 
  Copy, 
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';
import {
  VietQRBank,
  CompanyBankingConfig,
  fetchVietQRBankList,
  lookupAccountNumber,
  getCompanyBankingConfig,
  saveCompanyBankingConfig,
  DEFAULT_COMPANY_BANKING,
} from '@/src/shared/services/vietqrBankService';

export interface CompanyBankingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: CompanyBankingConfig) => void;
}

export function CompanyBankingConfigModal({
  isOpen,
  onClose,
  onSaved,
}: CompanyBankingConfigModalProps) {
  const [banks, setBanks] = useState<VietQRBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [config, setConfig] = useState<CompanyBankingConfig>(DEFAULT_COMPANY_BANKING);
  const [saving, setSaving] = useState<boolean>(false);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const initialize = async () => {
      try {
        const [savedConfig, bankList] = await Promise.all([
          getCompanyBankingConfig(),
          fetchVietQRBankList(),
        ]);
        if (mounted) {
          setConfig(savedConfig);
          setBanks(bankList);
        }
      } catch (err) {
        notify.error('Lỗi khi tải cấu hình ngân hàng.');
      } finally {
        if (mounted) setLoadingBanks(false);
      }
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const filteredBanks = useMemo(() => {
    if (!searchTerm.trim()) return banks;
    const term = searchTerm.toLowerCase();
    return banks.filter(
      (b) =>
        b.shortName.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        b.bin.includes(term)
    );
  }, [banks, searchTerm]);

  const selectedBank = useMemo(() => {
    return banks.find((b) => b.bin === config.bankBin) || null;
  }, [banks, config.bankBin]);

  const handleSelectBank = (bank: VietQRBank) => {
    setConfig((prev) => ({
      ...prev,
      bankBin: bank.bin,
      bankCode: bank.code,
      bankName: bank.name,
      bankShortName: bank.shortName,
      bankLogo: bank.logo,
    }));
    setIsDropdownOpen(false);
    setSearchTerm('');
    setLookupFeedback(null);
  };

  const handleLookupAccount = async () => {
    if (!config.bankBin) {
      notify.warning('Vui lòng chọn ngân hàng trước khi tra cứu.');
      return;
    }
    const cleanAcc = config.accountNumber.replace(/\s+/g, '').trim();
    if (!cleanAcc) {
      notify.warning('Vui lòng nhập số tài khoản ngân hàng.');
      return;
    }

    setIsLookingUp(true);
    setLookupFeedback(null);

    try {
      const res = await lookupAccountNumber(config.bankBin, cleanAcc, {
        clientId: config.vietqrClientId,
        apiKey: config.vietqrApiKey,
      });

      if (res.success && res.accountName) {
        setConfig((prev) => ({
          ...prev,
          accountHolder: res.accountName!.toUpperCase(),
        }));
        setLookupFeedback({ success: true, message: `Xác thực thành công: ${res.accountName}` });
        notify.success('Đã xác thực số tài khoản qua Napas 24/7!');
      } else {
        setLookupFeedback({ success: false, message: res.message || 'Không thể tra cứu số tài khoản.' });
        if (res.message?.includes('Client ID & API Key')) {
          notify.info('Chưa cấu hình VietQR API Key. Bạn có thể nhập trực tiếp tên chủ tài khoản.');
        } else {
          notify.warning(res.message || 'Tra cứu không thành công.');
        }
      }
    } catch (err: any) {
      setLookupFeedback({ success: false, message: err.message || 'Lỗi tra cứu tài khoản.' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = async () => {
    if (!config.accountNumber.trim()) {
      notify.warning('Vui lòng nhập số tài khoản.');
      return;
    }
    if (!config.accountHolder.trim()) {
      notify.warning('Vui lòng nhập tên chủ tài khoản.');
      return;
    }

    setSaving(true);
    try {
      await saveCompanyBankingConfig(config);
      notify.success('Đã lưu cấu hình tài khoản nhận tiền SGM thành công!');
      if (onSaved) onSaved(config);
      onClose();
    } catch (err) {
      notify.error('Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Cấu Hình Tài Khoản Nhận Tiền SGM
              </h3>
              <p className="text-3xs text-slate-500">
                Tích hợp API VietQR & Napas 24/7 (Đồng bộ Realtime)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Bank Select */}
          <div className="space-y-1.5 relative">
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
              Ngân Hàng Thụ Hưởng <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
            >
              {selectedBank ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedBank.logo && (
                    <img
                      src={selectedBank.logo}
                      alt={selectedBank.shortName}
                      className="w-8 h-6 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {selectedBank.shortName} - {selectedBank.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Chọn ngân hàng từ danh sách VietQR...</span>
              )}
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên ngân hàng, mã, BIN..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="overflow-y-auto divide-y divide-slate-100 max-h-44">
                  {loadingBanks ? (
                    <div className="p-3 text-center text-xs text-slate-500">Đang tải ngân hàng...</div>
                  ) : (
                    filteredBanks.map((bank) => (
                      <div
                        key={bank.id}
                        onClick={() => handleSelectBank(bank)}
                        className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors"
                      >
                        <img
                          src={bank.logo}
                          alt={bank.shortName}
                          className="w-7 h-5 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800">
                            {bank.shortName} <span className="text-3xs text-slate-500 font-sans tabular-nums">({bank.bin})</span>
                          </div>
                          <div className="text-3xs text-slate-500 truncate">{bank.name}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Number with Lookup */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
              Số Tài Khoản <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.accountNumber}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, accountNumber: e.target.value }));
                  setLookupFeedback(null);
                }}
                placeholder="Nhập số tài khoản..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-bold text-slate-900 font-sans tabular-nums"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleLookupAccount}
                disabled={isLookingUp}
                className="px-3 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLookingUp ? 'Đang tra cứu...' : 'Tra cứu STK'}
              </Button>
            </div>

            {lookupFeedback && (
              <div
                className={`text-2xs p-2 rounded-lg flex items-center gap-1.5 border ${
                  lookupFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {lookupFeedback.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span>{lookupFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Account Holder */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
              Tên Chủ Tài Khoản (Đơn vị thụ hưởng) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.accountHolder}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, accountHolder: e.target.value.toUpperCase() }))
              }
              placeholder="CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-bold text-slate-900 font-sans uppercase"
            />
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
              Chi Nhánh Ngân Hàng
            </label>
            <input
              type="text"
              value={config.branch}
              onChange={(e) => setConfig((prev) => ({ ...prev, branch: e.target.value }))}
              placeholder="Chi nhánh Tây Sài Gòn - TP.HCM"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="border-slate-200 text-slate-700 text-xs font-medium"
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
