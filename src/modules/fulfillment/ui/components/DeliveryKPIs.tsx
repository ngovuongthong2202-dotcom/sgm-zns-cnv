import React from 'react';
import { KPICard } from '@/src/design-system/KPICard';
import { AlertTriangle, Coins, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useDeliveriesKpis } from '../hooks/useDeliveriesKpis';

export type DeliveryKpiData = ReturnType<typeof useDeliveriesKpis>;

interface DeliveryKPIsProps {
  kpis: DeliveryKpiData;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  selectedSchedule: string;
  setSelectedSchedule: (val: string) => void;
}

export function DeliveryKPIs({ kpis, selectedStatus, setSelectedStatus, selectedSchedule, setSelectedSchedule }: DeliveryKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-2.5 select-none">
      <KPICard
        title="Tổng PGH chưa giao"
        value={String(kpis.inTransit.d)}
        subtitle={`${kpis.inTransit.c} Khách hàng • ${kpis.inTransit.p} Tỉnh thành`}
        icon={<Coins />}
        color="amber"
        isActive={selectedStatus === 'ongoing' || selectedStatus === 'pending'}
        onClick={() => {
          setSelectedStatus(selectedStatus === 'ongoing' ? '' : 'ongoing');
        }}
      />
      <KPICard
        title="Hoàn tất giao hàng"
        value={String(kpis.completed.c)}
        subtitle={`Trên tổng số ${kpis.completed.d} PGH`}
        icon={<CheckCircle2 />}
        color="emerald"
        isActive={selectedStatus === 'completed'}
        onClick={() => {
          setSelectedStatus(selectedStatus === 'completed' ? '' : 'completed');
        }}
      />
      <KPICard
        title="Trễ hạn giao hàng"
        value={String(kpis.late.c)}
        subtitle={`Gồm ${kpis.late.d} PGH chậm trễ`}
        icon={<AlertTriangle />}
        color="red"
        isActive={selectedSchedule === 'late'}
        onClick={() => {
          setSelectedSchedule(selectedSchedule === 'late' ? '' : 'late');
        }}
      />
      <KPICard
        title="Đúng hạn (On-time)"
        value={String(kpis.onTime.c)}
        subtitle={`Gồm ${kpis.onTime.d} PGH đúng lịch`}
        icon={<CalendarDays />}
        color="blue"
        isActive={selectedSchedule === 'on_time'}
        onClick={() => {
          setSelectedSchedule(selectedSchedule === 'on_time' ? '' : 'on_time');
        }}
      />
    </div>
  );
}
