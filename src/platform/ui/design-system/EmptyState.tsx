import React from 'react';
import { BookOpen, Filter, Search, RotateCcw, Plus, X } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  variant?: 'empty' | 'no-match' | 'filtered' | 'search' | 'error';
  searchQuery?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  helpLink?: string;
  className?: string;
  onReset?: () => void;
  onCreateNew?: () => void;
  createNewLabel?: string;
}

const EmptyIllustrations = {
  'empty': (
    <svg className="w-12 h-12 text-slate-300 stroke-[1.25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  'no-match': (
    <svg className="w-12 h-12 text-slate-300 stroke-[1.25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 14h.01M10 10h.01M14 10h.01" />
    </svg>
  ),
  'filtered': (
    <Filter className="w-12 h-12 text-slate-300 stroke-[1.25]" />
  ),
  'search': (
    <Search className="w-12 h-12 text-slate-300 stroke-[1.25]" />
  ),
  'error': (
    <svg className="w-12 h-12 text-red-400 stroke-[1.25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

export function EmptyState({ 
  variant = 'empty', 
  searchQuery = '',
  icon, 
  title, 
  description, 
  action, 
  helpLink, 
  className = '',
  onReset,
  onCreateNew,
  createNewLabel = 'Tạo mới'
}: EmptyStateProps) {
  
  // Resolve texts depending on the context
  let displayTitle = title;
  let displayDesc = description;
  let displayAction = action;

  if (variant === 'filtered') {
    displayTitle = title || "Không có kết quả phù hợp";
    displayDesc = description || "Vui lòng thử điều chỉnh lại điều kiện lọc hoặc đặt lại bộ lọc để hiển thị toàn bộ bản ghi.";
    if (onReset && !displayAction) {
      displayAction = (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onReset}
          className="h-8 text-xs font-semibold px-3 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 duration-150 flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại filter</span>
        </Button>
      );
    }
  } else if (variant === 'search') {
    displayTitle = title || `Không tìm thấy kết quả${searchQuery ? ` cho "${searchQuery}"` : ''}`;
    displayDesc = description || "Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc thử bằng một cụm từ khác.";
    if (onReset && !displayAction) {
      displayAction = (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onReset}
          className="h-8 text-xs font-semibold px-3 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 duration-150 flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>Xóa tìm kiếm</span>
        </Button>
      );
    }
  } else if (variant === 'empty') {
    displayTitle = title || "Chưa có bản ghi nào";
    displayDesc = description || "Dữ liệu hiện tại của phân hệ này đang trống. Hãy tạo bản ghi đầu tiên để bắt đầu công việc.";
    if (onCreateNew && !displayAction) {
      displayAction = (
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onCreateNew}
          className="h-8 text-xs font-semibold px-3 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{createNewLabel}</span>
        </Button>
      );
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 py-12 text-center bg-slate-50/50 border border-slate-200/60 border-dashed rounded-xl select-none ${className}`}>
      <div className="flex items-center justify-center mb-4">
        {icon || EmptyIllustrations[variant]}
      </div>
      <h3 className="text-sm font-medium text-slate-900 mb-1 line-clamp-1">{displayTitle}</h3>
      {displayDesc && <p className="text-xs text-slate-500 max-w-sm mb-5 leading-normal">{displayDesc}</p>}
      
      {displayAction && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {displayAction}
        </div>
      )}

      {helpLink && (
        <a 
          href={helpLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-6 flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Xem hướng dẫn chi tiết</span>
        </a>
      )}
    </div>
  );
}
