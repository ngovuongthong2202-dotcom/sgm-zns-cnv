import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';

export interface SparklineData {
  name: string;
  value: number;
}

interface SparklineBarProps {
  data: SparklineData[];
  color?: string;
  width?: number | string;
  height?: number;
}
const CustomTooltip = ({ active, payload }: any) => { 
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-50">
        <span className="font-semibold">{payload[0].payload.name}: </span>
        {payload[0].value}
      </div>
    );
  }
  return null;
};

export function SparklineBar({ data, color = '#3b82f6', width = 120, height = 32 }: SparklineBarProps) {
  return (
    <div style={{ width, height }} className="overflow-visible z-10" onClick={(e) => e.stopPropagation()}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'transparent' }}
            isAnimationActive={false}
          />
          <Bar dataKey="value" radius={[2, 2, 2, 2]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value > 0 ? color : '#e2e8f0'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
