import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export type KPICardVariant = 'number' | 'trend' | 'goal';

interface KPICardProps {
  title: string;
  value: string | number;
  variant?: KPICardVariant;
  trend?: number; // positive or negative percentage
  goal?: number; // target value
  progress?: number; // 0-100
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  subtitle?: string;
  color?: 'default' | 'blue' | 'emerald' | 'amber' | 'red';
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  variant = 'number', 
  trend, 
  goal, 
  progress, 
  icon,
  onClick,
  isActive = false,
  subtitle,
  color = 'default',
  className = ''
}: KPICardProps) {
  const isUp = trend !== undefined && trend > 0;
  const isDown = trend !== undefined && trend < 0;

  let activeClasses;
  let dotAnimationBg = '';
  let dotBg = '';
  
  if (isActive) {
    if (color === 'emerald') {
      activeClasses = 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500/25 shadow-xs';
      dotAnimationBg = 'bg-emerald-400';
      dotBg = 'bg-emerald-500';
    } else if (color === 'amber') {
      activeClasses = 'border-amber-500 bg-amber-50/10 ring-1 ring-amber-500/25 shadow-xs';
      dotAnimationBg = 'bg-amber-400';
      dotBg = 'bg-amber-500';
    } else if (color === 'red') {
      activeClasses = 'border-red-500 bg-red-50/10 ring-1 ring-red-500/25 shadow-xs';
      dotAnimationBg = 'bg-red-400';
      dotBg = 'bg-red-500';
    } else {
      activeClasses = 'border-blue-500 bg-blue-50/10 ring-1 ring-blue-500/25 shadow-xs';
      dotAnimationBg = 'bg-blue-400';
      dotBg = 'bg-blue-500';
    }
  } else {
    activeClasses = 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs';
  }

  const clickableClasses = onClick 
    ? 'cursor-pointer active:scale-[0.99] transition-all hover:bg-slate-50' 
    : '';

  return (
    <div 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative border rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col h-full select-none duration-150 ${activeClasses} ${clickableClasses} ${className}`}
      aria-label={`${title}: ${value} ${isActive ? '(Đang kích hoạt bộ lọc)' : ''}`}
    >
      {isActive && (
        <span className="absolute top-2.5 right-2.5 flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotAnimationBg}`}></span>
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotBg}`}></span>
        </span>
      )}

      <div className="flex justify-between items-start mb-3 pr-2">
        <h3 className="text-xs font-semibold text-slate-500 leading-normal">{title}</h3>
        {icon && (
          <div className="text-slate-400 p-1 bg-slate-50 border border-slate-100 rounded-md [&_svg]:w-4 [&_svg]:h-4">
            {icon}
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans mt-auto leading-none mb-2 select-all">
        {value}
      </div>

      {subtitle && (
        <div className="text-2xs text-slate-500 mt-1 font-sans">{subtitle}</div>
      )}
      
      {variant === 'trend' && trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-auto">
          <div 
            className={`inline-flex items-center h-5 px-1.5 rounded text-2xs font-medium gap-0.5 ${
              isUp 
                ? 'bg-emerald-50 text-emerald-700' 
                : isDown 
                  ? 'bg-red-50 text-red-700' 
                  : 'bg-slate-50 text-slate-600'
            }`}
          >
            {isUp && <ArrowUpRight className="w-3 h-3 shrink-0" />}
            {isDown && <ArrowDownRight className="w-3 h-3 shrink-0" />}
            {!isUp && !isDown && <Minus className="w-3 h-3 shrink-0" />}
            <span>{Math.abs(trend)}%</span>
          </div>
          <span className="text-2xs text-slate-500 font-normal">so với kỳ trước</span>
        </div>
      )}
      
      {variant === 'goal' && goal !== undefined && progress !== undefined && (
        <div className="mt-auto pt-1 select-none">
          <div className="flex justify-between text-2xs text-slate-500 mb-1 font-medium">
            <span>Tiến độ: {progress}%</span>
            <span>Mục tiêu: {goal}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
