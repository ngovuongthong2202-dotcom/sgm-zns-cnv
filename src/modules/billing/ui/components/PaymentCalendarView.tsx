import { Button } from '@/src/design-system';
import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Payment } from '@/src/domain/schema/payment.schema';

interface PaymentCalendarViewProps {
  payments: Payment[];
  onSelectPayment: (payment: Payment) => void;
}

export function PaymentCalendarView({ payments, onSelectPayment }: PaymentCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'MONTH' | 'WEEK'>('MONTH');
  const [selectedDayPayments, setSelectedDayPayments] = useState<{ date: Date; items: Payment[] } | null>(null);

  // Group payments by date
  const paymentsByDate = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    payments.forEach(p => {
      if (!p.ngayThanhToan && !p.ngayDenHan) return;
      const dateStr = p.ngayThanhToan || p.ngayDenHan || '';
      try {
        const d = new Date(dateStr);
        const key = format(d, 'yyyy-MM-dd');
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      } catch {
        // ignore invalid dates
      }
    });
    return groups;
  }, [payments]);

  // Calendar calculations
  const days = useMemo(() => {
    if (viewType === 'MONTH') {
      const startMonth = startOfMonth(currentDate);
      const endMonth = endOfMonth(currentDate);
      const startCal = startOfWeek(startMonth, { weekStartsOn: 1 });
      const endCal = endOfWeek(endMonth, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startCal, end: endCal });
    } else {
      const startW = startOfWeek(currentDate, { weekStartsOn: 1 });
      const endW = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startW, end: endW });
    }
  }, [currentDate, viewType]);

  const handlePrev = () => {
    setCurrentDate(prev => viewType === 'MONTH' ? subMonths(prev, 1) : subWeeks(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewType === 'MONTH' ? addMonths(prev, 1) : addWeeks(prev, 1));
  };

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="flex flex-col h-full bg-white select-none relative min-h-0">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900 tracking-tight capitalize">
            {format(currentDate, viewType === 'MONTH' ? 'MMMM yyyy' : 'ww - yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggles */}
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
            <button
              type="button"
              onClick={() => { setViewType('MONTH'); setSelectedDayPayments(null); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-0 ${viewType === 'MONTH' ? 'bg-white shadow-xs text-slate-900' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => { setViewType('WEEK'); setSelectedDayPayments(null); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-0 ${viewType === 'WEEK' ? 'bg-white shadow-xs text-slate-900' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
            >
              Tuần
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <button type="button" onClick={handlePrev} className="p-1 px-2.5 hover:bg-slate-50 text-slate-600 border-r border-slate-200 transition-colors bg-white cursor-pointer" aria-label="Tháng trước">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-semibold hover:bg-slate-50 text-slate-700 transition-colors border-r border-slate-200 bg-white cursor-pointer">
              Hôm nay
            </button>
            <button type="button" onClick={handleNext} className="p-1 px-2.5 hover:bg-slate-50 text-slate-600 transition-colors bg-white cursor-pointer" aria-label="Tháng sau">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid + Side List Panel */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Grid View */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* Day of week labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {dayNames.map(name => (
              <span key={name} className="text-2xs font-bold text-slate-600 uppercase tracking-wider py-1.5">{name}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 auto-rows-[90px] md:auto-rows-[110px]">
            {days.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayItems = paymentsByDate[dayStr] || [];
              const isTodayDay = isToday(day);
              const isSelected = selectedDayPayments && isSameDay(selectedDayPayments.date, day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              // Calculate total collected vs debt
              const collected = dayItems.filter(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN').reduce((sum, curr) => sum + (curr.soTien || 0), 0);
              const debt = dayItems.filter(p => p.tinhTrangThanhToan !== 'Tất toán' && p.tinhTrangThanhToan !== 'ĐÃ THANH TOÁN' && p.tinhTrangThanhToan !== 'Miễn phí').reduce((sum, curr) => sum + (curr.soTien || 0), 0);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayPayments({ date: day, items: dayItems })}
                  className={`border rounded-xl p-2 flex flex-col justify-between cursor-pointer transition-all hover:border-slate-800 ${
                    isSelected 
                      ? 'border-slate-900 ring-2 ring-slate-900/5 bg-slate-50/50' 
                      : isTodayDay 
                      ? 'border-blue-600 bg-blue-50/10' 
                      : isCurrentMonth
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-100 bg-slate-50/10 text-slate-500 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold leading-none w-5 h-5 flex items-center justify-center rounded-md ${isTodayDay ? 'bg-blue-600 text-white font-bold' : isSelected ? 'bg-slate-900 text-white' : 'text-slate-800'}`}>
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-3xs font-bold px-1.5 h-4 flex items-center bg-slate-100 text-slate-600 rounded-lg">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {dayItems.length > 0 ? (
                    <div className="space-y-0.5 text-right w-full overflow-hidden shrink-0 mt-1">
                      {collected > 0 && (
                        <div className="text-2xs font-bold text-emerald-700 font-mono tracking-tight truncate leading-none">
                          +{new Intl.NumberFormat('vi-VN').format(collected)} ₫
                        </div>
                      )}
                      {debt > 0 && (
                        <div className="text-2xs font-semibold text-slate-600 font-mono tracking-tight truncate leading-none">
                          {new Intl.NumberFormat('vi-VN').format(debt)} ₫
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Payments Drawer List Panel (Side panel) */}
        {selectedDayPayments && (
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/40 flex flex-col shrink-0 min-h-[250px] overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chi tiết ngày {format(selectedDayPayments.date, 'dd/MM/yyyy')}</h3>
                <p className="text-xs text-slate-500">{selectedDayPayments.items.length} phiếu thu ghi nhận</p>
              </div>
              <Button onClick={() => setSelectedDayPayments(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">Đóng</Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {selectedDayPayments.items.length === 0 ? (
                <div className="text-center py-10 text-xs italic text-slate-500 font-medium">Không có phiếu thu nào trong ngày này.</div>
              ) : (
                selectedDayPayments.items.map(p => {
                  const isPaid = p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN';
                  return (
                    <div 
                      key={p.id}
                      onClick={() => onSelectPayment(p)}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-800 cursor-pointer shadow-2xs hover:shadow-xs transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 truncate">{p.paymentId}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold ${isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {p.tinhTrangThanhToan || 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate">{p.tenKhachHang || 'N/A'}</div>
                      <div className="flex items-center justify-between text-2xs text-slate-600 font-medium">
                        <span>{p.phuongThucThanhToan || 'N/A'}</span>
                        <strong className="text-slate-900 font-bold font-mono text-xs text-right tabular-nums">{new Intl.NumberFormat('vi-VN').format(p.soTien || 0)} ₫</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
