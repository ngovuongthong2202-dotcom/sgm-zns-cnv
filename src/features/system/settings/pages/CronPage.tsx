import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { supabase } from '@/src/shared/config/supabase.client';

import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  X, 
  ArrowRight, 
  Info, 
  Layers, 
  SendHorizontal 
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

import { Button } from '@/src/design-system/Button';

interface PreviewItem {
  id: string;
  title: string;
  details: string;
  before: string;
  after: string;
}

interface PreviewCategory {
  id: string;
  name: string;
  description: string;
  items: PreviewItem[];
}

interface PreviewData {
  jobId: string;
  categories: PreviewCategory[];
}

export default function CronPage() {
  const [running, setRunning] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Local state cache to instantaneously update run timestamps on UI without full reload
  const [localLastRuns, setLocalLastRuns] = useState<Record<string, string>>({});

  const [heartbeats, setHeartbeats] = useState<any[]>([]);

  useEffect(() => {
    const unsub = repositoryFactory.get('jobHeartbeats').subscribe(100, (data) => {
      setHeartbeats(data);
    }, (err) => {
      console.error(err);
    });
    return () => unsub();
  }, []);

  const handleOpenPreview = async (job: any) => {
    setPreviewLoading(true);
    setPreviewJob(job);
    setPreviewData(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || 'sgm_admin_dev_token';
      const res = await fetch('/api/cron/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      setPreviewData(result);
    } catch (err: any) {
      notify.error(`Lỗi tải dữ liệu đối soát ${job.name}: ` + (err instanceof Error ? err.message : String(err)));
      setPreviewJob(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runJob = async (jobId: string, jobName: string, endpoint: string) => {
    setRunning(jobId);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || 'sgm_admin_dev_token';

      const res = await fetch(endpoint, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

      // Instantly record current time in local last-runs state to update UI immediately
      const nowISO = new Date().toISOString();
      setLocalLastRuns(prev => ({
        ...prev,
        [jobId]: nowISO
      }));
      
      let detailMsg = '';
      if (result.results) {
         if (jobId === 'outbox') detailMsg = `Đã xử lý ${result.results.processed !== undefined ? result.results.processed : (result.results.processedCount || 0)} tin ZNS.`;
         if (jobId === 'sync-snapshots') {
           detailMsg = `Đã đồng bộ xong ${result.results.processed || 0} hồ sơ khách hàng vào các đề mục quan hệ.`;
           // Soft-mutate lists to load latest values in active views without manual F5
           const { mutate } = await import('swr');
           mutate('quotations:5000');
           mutate('contracts:5000');
           mutate('payments:5000');
           mutate('deliveries:5000');
         }
      }
      notify.success(`Đã kích hoạt hành trình ${jobName} thành công! ${detailMsg}`);
      setPreviewJob(null); // Close modal
    } catch (err: any) { 
      notify.error(`Lỗi kích hoạt ${jobName}: ` + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRunning(null);
    }
  };

  const jobs = [
    { id: 'outbox', name: 'Process ZNS Outbox', desc: 'Quét hàng đợi và tự động gửi/retry lại các tin nhắn ZNS gửi lỗi', endpoint: '/api/cron/process-outbox', freq: 'Mỗi 5 phút', intervalMins: 5 },
    { id: 'sync-snapshots', name: 'Sync Customer Snapshots', desc: 'Đồng bộ hồ sơ thông tin khách hàng mới nhất sang danh sách Báo giá/Hợp đồng/Thanh toán/Giao hàng liên kết', endpoint: '/api/cron/sync-snapshots', freq: 'Mỗi 5 phút', intervalMins: 5 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Hệ thống Tác vụ Định kỳ (Cron Jobs)</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Quản lý, theo dõi sức khỏe và thực hiện đối soát/kích hoạt thủ công an toàn cho các tác vụ ngầm hệ thống quản trị vòng đời đơn hàng.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
        <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed font-medium">
          Quy trình Vận hành An toàn (Hard Gate): Trước khi chạy các tiến trình tự động hóa hàng loạt, bạn bắt buộc phải ký duyệt và đối soát xem trước chi tiết danh sách thay đổi "Trước" vs "Sau" để tránh xung đột dữ liệu thực tế.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
         {jobs.map(job => {
            const heartbeat = heartbeats.find(h => h.id === job.id);
            // Prioritize local state timestamp for instantaneous update right after tool run
            const lastRunStr = localLastRuns[job.id] || heartbeat?.lastRun;
            let isLate = false;
            if (lastRunStr) {
              const mins = differenceInMinutes(new Date(), new Date(lastRunStr));
              if (mins > job.intervalMins * 2) {
                isLate = true;
              }
            }
            
            return (
              <div key={job.id} className={`bg-white rounded-2xl p-5 border ${isLate ? 'border-red-200 bg-red-50/10 shadow-sm shadow-red-100' : 'border-slate-200'} shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200`}>
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-start">
                       <h3 className="font-semibold text-slate-900 leading-tight text-sm tracking-tight">{job.name}</h3>
                       <span className="text-2xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100/95 px-2 py-0.5 rounded shrink-0">{job.freq}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">{job.desc}</p>
                    
                    {/* Heartbeat Status Box */}
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${isLate ? 'bg-red-50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                      <div className="flex items-center gap-2">
                        {isLate ? (
                          <AlertTriangle size={14} className="text-red-600 shrink-0" />
                        ) : (
                          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        )}
                        <span className={`text-2xs font-bold uppercase tracking-wider ${isLate ? 'text-red-700' : 'text-emerald-700'}`}>
                          {isLate ? 'TIẾN TRÌNH TRỄ LỊCH!' : 'HOẠT ĐỘNG HOÀN HẢO'}
                        </span>
                      </div>
                      <span className="text-2xs text-slate-500 font-mono tracking-xs flex items-center gap-1">
                        <Clock size={10} className="text-slate-400 shrink-0" />
                        Last run: {lastRunStr ? new Date(lastRunStr).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                </div>

                <div className="space-y-2">
                  <Button aria-label="Xem chi tiết & đối soát tác vụ" 
                    variant="dark"
                    onClick={() => handleOpenPreview(job)}
                    disabled={running !== null}
                    className="w-full h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Eye size={12} />
                    Đối soát & Chạy
                  </Button>
                </div>
              </div>
            );
         })}
      </div>

      {/* Polish and Gorgeous Review Modal */}
      {previewJob && (
        <div id="cron-review-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Ký duyệt & Đối soát tác vụ</h3>
                  <p className="text-2xs text-slate-500 font-medium">Bảng kê khai chi tiết các thay đổi dữ liệu dự kiến thực hiện</p>
                </div>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Đóng cửa sổ xem trước"
                onClick={() => setPreviewJob(null)}
                className="w-7 h-7 p-0 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                disabled={running === previewJob.id}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
              {/* Job Summary Banner */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tác vụ kích hoạt</span>
                  <span className="text-2xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">{previewJob.freq}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-base">{previewJob.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{previewJob.desc}</p>
              </div>

              {previewLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-blue-600" />
                  <p className="text-xs text-slate-600 font-semibold animate-pulse">Đang nạp bảng dữ liệu đối soát thực tế...</p>
                </div>
              ) : previewData ? (
                <div className="space-y-5">
                  {/* Total counter banner */}
                  {(() => {
                    const totalItemsCount = previewData.categories.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
                    return (
                      <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${totalItemsCount > 0 ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                        <div className="flex items-center gap-2.5">
                          {totalItemsCount > 0 ? (
                            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                          )}
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-xs">
                              {totalItemsCount > 0 
                                ? `Tìm thấy ${totalItemsCount} đề mục sẵn sàng cập nhật/gửi tin` 
                                : 'Hệ thống đang đồng bộ hoàn hảo'
                              }
                            </h5>
                            <p className="text-2xs text-slate-500 font-medium">
                              {totalItemsCount > 0 
                                ? 'Vui lòng kiểm tra kỹ trạng thái thay đổi dòng thông tin dưới đây trước khi bấm duyệt chạy.' 
                                : 'Mọi hồ sơ Snapshot và trạng thái nghiệp vụ ZNS đã được xử lý đầy đủ, không có dữ liệu mâu thuẫn.'
                              }
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-black font-mono tracking-wide">
                          {totalItemsCount} items
                        </span>
                      </div>
                    );
                  })()}

                  {/* Categories */}
                  {previewData.categories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <div className="pb-1 border-b border-slate-200">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                          <span className="w-1.5 h-3 bg-blue-600 rounded-xs"></span>
                          {category.name}
                          <span className="ml-1 px-1.5 py-0.2 bg-slate-200/80 rounded font-bold font-mono text-2xs text-slate-700">
                            {category.items?.length || 0}
                          </span>
                        </h5>
                        <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed font-semibold">{category.description}</p>
                      </div>

                      {category.items && category.items.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {category.items.map((item) => (
                            <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-350 hover:shadow-xs transition-all duration-200">
                              <div className="flex items-start justify-between mb-1.5">
                                <h6 className="font-bold text-slate-900 text-xs tracking-tight">{item.title}</h6>
                                <span className="text-3xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {item.id}</span>
                              </div>
                              <p className="text-2xs text-slate-500 mb-3 font-semibold leading-relaxed flex items-center gap-1">
                                <Info size={10} className="text-slate-400 shrink-0" />
                                {item.details}
                              </p>
                              
                              {/* Visual comparison (Before & After panels) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1.5">
                                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg flex flex-col gap-1">
                                  <span className="font-bold text-3xs uppercase tracking-wider text-amber-700">Trạng thái trước quét</span>
                                  <span className="text-amber-900 font-semibold leading-relaxed break-all text-2xs">{item.before}</span>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg flex flex-col gap-1">
                                  <span className="font-bold text-3xs uppercase tracking-wider text-emerald-700">Cam kết sau chạy</span>
                                  <span className="text-emerald-900 font-bold leading-relaxed break-all text-2xs flex items-center gap-1">
                                    <ArrowRight size={10} className="text-emerald-600 shrink-0" />
                                    {item.after}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 bg-white rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center gap-1.5">
                          <CheckCircle size={16} className="text-emerald-600/80" />
                          <p className="text-2xs text-slate-450 font-bold">Danh mục trống. Không phát hiện sai số cần xử lý.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                  <AlertTriangle size={24} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-semibold">Không tìm thấy dữ liệu xem trước</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Button aria-label="Bỏ qua tác vụ và đóng modal"
                variant="secondary"
                disabled={running === previewJob.id}
                onClick={() => setPreviewJob(null)}
                className="h-9 px-4 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white bg-slate-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </Button>

              <div className="flex items-center gap-2">
                <Button aria-label="Xác nhận chạy tác vụ ngầm hàng loạt"
                  variant="primary"
                  disabled={running !== null || previewLoading}
                  onClick={() => runJob(previewJob.id, previewJob.name, previewJob.endpoint)}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {running === previewJob.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <SendHorizontal size={12} />
                  )}
                  {running === previewJob.id ? 'Hệ thống đang chạy...' : 'Xác nhận & Chạy ngay'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
