import React from 'react';
import { Activity, Zap, AlertTriangle, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { KPICard } from '@/src/design-system/KPICard';
import { t } from '@/src/i18n/vi';

interface Props {
  successRate: number;
  totalCount: number;
  dlqCount: number;
  healthPillColor: string;
}

export default function ZnsHubKpiHeader({
  successRate,
  totalCount,
  dlqCount,
}: Props) {
  const isHealthy = successRate >= 95;
  const isWarning = successRate >= 80 && successRate < 95;
  const isDanger = successRate < 80;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 shrink-0 bg-slate-50 border-b border-slate-200">
      <KPICard
        title="System Health"
        value={isHealthy ? t('znshub.health_status.good') : isWarning ? t('znshub.health_status.warning') : t('znshub.health_status.danger')}
        icon={isHealthy ? <ShieldCheck /> : isWarning ? <Shield /> : <ShieldAlert />}
        color={isDanger ? 'red' : isWarning ? 'amber' : 'emerald'}
        isActive={true}
      />
      
      <KPICard
        title={t('znshub.rate_limit')}
        value={`${successRate}%`}
        variant="goal"
        progress={successRate}
        goal={100}
        icon={<Activity />}
        color="blue"
      />

      <KPICard
        title={t('znshub.total_log')}
        value={totalCount}
        icon={<Zap />}
        color="default"
      />

      <KPICard
        title={t('znshub.dlq_count')}
        value={dlqCount}
        icon={<AlertTriangle />}
        color="red"
      />
    </div>
  );
}
