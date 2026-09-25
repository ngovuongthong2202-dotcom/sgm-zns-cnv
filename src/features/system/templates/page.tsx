import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { PageHeader } from '@/src/design-system/PageHeader';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { ZnsTemplate, TemplateVariable } from '@/src/domain/schema/zns-template.schema';
import { EmptyState } from '@/src/design-system/EmptyState';
import { FileQuestion, RefreshCcw, MessageSquare } from 'lucide-react';
import { TemplatePreview } from './components/TemplatePreview';
import { VariableMapper } from './components/VariableMapper';
import { TestSendModal } from './components/TestSendModal';
import { DiffViewerModal } from './components/DiffViewerModal';
import { PayloadPreviewPanel } from './components/PayloadPreviewPanel';
import { ExpectedVarsBadge } from './components/ExpectedVarsBadge';

import { Button } from '@/src/design-system/Button';
import { t } from '@/src/i18n/vi';

export default function TemplatesPage() {
  const [templatesRaw, setTemplatesRaw] = useState<ZnsTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = repositoryFactory.get('znsTemplates').subscribe(500, (data) => {
      setTemplatesRaw(data as ZnsTemplate[]);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const templates = templatesRaw || [];
  
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [mockDataMap, setMockDataMap] = useState<Record<string, string>>({});
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [diffVars, setDiffVars] = useState<TemplateVariable[] | null>(null);

  const createRecord = async (data: Partial<ZnsTemplate>) => {
    try {
      await repositoryFactory.get('znsTemplates').create(data);
      notify.success('Đã lưu phiên bản cấu hình mới.');
    } catch (err: any) {
      notify.error('Lỗi lưu cấu hình: ' + err.message);
    }
  };

  if (loading) {
     return <div className="p-12 text-center text-slate-600">Đang tải cấu hình mẫu tin nhắn...</div>;
  }

  // Lấy danh sách template gom nhóm theo templateKey (chọn version cao nhất)
  const latestTemplatesMap: Record<string, ZnsTemplate> = {};
  templates.forEach(t => {
     if (!latestTemplatesMap[t.templateKey] || t.version > latestTemplatesMap[t.templateKey].version) {
         latestTemplatesMap[t.templateKey] = t;
     }
  });
  const latestTemplates = Object.values(latestTemplatesMap);

  // Default selection if none selected
  useEffect(() => {
    if (!selectedTemplateKey && latestTemplates.length > 0) {
       setSelectedTemplateKey(latestTemplates[0].templateKey);
    }
  }, [selectedTemplateKey, latestTemplates]);

  const selectedTemplate = latestTemplatesMap[selectedTemplateKey || ''];

  const handleSync = async () => {
     const toastId = notify.loading('Đang đồng bộ từ CNV...');
     try {
       const res = await fetch('/api/zns-templates/sync-from-cnv', { method: 'POST' });
       if (!res.ok) throw new Error('Failed to sync');
       notify.dismiss(toastId);
       notify.success('Đồng bộ mẫu ZNS từ CNV thành công');
     } catch (err: unknown) {
       notify.dismiss(toastId);
       notify.error('Lỗi đồng bộ: ' + (err instanceof Error ? err.message : String(err)));
     }
  };

  const handleRequestSaveVariables = async (newVariables: TemplateVariable[]) => {
    setDiffVars(newVariables); // Trigger DiffViewerModal
  };

  const confirmSaveVariables = async () => {
    if (!selectedTemplate || !diffVars) return;
    const { id: _id, ...dataToClone } = selectedTemplate as ZnsTemplate & { id?: string };
    await createRecord({
       ...dataToClone,
       variables: diffVars,
       version: dataToClone.version + 1,
    });
    setDiffVars(null);
  };

  const handleRestore = async (versionTemplate: ZnsTemplate) => {
     if (!selectedTemplate) return;
     if (!confirm(`Bạn có chắc muốn khôi phục về phiên bản v${versionTemplate.version} không?`)) return;
     try {
        const { id: _id, ...dataToClone } = versionTemplate as ZnsTemplate & { id?: string };
        await createRecord({
           ...dataToClone,
           version: selectedTemplate.version + 1,
        });
     } catch (error: any) {
        notify.error('Lỗi khi khôi phục cấu hình: ' + (error?.message || error));
     }
  };

  const expectedVarsList = selectedTemplate ? selectedTemplate.variables.map(v => v.name).join(', ') : '';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <PageHeader title="Mẫu Tin Nhắn ZNS" meta="Quản lý và cấu hình mapping dữ liệu sang Zalo" />

      {latestTemplates.length === 0 ? (
         <EmptyState
            variant="empty"
            icon={<FileQuestion className="w-12 h-12 text-slate-300" />}
            title={t('empty.noTemplates')}
            description="Hãy nhấn Sync từ CNV hoặc chạy script khởi tạo dữ liệu mẫu."
         />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
            {/* Column 1: List Mẫu (Left border list) */}
            <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0 bg-white rounded-xl border border-slate-200 p-3 h-full overflow-y-auto">
               <Button aria-label="Nút bấm" onClick={handleSync} className="flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors mb-2">
                  <RefreshCcw size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Sync từ CNV</span>
               </Button>
               <hr className="border-slate-100 mb-2" />
               {latestTemplates.map(template => {
                  const isSelected = selectedTemplateKey === template.templateKey;
                  return (
                     <Button aria-label="Nút bấm" 
                        key={template.templateKey} 
                        onClick={() => setSelectedTemplateKey(template.templateKey)}
                        className={`flex items-start text-left flex-col gap-1 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-4 ${
                           isSelected 
                           ? 'bg-blue-50/50 border-brand-primary text-brand-primary' 
                           : 'bg-white border-transparent text-slate-700 hover:bg-slate-50'
                        }`}
                     >
                        <span className="font-semibold truncate w-full" title={template.label}>{template.label}</span>
                        <span className="text-2xs text-slate-500 font-mono flex items-center gap-2">
                          <span className={`${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'} px-1.5 py-0.5 rounded`}>v{template.version}</span>
                          <span>{template.variables.length} biến</span>
                        </span>
                     </Button>
                  );
               })}
            </div>

            {/* Content Area */}
            {selectedTemplate && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0 h-full">
                   {/* Column 2: Preview ảnh & Payload (Center) */}
                   <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">
                      <ExpectedVarsBadge expectedVars={expectedVarsList} />

                      <div className="shrink-0">
                         <TemplatePreview template={selectedTemplate} variablesValueMock={mockDataMap} />
                      </div>

                      <div className="flex-1 min-h-[300px]">
                         <PayloadPreviewPanel template={selectedTemplate} mockDataMap={mockDataMap} />
                      </div>

                      <div className="shrink-0 mt-auto">
                         <Button aria-label="Nút bấm" 
                            onClick={() => setIsTestModalOpen(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                         >
                            <MessageSquare size={16} />
                            Gửi Thử Về Zalo (Test)
                         </Button>
                      </div>
                   </div>

                   {/* Column 3: Variable Mapper (Right) */}
                   <div className="flex-1 min-w-0 flex flex-col h-full min-h-0">
                      <div className="flex-1 min-h-0">
                        <VariableMapper 
                          template={selectedTemplate} 
                          onSave={handleRequestSaveVariables}
                          mockDataMap={mockDataMap}
                          setMockDataMap={setMockDataMap}
                        />
                      </div>
                   </div>
                </div>
            )}
        </div>
      )}

      {selectedTemplate && (
         <TestSendModal 
           isOpen={isTestModalOpen} 
           onClose={() => setIsTestModalOpen(false)} 
           template={selectedTemplate}
           mockDataMap={mockDataMap}
         />
      )}

      {selectedTemplate && diffVars && (
         <DiffViewerModal
           isOpen={!!diffVars}
           onClose={() => setDiffVars(null)}
           onConfirm={confirmSaveVariables}
           oldTemplate={selectedTemplate}
           newVariables={diffVars}
         />
      )}
    </div>
  );
}
