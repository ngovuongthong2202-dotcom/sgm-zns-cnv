import React from 'react';
import { Hexagon, Component, Blocks } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Thông tin Hệ thống</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          SGM OS - Hệ thống Quản trị Thông minh
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
             <Hexagon size={24} className="text-blue-600 mb-4" />
             <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Version</p>
             <p className="text-lg font-mono font-medium text-slate-900">v2.5.0-alpha</p>
         </div>
         <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
             <Component size={24} className="text-slate-700 mb-4" />
             <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Environment</p>
             <p className="text-lg font-mono font-medium text-slate-900 capitalize">{((import.meta as any).env?.MODE) || 'production'}</p>
         </div>
         <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
             <Blocks size={24} className="text-blue-700 mb-4" />
             <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">React & Tailwind</p>
             <p className="text-lg font-mono font-medium text-slate-900">v19.x / v4.x</p>
         </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-8 text-white/80 space-y-4">
         <h3 className="font-semibold text-white text-lg tracking-tight">System Architecture</h3>
         <div className="text-xs font-mono leading-relaxed space-y-2">
            <p><span className="text-blue-500 font-medium">1.</span> State Management: SWR + Hooks + Supabase Realtime</p>
            <p><span className="text-blue-500 font-medium">2.</span> Design System: Custom Component Library w/ Tailwind v4</p>
            <p><span className="text-blue-500 font-medium">3.</span> Table Engine: TanStack Table v8 + Virtualizer + DataViewEngine</p>
            <p><span className="text-blue-500 font-medium">4.</span> ZNS Workflow: Event-Sourcing with Cloud Run & Background Worker</p>
         </div>
      </div>
    </div>
  );
}
