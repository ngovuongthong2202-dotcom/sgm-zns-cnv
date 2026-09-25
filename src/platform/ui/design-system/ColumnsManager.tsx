import { Button } from '@/src/design-system';
/* eslint-disable max-lines */
import React, { useState, useMemo } from 'react';
import { Columns, Search, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnsManagerProps {
  visibility: Record<string, boolean>;
  onVisibilityChange: (v: Record<string, boolean>) => void;
  availableColumns: { id: string; label: string }[];
  defaultVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

const MANDATORY_KEYS = [
  'id', 'maKh', 'soPhieu', 'soHopDong', 'soHd', 'actions', 'select', 'customer', 'customerName', 'maKhachHang', 'maDeNghi'
];

interface SortableColumnItemProps {
  col: { id: string; label: string };
  isChecked: boolean;
  onToggle: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  hasOrderChange: boolean;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  col,
  isChecked,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  hasOrderChange
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 h-8 px-2 hover:bg-slate-50 rounded transition-all text-xs select-none ${
        isDragging ? 'bg-slate-100 shadow-sm border border-slate-200' : ''
      }`}
    >
      {hasOrderChange && (
        <Button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing mr-1 flex items-center justify-center outline-none"
          title="Kéo thả để sắp xếp"
          aria-label={`Kéo thả cột ${col.label}`}
         variant="ghost" iconOnly>
          <GripVertical className="w-3.5 h-3.5" />
        </Button>
      )}

      <input
        id={`col-toggle-${col.id}`}
        aria-label={`Hiển thị cột ${col.label}`}
        type="checkbox"
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
        checked={isChecked}
        onChange={() => onToggle(col.id)}
      />

      <label
        htmlFor={`col-toggle-${col.id}`}
        className="text-slate-700 font-medium truncate pr-2 cursor-pointer flex-1"
      >
        {col.label}
      </label>

      {hasOrderChange && (
        <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            type="button"
            disabled={!canMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            className="p-0.5 hover:bg-slate-150 disabled:opacity-20 rounded border-0 bg-transparent text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Di chuyển lên"
            aria-label={`Di chuyển cột ${col.label} lên đầu`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            disabled={!canMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            className="p-0.5 hover:bg-slate-150 disabled:opacity-20 rounded border-0 bg-transparent text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Di chuyển xuống"
            aria-label={`Di chuyển cột ${col.label} xuống dưới`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ColumnsManager({
  visibility,
  onVisibilityChange,
  availableColumns,
  columnOrder,
  onColumnOrderChange,
  defaultVisibility,
}: ColumnsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const toggleColumn = (id: string) => {
    onVisibilityChange({
      ...visibility,
      [id]: visibility[id] === false ? true : false,
    });
  };

  const handleSelectAll = () => {
    const nextVisibility: Record<string, boolean> = {};
    availableColumns.forEach((col) => {
      nextVisibility[col.id] = true;
    });
    onVisibilityChange(nextVisibility);
  };

  const handleHideAll = () => {
    const nextVisibility: Record<string, boolean> = {};
    availableColumns.forEach((col) => {
      // Keep mandatory identifier columns and action columns visible
      const isMandatory = MANDATORY_KEYS.includes(col.id);
      nextVisibility[col.id] = isMandatory;
    });
    onVisibilityChange(nextVisibility);
  };

  const handleResetDefault = () => {
    if (defaultVisibility) {
      onVisibilityChange(defaultVisibility);
    } else {
      const nextVisibility: Record<string, boolean> = {};
      availableColumns.forEach((col) => {
        nextVisibility[col.id] = true;
      });
      onVisibilityChange(nextVisibility);
    }

    if (onColumnOrderChange) {
      onColumnOrderChange(availableColumns.map((c) => c.id));
    }
  };

  const sortedColumnsList = useMemo(() => {
    const list = [...availableColumns];
    if (columnOrder && columnOrder.length > 0) {
      list.sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return list;
  }, [availableColumns, columnOrder]);

  const filteredColumns = useMemo(() => {
    return sortedColumnsList.filter((col) =>
      col.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedColumnsList, searchTerm]);

  const handleMoveUp = (id: string) => {
    if (!columnOrder || !onColumnOrderChange) return;
    const currentOrder = sortedColumnsList.map(c => c.id);
    const idx = currentOrder.indexOf(id);
    if (idx > 0) {
      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[idx - 1];
      currentOrder[idx - 1] = temp;
      onColumnOrderChange(currentOrder);
    }
  };

  const handleMoveDown = (id: string) => {
    if (!columnOrder || !onColumnOrderChange) return;
    const currentOrder = sortedColumnsList.map(c => c.id);
    const idx = currentOrder.indexOf(id);
    if (idx !== -1 && idx < currentOrder.length - 1) {
      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[idx + 1];
      currentOrder[idx + 1] = temp;
      onColumnOrderChange(currentOrder);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onColumnOrderChange) {
      const currentOrder = sortedColumnsList.map(c => c.id);
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onColumnOrderChange(arrayMove(currentOrder, oldIndex, newIndex));
      }
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="md"
        iconOnly
        title="Quản lý cột"
        aria-label="Quản lý cột hiển thị"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 border-slate-300 relative group"
      >
        <Columns className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-colors" />
      </Button>

      {isOpen && (
        <div className="absolute top-9 right-0 w-72 bg-white border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-xl z-50 p-3 select-none flex flex-col font-sans">
          
          <div className="flex flex-col gap-1.5 mb-2">
            <span className="text-2xs font-bold text-slate-600 uppercase tracking-widest leading-none">
              Hiển thị cột
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                onClick={handleSelectAll}
                className="text-2xs font-bold text-blue-600 hover:text-blue-700 bg-transparent border-0 p-0 cursor-pointer outline-none"
                aria-label="Chọn hiển thị tất cả các cột"
               variant="ghost">
                Chọn tất cả
              </Button>
              <span className="text-slate-200 h-2 w-[1px] bg-slate-200" />
              <Button
                type="button"
                onClick={handleHideAll}
                className="text-2xs font-bold text-red-600 hover:text-red-700 bg-transparent border-0 p-0 cursor-pointer outline-none"
                aria-label="Ẩn tất cả chỉ giữ lại cột định danh"
               variant="danger">
                Ẩn tất cả
              </Button>
              <span className="text-slate-200 h-2 w-[1px] bg-slate-200" />
              <Button
                type="button"
                onClick={handleResetDefault}
                className="text-2xs font-bold text-slate-600 hover:text-slate-700 bg-transparent border-0 p-0 cursor-pointer outline-none"
                aria-label="Đặt lại cột mặc định"
               variant="ghost">
                Khôi phục mặc định
              </Button>
            </div>
          </div>

          <div className="relative mb-2 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              aria-label="Tìm kiếm cột cần hiển thị"
              type="text"
              placeholder="Tìm kiếm cột..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 h-8 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded outline-none text-xs font-medium placeholder:text-slate-400 transition-all font-sans"
            />
          </div>

          <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-0.5 min-w-0">
            {filteredColumns.length === 0 ? (
              <span className="text-2xs text-slate-500 text-center py-2 italic font-sans">Không tìm thấy cột</span>
            ) : onColumnOrderChange ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredColumns.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-0.5">
                    {filteredColumns.map((col, index) => {
                      const isChecked = visibility[col.id] !== false;
                      return (
                        <SortableColumnItem
                          key={col.id}
                          col={col}
                          isChecked={isChecked}
                          onToggle={toggleColumn}
                          onMoveUp={() => handleMoveUp(col.id)}
                          onMoveDown={() => handleMoveDown(col.id)}
                          canMoveUp={index > 0}
                          canMoveDown={index < filteredColumns.length - 1}
                          hasOrderChange={!!onColumnOrderChange}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredColumns.map((col) => {
                  const isChecked = visibility[col.id] !== false;
                  return (
                    <div
                      key={col.id}
                      className="flex items-center gap-2 h-8 px-2 hover:bg-slate-50 rounded transition-all cursor-pointer text-xs select-none"
                    >
                      <input
                        id={`col-toggle-${col.id}`}
                        aria-label={`Hiển thị cột ${col.label}`}
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleColumn(col.id)}
                      />
                      <label
                        htmlFor={`col-toggle-${col.id}`}
                        className="text-slate-700 font-medium truncate cursor-pointer flex-1"
                      >
                        {col.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
