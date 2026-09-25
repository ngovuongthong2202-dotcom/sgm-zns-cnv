import React, { useState, useRef, useEffect } from 'react';
import { Eye, Check, Settings, Pin, Globe, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface SavedView {
  id?: string;
  name: string;
}

interface SavedViewsMenuProps {
  views: SavedView[];
  activeViewId?: string;
  isAdmin?: boolean;
  onSelectView: (id: string) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteView?: (id: string) => void;
  onResetAllFilters?: () => void;
  onPublishAsOrgTemplate?: (isForced: boolean) => void;
}

export function SavedViewsMenu({ views, activeViewId, isAdmin, onSelectView, onSaveCurrentView, onDeleteView, onResetAllFilters, onPublishAsOrgTemplate }: SavedViewsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isForcedTemplate, setIsForcedTemplate] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSaving(false);
        setIsPublishing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (newViewName.trim()) {
      onSaveCurrentView(newViewName.trim());
      setIsSaving(false);
      setNewViewName('');
    }
  };

  const handlePublish = () => {
    if (onPublishAsOrgTemplate) {
      onPublishAsOrgTemplate(isForcedTemplate);
      setIsPublishing(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        size="md"
        iconOnly
        title="Bộ lọc đã lưu"
        aria-label="Bộ lọc đã lưu"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 border-slate-300 relative group"
      >
        <Eye className={`w-4 h-4 transition-colors ${activeViewId ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"}`} />
        {activeViewId && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-[240px] bg-white border border-slate-200/80 shadow-[0_4px_12px_rgba(15,23,42,0.08)] rounded-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 py-1">
          <div className="max-h-[260px] overflow-y-auto w-full">
            <div className="px-3 py-1.5 text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between select-none">
              <span>Màn hình tùy chỉnh</span>
            </div>
            {views.length === 0 ? (
              <div className="text-xs text-slate-400 px-3 py-2 italic select-none">Chưa có bộ lọc nào được lưu</div>
            ) : (
              views.map(view => {
                const isActive = activeViewId === view.id;
                const isOrgTemplate = view.id === '__org_template__';
                return (
                  <div key={view.id} className={`w-full flex items-center justify-between px-1 py-0.5 text-xs transition-colors group ${isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectView(view.id!);
                        setIsOpen(false);
                      }}
                      className={`flex-1 justify-between px-2 py-1.5 text-left ${
                        isActive 
                          ? 'text-blue-700 font-semibold' 
                          : 'text-slate-700 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isOrgTemplate ? (
                          <Globe className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-amber-500'}`} />
                        ) : (
                          <Pin className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        )}
                        <span className="truncate">{view.name}</span>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </Button>
                    {onDeleteView && view.id && !isOrgTemplate && (
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        title="Xóa bộ lọc"
                        aria-label="Xóa bộ lọc"
                        onClick={(e) => {
                           e.stopPropagation();
                           onDeleteView(view.id!);
                        }}
                        className="px-2 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                      >
                        <span className="text-sm">×</span>
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="border-t border-slate-100 mt-1 pt-1">
            {isPublishing ? (
              <div className="px-3 py-2 flex flex-col gap-2">
                <div className="text-2xs text-amber-700 bg-amber-50 p-2 rounded flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">Áp dụng giao diện hiện tại làm <strong>mặc định</strong> cho toàn tổ chức?</p>
                </div>
                <label className="flex items-center gap-2 text-2xs text-slate-700 cursor-pointer select-none px-1">
                  <input 
                    type="checkbox" 
                    checked={isForcedTemplate} 
                    onChange={(e) => setIsForcedTemplate(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Đặt làm mặc định bắt buộc</span>
                </label>
                <div className="flex gap-1.5 justify-end mt-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsPublishing(false)}
                    className="h-7 text-slate-500 hover:bg-slate-50 text-2xs"
                  >
                    Hủy
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handlePublish}
                    className="h-7 text-2xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Xác nhận
                  </Button>
                </div>
              </div>
            ) : isSaving ? (
              <div className="px-3 py-2 flex flex-col gap-2">
                <input 
                  aria-label="Tên bộ lọc mới" 
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="Tên màn hình..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800"
                  autoFocus
                  onKeyDown={e => {
                     e.stopPropagation();
                     if (e.key === 'Enter') handleSave();
                     if (e.key === 'Escape') setIsSaving(false);
                  }}
                />
                <div className="flex gap-1.5 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsSaving(false)}
                    className="h-7 text-slate-500 hover:bg-slate-50 text-2xs"
                  >
                    Hủy
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleSave}
                    className="h-7 text-2xs"
                  >
                    Lưu lại
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {onResetAllFilters && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onResetAllFilters();
                      setIsOpen(false);
                    }}
                    className="w-full justify-start text-left px-3 py-1.5 text-2xs text-red-650 font-semibold hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
                  >
                    ✕ Đặt lại tất cả bộ lọc
                  </Button>
                )}
                {isAdmin && onPublishAsOrgTemplate && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPublishing(true)}
                    className="w-full justify-start flex items-center gap-1.5 px-3 py-1.5 text-2xs text-amber-700 font-semibold hover:bg-amber-50 text-left"
                  >
                    <Globe className="w-3 h-3 text-amber-600" />
                    <span>Lưu làm Template Tổ chức</span>
                  </Button>
                )}
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSaving(true)}
                  className="w-full justify-start text-left px-3 py-1.5 text-2xs text-blue-600 font-semibold hover:bg-blue-50"
                >
                  + Lưu màn hình (Cá nhân)
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsOpen(false); }}
                  className="w-full justify-start flex items-center gap-1.5 px-3 py-1.5 text-2xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left"
                >
                  <Settings className="w-3 h-3 text-slate-500" />
                  <span>Quản lý màn hình đã lưu</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedViewsMenu;
