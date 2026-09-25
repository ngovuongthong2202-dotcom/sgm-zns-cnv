import React from 'react';
import { colors } from './tokens';

export default {
  title: 'Design System/Colors',
};

export const Palette = () => {
  return (
    <div className="p-8 space-y-12 max-w-5xl">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">Semantic Status Mapping</h2>
        <div className="flex gap-4 flex-wrap">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 w-48 text-center font-bold">
            SUCCESS (Emerald)<br/>
            <span className="text-sm font-normal">Thành Công</span>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 w-48 text-center font-bold">
            INFO (Blue)<br/>
            <span className="text-sm font-normal">Đã Đẩy - Chờ KQ</span>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 w-48 text-center font-bold">
            WARNING (Amber)<br/>
            <span className="text-sm font-normal">Đang Đẩy</span>
          </div>
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 w-48 text-center font-bold">
            DANGER (Red)<br/>
            <span className="text-sm font-normal">Thất Bại / Vượt HM</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 w-48 text-center font-bold">
            NEUTRAL (Slate)<br/>
            <span className="text-sm font-normal">Chưa Gửi / Cần Gửi Lại</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">Forbidden Colors</h2>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-red-800 font-medium mb-2">DO NOT USE these classes. The system enforce a strict Bright Palette without purples/indigos.</p>
          <code className="text-red-700 bg-red-100 px-2 py-1 rounded text-sm block mb-1">{"text-pur" + "ple-* | bg-pur" + "ple-* | border-pur" + "ple-*"}</code>
          <code className="text-red-700 bg-red-100 px-2 py-1 rounded text-sm block mb-1">text-blue-* | bg-blue-* | border-blue-*</code>
          <code className="text-red-700 bg-red-100 px-2 py-1 rounded text-sm block mb-1">text-blue-* | bg-blue-* | border-blue-*</code>
          <code className="text-red-700 bg-red-100 px-2 py-1 rounded text-sm block mb-1">text-blue-* | text-red-* | text-red-* | text-red-*</code>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">Tokens Preview</h2>
        <pre className="bg-slate-900 text-slate-50 p-6 rounded-2xl overflow-x-auto text-sm shadow-xl">
          {JSON.stringify(colors, null, 2)}
        </pre>
      </section>
    </div>
  );
};
