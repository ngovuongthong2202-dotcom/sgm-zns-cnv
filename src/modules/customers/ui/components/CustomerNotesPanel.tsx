import React, { useState, useEffect } from 'react';
import { CustomerNote } from '@/src/domain/schema/customer.schema';
import { useAuth } from '@/src/modules/iam';
import { Button } from '@/src/design-system/Button';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { format } from 'date-fns';
import { Send, AtSign, Tag } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';
import { t } from '@/src/i18n/vi';

export function CustomerNotesPanel({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState<CustomerNote[]>([]);

  useEffect(() => {
    const unsub = repositoryFactory.get('customerNotes').subscribe({ fkField: 'customerId', fkId: customerId, limit: 100, sortField: 'createdAt', sortDirection: 'desc' }, (data) => {
      setNotes(data as CustomerNote[]);
    }, (err) => {
      console.error(err);
    });
    return () => unsub();
  }, [customerId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      // Basic tag extraction & mention extraction
      const tags = content.match(/#[\w]+/g)?.map(t => t.slice(1)) || [];
      const mentions = content.match(/@[\w.]+/g)?.map(m => m.slice(1)) || [];
      
      const newNote = {
        customerId,
        content: content.trim(),
        tags,
        mentions,
        createdBy: user?.email || 'Unknown',
        createdAt: new Date().toISOString(),
      };
      
      await repositoryFactory.get('customerNotes').create(newNote);
      setContent('');
      notify.success('Đã thêm ghi chú');
    } catch (error: any) {
       notify.error('Lỗi khi lưu ghi chú: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
      <div className="p-4 bg-white border-b border-slate-200">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Thêm ghi chú, tag (@mention) người phụ trách, hoặc đánh dấu (#urgency)..."
          className="w-full text-sm outline-none resize-none placeholder:text-slate-400 min-h-[80px]"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-400">
             <span title="Nhắc tên (Gõ @)"><AtSign size={14} className="hover:text-blue-500 cursor-pointer transition-colors" /></span>
             <span title="Gắn nhãn (Gõ #)"><Tag size={14} className="hover:text-blue-500 cursor-pointer transition-colors" /></span>
          </div>
          <Button
            disabled={!content.trim() || isSubmitting}
            onClick={handleSubmit}
            className="h-8 px-4 bg-slate-900 text-white rounded font-medium text-xs hover:bg-slate-800"
          >
            <Send size={14} className="mr-1.5" /> Thêm ghi chú
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto bg-slate-50">
        {notes.length === 0 ? (
           <div className="text-center text-xs text-slate-400 py-4 italic">{t('empty.noNotes')}</div>
        ) : (
           notes.map(note => (
             <div key={note.id} className="flex gap-3 text-sm">
               <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {note.createdBy.substring(0, 2)}
               </div>
               <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative">
                  <div className="flex items-start justify-between gap-4 mb-1">
                     <span className="font-bold text-slate-800 text-xs">{note.createdBy.split('@')[0]}</span>
                     <span className="text-2xs text-slate-500">{format(new Date(note.createdAt), 'dd/MM HH:mm')}</span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap text-xs leading-relaxed">
                     {/* Highlight mentions and tags */}
                     {note.content.split(/(@[\w.]+|#[\w]+)/g).map((part, i) => {
                       if (part.startsWith('@')) return <span key={i} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">{part}</span>;
                       if (part.startsWith('#')) return <span key={i} className="text-emerald-600 font-semibold bg-emerald-50 px-1 rounded">{part}</span>;
                       return <span key={i}>{part}</span>;
                     })}
                  </p>
               </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
}
