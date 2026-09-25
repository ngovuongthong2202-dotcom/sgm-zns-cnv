/* eslint-disable max-lines */
import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  User 
} from 'lucide-react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Button } from '@/src/design-system/Button';


// ----------------------------------------------------------------------
// Helper to get start of week (Monday)
// ----------------------------------------------------------------------
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to format Date to YYYY-MM-DD
function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Day Labels
const DAY_LABELS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật'
];

interface CalendarWeekProps {
  deliveries: Delivery[];
  onReschedule: (id: string, newDate: string) => Promise<void>;
  onSelectDelivery: (delivery: Delivery) => void;
}

// ----------------------------------------------------------------------
// Draggable Card Component
// ----------------------------------------------------------------------
const DraggableDeliveryCard: React.FC<{ 
  delivery: Delivery; 
  onClick: () => void 
}> = ({ delivery, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: delivery.id!,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  const isCompleted = !!delivery.ngayGiaoThucTe;
  const isCancelled = (delivery as any).tinhTrangGiaoHang === 'HUY' || (delivery as any).tinhTrangGiaoHang === 'Hủy';
  
  let borderClass = 'border-slate-200';
  let badgeColor = 'bg-slate-100 text-slate-700';
  let badgeLabel = 'Chờ giao';

  if (isCancelled) {
    borderClass = 'border-red-100 bg-red-50/30';
    badgeColor = 'bg-red-50 text-red-700 border-red-100';
    badgeLabel = 'Hủy';
  } else if (isCompleted) {
    borderClass = 'border-emerald-200 bg-emerald-50/10';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    badgeLabel = 'Đã giao';
  } else if ((delivery as any).tinhTrangGiaoHang === 'DANG_GIAO' || (delivery as any).tinhTrangGiaoHang === 'Đang giao') {
    borderClass = 'border-amber-200 bg-amber-50/10';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
    badgeLabel = 'Đang giao';
  }

  return (
    <div
      id={`card-${delivery.id}`}
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-white border ${borderClass} rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all select-none cursor-grab active:cursor-grabbing text-left space-y-2 ${isDragging ? 'opacity-40 border-dashed border-blue-400 rotate-2 scale-95' : ''}`}
      onClick={(e) => {
        // Only click if not dragging
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Target handle header */}
      <div {...attributes} {...listeners} className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5 cursor-move">
        <span className="font-mono text-2xs font-bold text-slate-800 tracking-tight flex items-center gap-1">
          {delivery.deliveryId}
        </span>
        <span className={`px-1.5 h-4 inline-flex items-center rounded text-3xs font-bold border uppercase tracking-wider ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-bold text-slate-800 line-clamp-1 truncate" title={delivery.tenKhachHang}>
          {delivery.tenKhachHang}
        </div>
        
        {delivery.soDonHang && (
          <div className="text-2xs text-slate-600 font-mono flex items-center gap-1">
            <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold text-3xs uppercase">ĐH</span>
            {delivery.soDonHang}
          </div>
        )}

        {delivery.nguoiPhuTrach && (
          <div className="text-2xs text-slate-600 flex items-center gap-1">
            <User size={10} className="text-slate-400" />
            <span className="truncate">{delivery.nguoiPhuTrach}</span>
          </div>
        )}

        {delivery.products && delivery.products.length > 0 && (
          <div className="text-2xs text-slate-600 font-medium truncate bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 mt-1">
            {delivery.products[0].productName}
            {delivery.products.length > 1 && ` (+${delivery.products.length - 1} loại)`}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Droppable Day Column
// ----------------------------------------------------------------------
interface DroppableDayColumnProps {
  dayLabel: string;
  dateStr: string;
  isToday: boolean;
  deliveries: Delivery[];
  onSelectDelivery: (delivery: Delivery) => void;
}

const DroppableDayColumn: React.FC<DroppableDayColumnProps> = ({
  dayLabel,
  dateStr,
  isToday,
  deliveries,
  onSelectDelivery
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
  });

  const displayDateFormatted = useMemo(() => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }, [dateStr]);

  return (
    <div
      id={`col-${dateStr}`}
      ref={setNodeRef}
      className={`flex flex-col flex-1 h-full min-h-[500px] border-r border-slate-100 last:border-r-0 transition-colors ${isOver ? 'bg-blue-50/40 border-dashed border-blue-200' : isToday ? 'bg-slate-50/50' : 'bg-white'}`}
    >
      {/* Day Header */}
      <div className={`p-3 border-b border-slate-100 flex flex-col items-center justify-center shrink-0 text-center select-none ${isToday ? 'bg-slate-100/50 border-b-slate-200' : ''}`}>
        <span className={`text-2xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-700 font-extrabold' : 'text-slate-500'}`}>
          {dayLabel}
        </span>
        <div className={`mt-1 flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold ${isToday ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-800'}`}>
          {displayDateFormatted.split('/')[0]}
        </div>
      </div>

      {/* Cards List container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[400px]">
        {deliveries.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4 text-center select-none opacity-40">
            <span className="text-2xs font-medium text-slate-600 font-mono">--- Trống ---</span>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <DraggableDeliveryCard
              key={delivery.id}
              delivery={delivery}
              onClick={() => onSelectDelivery(delivery)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Calendar Week Component Main
// ----------------------------------------------------------------------
export default function DeliveryCalendarWeek({
  deliveries,
  onReschedule,
  onSelectDelivery
}: CalendarWeekProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));

  // Sensors for drag threshold to avoid conflict with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before starting drag operation
      },
    })
  );

  // Generate 7 days for the current week starting Monday
  const weekDays = useMemo(() => {
    const days: { label: string; dateStr: string; isToday: boolean }[] = [];
    const todayStr = formatISODate(new Date());

    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(currentWeekStart);
      nextDay.setDate(currentWeekStart.getDate() + i);
      const dateStr = formatISODate(nextDay);
      days.push({
        label: DAY_LABELS[i],
        dateStr,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [currentWeekStart]);

  // Distribute deliveries into day lists
  const distributedDeliveries = useMemo(() => {
    const map: Record<string, Delivery[]> = {};
    weekDays.forEach(d => {
      map[d.dateStr] = [];
    });

    deliveries.forEach((d) => {
      // Use expect delivery date (ngayGiaoMay) as reference
      if (d.ngayGiaoMay) {
        const datePart = d.ngayGiaoMay.trim();
        if (map[datePart]) {
          map[datePart].push(d);
        }
      }
    });

    return map;
  }, [deliveries, weekDays]);

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const prevWeek = new Date(prev);
      prevWeek.setDate(prev.getDate() - 7);
      return prevWeek;
    });
  };

  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const deliveryId = active.id as string;
    const newDateStr = over.id as string;

    // Retrieve original delivery expected date
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    if (delivery.ngayGiaoMay === newDateStr) return; // Unchanged

    // Opt-in check
    if (delivery.ngayGiaoThucTe) {
      // Don't drag-drop completed deliveries
      return;
    }

    // Trigger update
    await onReschedule(deliveryId, newDateStr);
  };

  return (
    <div id="delivery-calendar-week" className="flex flex-col h-full overflow-hidden bg-white">
      {/* Calendar Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 select-none shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-1.5">
          <CalendarIcon size={16} className="text-slate-600" />
          <span className="text-xs font-bold text-slate-800">
            Tuần của {formatDate(formatISODate(currentWeekStart))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            aria-label="Tuần trước"
            onClick={handlePrevWeek} 
            className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </Button>

          <Button 
            aria-label="Hôm nay"
            onClick={handleToday} 
            className="p-1 px-3 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Hôm nay
          </Button>

          <Button 
            aria-label="Tuần sau"
            onClick={handleNextWeek} 
            className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      {/* Dnd Kit Context Wrap Day Grid */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          <div className="flex min-w-[1000px] h-full items-stretch">
            {weekDays.map((day) => (
              <DroppableDayColumn
                key={day.dateStr}
                dayLabel={day.label}
                dateStr={day.dateStr}
                isToday={day.isToday}
                deliveries={distributedDeliveries[day.dateStr] || []}
                onSelectDelivery={onSelectDelivery}
              />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
