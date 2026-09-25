import { Button } from '@/src/design-system';
import React from 'react';
import { LayoutGrid, Layers, StretchHorizontal } from 'lucide-react';

export type Density = 'compact' | 'normal' | 'comfortable';

interface DensityToggleProps {
  density: Density;
  onChange: (density: 'compact' | 'normal' | 'comfortable') => void;
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  const activeValue: 'compact' | 'normal' | 'comfortable' = density;

  const options: { value: 'compact' | 'normal' | 'comfortable'; icon: React.ReactNode; label: string }[] = [
    { value: 'compact', icon: <StretchHorizontal className="w-3.5 h-3.5" />, label: 'Compact (32px)' },
    { value: 'normal', icon: <Layers className="w-3.5 h-3.5" />, label: 'Normal (40px)' },
    { value: 'comfortable', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Comfortable (48px)' },
  ];

  return (
    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none items-center h-8">
      {options.map((opt) => {
        const isSelected = activeValue === opt.value;
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="xs"
            iconOnly
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all outline-none border-none ${
              isSelected
                ? 'bg-white shadow-xs text-blue-600 font-semibold border border-slate-200/80 hover:bg-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            aria-label={opt.label}
            aria-pressed={isSelected}
          >
            {opt.icon}
          </Button>
        );
      })}
    </div>
  );
}
export default DensityToggle;
