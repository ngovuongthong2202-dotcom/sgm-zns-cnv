import React from 'react';

type MicroChartProps = {
  data: number[];
  type?: 'line' | 'bar' | 'donut';
  color?: string;
  height?: number;
  width?: number;
};

export function MicroChart({ data, type = 'line', color = 'currentColor', height = 24, width = 64 }: MicroChartProps) {
  if (!data?.length) return <div style={{width, height}} className="bg-slate-50 rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  if (type === 'bar') {
    const barW = width / data.length;
    return (
      <svg width={width} height={height} className="overflow-visible">
        {data.map((d, i) => {
          const h = Math.max(1, ((d - min) / range) * height);
          return <rect key={i} x={i * barW} y={height - h} width={Math.max(1, barW - 1)} height={h} fill={color} className="opacity-80 hover:opacity-100 transition-opacity" />;
        })}
      </svg>
    );
  }
  
  if (type === 'donut') {
    const total = data.reduce((a, b) => a + b, 0);
    const size = Math.min(width, height);
    const _r = size / 2;
    let acc = 0;
    return (
      <svg width={size} height={size} viewBox={`-1 -1 2 2`} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const ratio = d / total;
          const a1 = acc * Math.PI * 2;
          const a2 = (acc + ratio) * Math.PI * 2;
          acc += ratio;
          const largeArc = ratio > 0.5 ? 1 : 0;
          const dStr = `M ${Math.cos(a1)} ${Math.sin(a1)} A 1 1 0 ${largeArc} 1 ${Math.cos(a2)} ${Math.sin(a2)} L 0 0`;
          return <path key={i} d={dStr} fill={i === 0 ? color : `rgba(0,0,0,${0.1 + i*0.1})`} />;
        })}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
    );
  }

  // Sparkline
  const step = width / (data.length - 1 || 1);
  const points = data.map((d, i) => `${i * step},${height - ((d - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
