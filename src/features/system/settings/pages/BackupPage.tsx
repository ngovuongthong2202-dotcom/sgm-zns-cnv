 
import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { useConfirm } from '@/src/design-system/Confirm';

import { Download, HardDrive, RefreshCw, Database, Eye, CheckCircle, Trash2 } from 'lucide-react';
import { settingsRepo, repositoryFactory } from '@/src/data/repositories';

import { Button } from '@/src/design-system/Button';
import { Switch } from '@/src/design-system';
import DataStandardizationPanel from '../components/DataStandardizationPanel';

export default function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const { confirm } = useConfirm();
  
  const [backupInfo, setBackupInfo] = useState<any>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);

  useEffect(() => {
    const unsub = settingsRepo.subscribeSettings<any>('backupInfo', (doc) => {
      if (doc) {
        setBackupInfo(doc);
        setAutoBackupEnabled(!!doc.autoBackupEnabled);
      }
    });
    return () => unsub();
  }, []);

  const toggleAutoBackup = async () => {
    try {
      const newValue = !autoBackupEnabled;
      await settingsRepo.setSettings('backupInfo', { autoBackupEnabled: newValue }, true);
      notify.success(newValue ? 'Đã bật sao lưu tự động định kỳ' : 'Đã tắt sao lưu tự động');
    } catch (e: any) {
      notify.error('Lỗi khi cấu hình sao lưu tự động: ' + e.message);
    }
  };

  // Maintenance states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    scannedCount: number;
    affectedDocs: Array<{ id: string; name: string; code: string; score: any }>;
    isDryRun: boolean;
    executed: boolean;
  } | null>(null);

  const exportTimeoutRef = React.useRef<any>(null);
  React.useEffect(() => {
    return () => {
      if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current);
    };
  }, []);

  const handleExport = async () => {
    if (!(await confirm({
      title: 'Tải xuống JSON Backup',
      message: 'Hệ thống sẽ tổng hợp toàn bộ dữ liệu hiện thực hiện có (Khách hàng, Báo giá, Hợp đồng, Thanh toán, Giao hàng) để tải về dưới dạng file lưu trữ an toàn. Bạn chắc chắn chứ?'
    }))) return;
    
    setExporting(true);
    try {
      const res = await fetch('/api/export/backup-json');
      if (!res.ok) throw new Error('Yêu cầu lấy dữ liệu từ máy chủ thất bại');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zns_sgm_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notify.success('Xuất dữ liệu thành công! File JSON đã được tải về thiết bị của bạn bản snapshot mới nhất.');
    } catch (error: any) {
      console.error('Error downloading backup file:', error);
      notify.error('Lỗi khi xuất và tải bản sao lưu: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!(await confirm({
      title: 'Cảnh báo nguy hiểm',
      message: 'Khôi phục từ Cloud Backup sẽ ghi đè TOÀN BỘ dữ liệu hiện tại bằng dữ liệu trong bản backup. Việc này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn muốn tiến hành không?'
    }))) return;

    notify.error('Hệ thống chưa mở tính năng restore Cloud để đảm bảo an toàn. Vui lòng liên hệ Admin.');
  };

  // Dry Run & Scrubber Execution
  const runDataScrubbing = async (dryRun: boolean) => {
    if (!dryRun) {
      if (!(await confirm({
        title: 'Xác nhận dọn dẹp Supabase / Hệ thống',
        message: 'Hệ thống chuẩn bị xóa VĨNH VIỄN các trường dữ liệu thừa khỏi hệ thống để giải phóng lưu trữ và tránh clutter dữ liệu. Hành động này không thể hoàn tác. Bạn chắc chắn chứ?'
      }))) return;
    }

    setScanning(true);
    try {
      const customersRepo = repositoryFactory.get('customers');
      const allCustomers = await customersRepo.list({});
      const affectedDocs: any[] = [];
      let scannedCount = 0;

      for (const dataUnk of allCustomers) {
        const data = dataUnk as any;
        scannedCount++;
        const obsoleteFields = ['computedHealthScore', '__v', 'testKey', 'legacy_status'].filter(f => f in data);
        if (obsoleteFields.length > 0) {
          affectedDocs.push({
            id: data.id,
            name: data.tenKhachHang || 'Chưa rõ',
            code: data.maKh || 'N/A',
            score: `Thừa: ${obsoleteFields.join(', ')}`
          });
        }
      }

      if (!dryRun) {
        if (affectedDocs.length > 0) {
          // Execution of fields scrubbing on Supabase JSONB
          for (const item of affectedDocs) {
            const rawDoc = allCustomers.find((c: any) => c.id === item.id) as any;
            if (rawDoc) {
              const cleanDoc = { ...rawDoc };
              const obsoleteFields = ['computedHealthScore', '__v', 'testKey', 'legacy_status'];
              for (const f of obsoleteFields) {
                delete cleanDoc[f];
              }
              await customersRepo.set(item.id, cleanDoc);
            }
          }
          notify.success(`Dọn dẹp thành công! Đã loại bỏ trường thừa tại ${affectedDocs.length} hồ sơ.`);
        } else {
          notify.info('Không phát hiện bản ghi khách hàng nào chứa trường dữ liệu thừa.');
        }
      } else {
        notify.success(`Quá trình Dry Run hoàn tất! Tìm kiếm thấy ${affectedDocs.length} tài liệu cũ chứa trường lỗi thời.`);
      }

      setScanResult({
        scannedCount,
        affectedDocs,
        isDryRun: dryRun,
        executed: !dryRun
      });
    } catch (err: any) {
      notify.error('Lỗi khi rà soát cơ sở dữ liệu: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1 tracking-tight">Cơ sở dữ liệu & Sao lưu</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Quản trị vòng đời dữ liệu, kết xuất snap-shot JSON lưu trữ và duy tu dọn dẹp metadata lỗi thời trên cơ sở dữ liệu Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Backup snapshot card */}
        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/80 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <HardDrive size={24} className="text-blue-600" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">Sao lưu Dữ liệu Tức thời (JSON Snapshot)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Xuất toàn bộ data cốt lõi của hệ thống (Khách hàng, Báo giá, Hợp đồng, Giao hàng) ra một snapshot offline.
                </p>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Button aria-label="Nút xuất backup" 
                    variant="dark"
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium h-9 px-4 rounded-lg text-sm select-none shadow-sm transition-all"
                  >
                    {exporting ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16}/>}
                    {exporting ? 'Đang tạo bản ghi...' : 'Tải snapshot JSON'}
                  </Button>
                  <Button aria-label="Nút khôi phục Cloud" 
                    variant="secondary"
                    onClick={handleRestore}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 font-medium h-9 px-4 rounded-lg text-sm select-none transition-all"
                  >
                    Khôi phục từ Cloud
                  </Button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="text-2xs text-slate-500 font-mono">
                    Lần sao lưu gần nhất: {backupInfo?.lastBackupAt ? new Date(backupInfo.lastBackupAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có dữ liệu'}
                    {backupInfo?.backupSizeStr ? ` (${backupInfo.backupSizeStr})` : ''}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Sao lưu tự động vào 02:00 sáng hàng ngày</span>
                    <Switch
                      checked={autoBackupEnabled}
                      onChange={toggleAutoBackup}
                      aria-label="Bật sao lưu tự động"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database scrubbing (Dry Run & maintenance tool) */}
        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/80 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-55/65 border border-amber-200 flex items-center justify-center shrink-0">
              <Database size={24} className="text-amber-700" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">Quét rà soát & Dọn dẹp dữ liệu thừa</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Thao tác kiểm tra và purge sạch các trường thông tin lỗi thời (như <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">computedHealthScore, __v, testKey</code>) thừa thãi trên tài liệu Firestore để tối ưu dung lượng và giảm tải truy vấn.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button aria-label="Nút Dry Run" 
                  variant="secondary"
                  onClick={() => runDataScrubbing(true)}
                  disabled={scanning}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-9 px-4 rounded-lg text-sm select-none transition-all shadow-sm"
                >
                  <Eye size={16} />
                  Chạy thử Rà soát (Dry Run)
                </Button>
                <Button aria-label="Nút Clean Run" 
                  variant="subtle"
                  onClick={() => runDataScrubbing(false)}
                  disabled={scanning}
                  className="flex items-center gap-2 bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-600 hover:text-white font-medium h-9 px-4 rounded-lg text-sm select-none transition-all shadow-sm disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Thực hiện Dọn dẹp (Scrub Fields)
                </Button>
              </div>

              {scanning && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono animate-pulse">
                  <RefreshCw className="animate-spin" size={14} />
                  Đang truy vấn và duyệt cấu trúc bộ dữ liệu trên Firestore...
                </div>
              )}

              {/* Advanced visual results section */}
              {scanResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      Kết quả rà soát {scanResult.isDryRun ? '(Dry Run)' : '(Thực tế)'}
                    </span>
                    <span className="text-2xs font-mono bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded">
                      Đã quét: {scanResult.scannedCount} Khách hàng
                    </span>
                  </div>

                  {scanResult.affectedDocs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic select-none">
                      Không tìm thấy bản ghi nào chứa các trường lỗi thời. Cơ sở dữ liệu đang cực kỳ hoàn chỉnh và tinh gọn!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-700">
                        {scanResult.isDryRun 
                          ? `Phát hiện ${scanResult.affectedDocs.length} tài liệu đang tàng trữ các trường dữ liệu rác cần giải phóng:`
                          : `Đã dọn dẹp thành công trường thừa tại ${scanResult.affectedDocs.length} tài liệu:`}
                      </p>
                      
                      {/* Compact Table of Affected Documents */}
                      <div className="max-h-[160px] overflow-y-auto border border-slate-200/50 rounded-lg divide-y divide-slate-100 bg-white">
                        {scanResult.affectedDocs.map((item) => (
                          <div key={item.id} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50/60 font-mono tracking-tight text-slate-800">
                            <span className="font-semibold text-slate-700">{item.code} — {item.name}</span>
                            <span className="text-2xs text-slate-500 max-w-[120px] truncate">
                              Giá trị cũ: {JSON.stringify(item.score)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Data Standardization Center */}
        <DataStandardizationPanel />
      </div>
    </div>
  );
}
