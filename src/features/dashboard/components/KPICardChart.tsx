import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function KPICardChart({ data, id }: { data: any[], id: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 1, right: 1 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#2563EB"
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
