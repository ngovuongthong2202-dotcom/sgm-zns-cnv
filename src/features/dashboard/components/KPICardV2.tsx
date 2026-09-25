import { Button } from '@/src/design-system';
import React, { Suspense } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const LazyKPICardChart = React.lazy(() => import('./KPICardChart'));

interface KPICardV2Props {
  label: string;
  value: string | number;
  delta: string;
  isTrendUp: boolean;
  sparklineData: number[];
  onClick: () => void;
  loading?: boolean;
}

export function KPICardV2({
  label,
  value,
  delta,
  isTrendUp,
  sparklineData,
  onClick,
  loading = false,
}: KPICardV2Props) {
  if (loading) {
    return (
      <div className="h-[112px] p-5 bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-pulse flex flex-col justify-between">
        <div className="h-3 bg-slate-100 rounded w-24"></div>
        <div className="h-7 bg-slate-100 rounded w-32 mt-2"></div>
        <div className="h-4 bg-slate-100 rounded-md w-full mt-2"></div>
      </div>
    );
  }

  // Pre-bake sparkline points structure
  const chartData = sparklineData.map((val, idx) => ({ idx, v: val }));

  return (
    <Button
      onClick={onClick}
      className="h-[112px] p-5 bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-slate-350 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900/5 group"
     variant="secondary">
      {/* Top row: Label */}
      <div className="flex items-center justify-between">
        <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider select-none leading-none">
          {label}
        </span>
      </div>

      {/* Middle row: Value & Delta */}
      <div className="flex items-baseline justify-between mt-1 select-none">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums leading-none">
            {value}
          </span>
          <span
            className={`inline-flex items-center text-xs font-semibold gap-0.5 leading-none px-1.5 py-0.5 rounded ${
              isTrendUp
                ? 'bg-emerald-50/70 text-emerald-800'
                : 'bg-red-50/70 text-red-650'
            }`}
          >
            {isTrendUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {delta}
          </span>
        </div>
      </div>

      {/* Bottom row: Sparkline */}
      <div className="h-7 w-full mt-2 overflow-hidden opacity-85 group-hover:opacity-100 transition-opacity">
        <Suspense fallback={<div className="w-full h-full bg-blue-50/30 rounded-full" />}>
          <LazyKPICardChart data={chartData} id={`sparkline-${label.replace(/\s+/g, '')}`} />
        </Suspense>
      </div>
    </Button>
  );
}

export default KPICardV2;
