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
  ExternalLink,
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

export default function BankingPage() {
  const [banks, setBanks] = useState<VietQRBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [config, setConfig] = useState<CompanyBankingConfig>(DEFAULT_COMPANY_BANKING);
  const [saving, setSaving] = useState<boolean>(false);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing configuration and live bank list
  useEffect(() => {
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
  }, []);

  // Filter bank list by search term
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

  // Selected bank object
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
          notify.info('Chưa có VietQR API Key. Bạn có thể nhập trực tiếp tên chủ tài khoản bên dưới.');
        } else {
          notify.warning(res.message || 'Tra cứu không thành công.');
        }
      }
    } catch (err: any) {
      setLookupFeedback({ success: false, message: err.message || 'Lỗi tra cứu tài khoản.' });
      notify.error('Lỗi kết nối API tra cứu.');
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
    if (!config.bankName.trim()) {
      notify.warning('Vui lòng chọn ngân hàng thụ hưởng.');
      return;
    }

    setSaving(true);
    try {
      await saveCompanyBankingConfig(config);
      notify.success('Đã lưu cấu hình tài khoản ngân hàng SGM thành công!');
    } catch (err) {
      notify.error('Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setConfig(DEFAULT_COMPANY_BANKING);
    setLookupFeedback(null);
    notify.info('Đã hoàn nguyên về thông tin ngân hàng mặc định của SGM.');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    notify.success(`Đã sao chép ${label}!`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header Banner - Clean Light Industrial */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cấu Hình Tài Khoản Ngân Hàng Doanh Nghiệp</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" /> VietQR & Napas 24/7
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-0.5">
              Thông tin thụ hưởng chính thức áp dụng trên Cổng Tra Cứu Khách Hàng, Hợp Đồng Kinh Tế và Chứng Từ Xuất Xưởng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mặc định
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Bank Config Fields */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Thông Tin Tài Khoản Thụ Hưởng
            </h3>

            {/* Bank Selector with VietQR Search Dropdown */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ngân Hàng Thụ Hưởng <span className="text-red-500">*</span>
              </label>

              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
              >
                {selectedBank ? (
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedBank.logo && (
                      <img
                        src={selectedBank.logo}
                        alt={selectedBank.shortName}
                        className="w-10 h-7 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2 truncate">
                        <span>{selectedBank.shortName}</span>
                        <span className="text-3xs font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 tabular-nums">
                          BIN {selectedBank.bin}
                        </span>
                      </div>
                      <div className="text-2xs text-slate-700 truncate">{selectedBank.name}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">Chọn ngân hàng từ danh sách VietQR...</span>
                )}
                <Search className="w-4 h-4 text-slate-600 shrink-0" />
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo tên ngân hàng, mã, BIN..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100 max-h-52">
                    {loadingBanks ? (
                      <div className="p-4 text-center text-xs text-slate-700">Đang tải danh sách ngân hàng...</div>
                    ) : filteredBanks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-700">Không tìm thấy ngân hàng phù hợp.</div>
                    ) : (
                      filteredBanks.map((bank) => (
                        <div
                          key={bank.id}
                          onClick={() => handleSelectBank(bank)}
                          className="p-2.5 hover:bg-blue-50/60 cursor-pointer flex items-center gap-3 transition-colors"
                        >
                          <img
                            src={bank.logo}
                            alt={bank.shortName}
                            className="w-9 h-6 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <span>{bank.shortName}</span>
                              <span className="text-3xs text-slate-600 font-sans tabular-nums">({bank.code})</span>
                            </div>
                            <div className="text-2xs text-slate-700 truncate">{bank.name}</div>
                          </div>
                          <span className="text-3xs text-slate-600 font-sans tabular-nums px-1.5 py-0.5 bg-slate-100 rounded">
                            {bank.bin}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Number with Lookup Action */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Số Tài Khoản Ngân Hàng <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.accountNumber}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, accountNumber: e.target.value }));
                    setLookupFeedback(null);
                  }}
                  placeholder="Ví dụ: 0302636521001"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-bold text-slate-900 font-sans tabular-nums transition-colors"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLookupAccount}
                  disabled={isLookingUp}
                  className="px-3.5 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  {isLookingUp ? 'Đang tra cứu...' : 'Tra cứu STK'}
                </Button>
              </div>

              {lookupFeedback && (
                <div
                  className={`text-2xs p-2.5 rounded-lg flex items-start gap-2 border leading-relaxed ${
                    lookupFeedback.success
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50/80 border-amber-200 text-amber-800'
                  }`}
                >
                  {lookupFeedback.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{lookupFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Account Holder Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tên Chủ Tài Khoản (Đơn vị thụ hưởng) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.accountHolder}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, accountHolder: e.target.value.toUpperCase() }))
                }
                placeholder="Ví dụ: CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-bold text-slate-900 font-sans transition-colors uppercase"
              />
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Chi Nhánh Ngân Hàng
              </label>
              <input
                type="text"
                value={config.branch}
                onChange={(e) => setConfig((prev) => ({ ...prev, branch: e.target.value }))}
                placeholder="Ví dụ: Chi nhánh Tây Sài Gòn - TP.HCM"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-medium text-slate-800 font-sans transition-colors"
              />
            </div>

            {/* Transfer Syntax Template */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mẫu Cú Pháp Chuyển Khoản Mặc Định
              </label>
              <input
                type="text"
                value={config.defaultTransferSyntaxTemplate || 'TT HD {SO_HOP_DONG} {SO_DIEN_THOAI}'}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, defaultTransferSyntaxTemplate: e.target.value }))
                }
                placeholder="TT HD {SO_HOP_DONG} {SO_DIEN_THOAI}"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-xl text-xs font-semibold text-slate-800 font-sans transition-colors"
              />
              <p className="text-3xs text-slate-600">
                Tham số hỗ trợ: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-sans">{'{SO_HOP_DONG}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-sans">{'{SO_DIEN_THOAI}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-sans">{'{MA_DON_HANG}'}</code>
              </p>
            </div>
          </div>

          {/* Optional VietQR Credentials Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cấu Hình Kết Nối API VietQR (Tùy Chọn)
              </h3>
              <a
                href="https://vietqr.io"
                target="_blank"
                rel="noreferrer"
                className="text-2xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                Đăng ký tài khoản VietQR <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-2xs text-slate-700 leading-relaxed">
              Nhập mã Client ID và API Key nếu doanh nghiệp có tài khoản đối tác VietQR / Casso để tra cứu xác thực số tài khoản trực tuyến 24/7 qua cổng Napas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-slate-600">VietQR Client ID</label>
                <input
                  type="text"
                  value={config.vietqrClientId || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, vietqrClientId: e.target.value }))}
                  placeholder="Nhập client_id..."
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-slate-600">VietQR API Key</label>
                <input
                  type="password"
                  value={config.vietqrApiKey || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, vietqrApiKey: e.target.value }))}
                  placeholder="Nhập api_key..."
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Card: Live Corporate Wire Instruction Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">Xem Trước Giao Diện Khách Hàng</span>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Pháp Nhân Chính Thức SGM
                </span>
              </div>

              {/* Card Container - Light Industrial Wire Aesthetic */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
                {/* Bank Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {config.bankLogo ? (
                      <img
                        src={config.bankLogo}
                        alt={config.bankShortName}
                        className="w-12 h-8 object-contain rounded bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        SGM
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {config.bankShortName || 'Ngân hàng thụ hưởng'}
                      </div>
                      <div className="text-3xs text-slate-600 leading-snug">
                        {config.branch || 'Hội sở chính / Chi nhánh'}
                      </div>
                    </div>
                  </div>
                  <span className="text-3xs font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded uppercase tracking-wider">
                    {config.bankCode || 'VCB'}
                  </span>
                </div>

                {/* Account Number Box */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="text-3xs uppercase font-semibold text-slate-600 tracking-wider">
                    Số Tài Khoản Thụ Hưởng
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900 font-sans tracking-tight tabular-nums">
                      {config.accountNumber || '0302636521001'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(config.accountNumber, 'Số tài khoản')}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Account Holder */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="text-3xs uppercase font-semibold text-slate-600 tracking-wider">
                    Đơn Vị Thụ Hưởng
                  </div>
                  <div className="text-xs font-bold text-slate-900 uppercase font-sans">
                    {config.accountHolder || 'CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN'}
                  </div>
                </div>

                {/* Transfer Note Sample */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="text-3xs uppercase font-semibold text-slate-600 tracking-wider">
                    Cú Pháp Ủy Nhiệm Chi Mẫu
                  </div>
                  <div className="text-xs font-semibold text-blue-900 font-sans tabular-nums">
                    TT HD 0007/2026/HDKT 0901828492
                  </div>
                </div>

                {/* Safety Guarantee Callout */}
                <div className="flex items-start gap-2 text-2xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Chỉ thực hiện chuyển khoản đến đúng tài khoản pháp nhân nêu trên. Kế toán SGM sẽ đối soát và gửi thông báo xác nhận tự động trong 15 phút.
                  </span>
                </div>
              </div>

              {/* Status summary */}
              <div className="text-2xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Trạng thái API Ngân Hàng:</span>
                  <span className="font-semibold text-emerald-600">Đang hoạt động (Napas 24/7)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng số ngân hàng hỗ trợ:</span>
                  <span className="font-semibold font-sans tabular-nums text-slate-800">{banks.length || 55} ngân hàng</span>
                </div>
                <div className="flex justify-between">
                  <span>Cập nhật gần nhất:</span>
                  <span className="font-sans tabular-nums text-slate-800">
                    {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
