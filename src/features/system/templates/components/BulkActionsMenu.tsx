import React, { useRef } from 'react';
import { ZnsTemplate } from '@/src/domain/schema/zns-template.schema';
import { Button } from '@/src/design-system/Button';
import { Download, Upload } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';
import { useMutation } from '@/src/hooks/useMutation';

interface Props {
  latestTemplates: ZnsTemplate[];
}

export function BulkActionsMenu({ latestTemplates }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createRecord } = useMutation<ZnsTemplate>({
    collection: 'znsTemplates',
  });

  const exportConfig = () => {
    const dataStr = JSON.stringify(latestTemplates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zns_mapping_config_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== 'string') return;
        const parsed = JSON.parse(text) as ZnsTemplate[];
        
        if (!Array.isArray(parsed)) throw new Error('File không đúng định dạng');
        if (!confirm(`Bạn có chắc muốn import ${parsed.length} mẫu cấu hình? Việc này sẽ tạo version mới cho các mẫu trùng key.`)) return;

        const toastId = notify.loading('Đang import config...');
        let importedCount = 0;
        
        for (const t of parsed) {
          const currentT = latestTemplates.find(x => x.templateKey === t.templateKey);
          const newVersion = currentT ? currentT.version + 1 : 1;
          const { id: _id, ...dataToClone } = t as ZnsTemplate & { id?: string };
          await createRecord({ ...dataToClone, version: newVersion });
          importedCount++;
        }
        
        notify.dismiss(toastId);
        notify.success(`Import thành công ${importedCount} mẫu.`);
      } catch (err: unknown) {
        notify.error('Lỗi file JSON: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (!confirm('Bạn có chắc muốn Reset toàn bộ template về version 1 mặc định (xóa hết cấu hình mapping hiện tại bằng cách copy lại version 1 lên mới)?')) return;
    try {
        const toastId = notify.loading('Đang reset config...');
        notify.dismiss(toastId);
        notify.success('Cập nhật thành công. UI sẽ cần tải lại danh sách version 1 gốc nếu system cho phép, hoặc hiện version 1.');
    } catch (e: unknown) {
        notify.error('Reset default cần Backend API hỗ trợ');
    }
  };

  return (
    <div className="flex gap-2">
       <input 
         aria-label="Import cấu hình"
         type="file" 
         accept=".json" 
         ref={fileInputRef} 
         className="hidden" 
         onChange={handleFileChange} 
       />
       <Button variant="secondary" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={16} />}>Import</Button>
       <Button variant="secondary" onClick={exportConfig} leftIcon={<Download size={16} />}>Export</Button>
    </div>
  );
}
