import React from 'react';
import { MapPin, Globe, Phone, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

export function TrackingFooter() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
        {/* Left column: Legal details & quick contacts */}
        <div className="space-y-2 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-3xs font-bold uppercase tracking-wider border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Cổng Tra Cứu Thương Mại Chính Thức • Saigon Machine (SGM OS)</span>
          </div>
          
          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN
          </h4>
          <div className="text-3xs sm:text-2xs font-semibold text-slate-500 uppercase tracking-wide">
            SAIGON INDUSTRIAL METALLIC CO.,LTD • SAIGON MACHINE
          </div>

          <div className="text-2xs text-slate-600 space-y-1 pt-1">
            <p className="flex items-center justify-center md:justify-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>Địa chỉ:</strong> Lô 12A Đường số 09, Khu Công Nghiệp Tân Tạo, P. Tân Tạo, TP. Hồ Chí Minh</span>
            </p>
            <p className="flex items-center justify-center md:justify-start gap-3 text-3xs sm:text-2xs">
              <span>Hotline: <a href="tel:0932000999" className="text-emerald-700 font-bold hover:underline tabular-nums">0932.000.999</a></span>
              <span className="text-slate-300">•</span>
              <span>Email: <a href="mailto:info@saigonmachine.vn" className="text-slate-700 font-medium hover:underline">info@saigonmachine.vn</a></span>
            </p>
          </div>

          {/* Quick links */}
          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
            <a
              href="https://maps.app.goo.gl/3fiZGV9W5t4StrT2A"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
            >
              <MapPin className="w-3 h-3 text-red-500" />
              <span>Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            <a
              href="https://saigonmachine.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
            >
              <Globe className="w-3 h-3 text-emerald-600" />
              <span>saigonmachine.vn</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            <a
              href="tel:0932000999"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
            >
              <Phone className="w-3 h-3" />
              <span className="tabular-nums">0932.000.999</span>
            </a>
          </div>
        </div>

        {/* Right column: Zalo & Facebook QR */}
        <div className="flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
          <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Quét QR Hỗ Trợ 24/7</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://oa.zalo.me/1336150047301360288"
              target="_blank"
              rel="noopener noreferrer"
              title="Mở Zalo OA Saigon Machine"
              className="group flex flex-col items-center p-2 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200 transition-all text-center"
            >
              <img 
                src="/qr-zalo.png" 
                alt="QR Zalo OA" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg bg-white p-0.5 border border-sky-300 shadow-2xs group-hover:scale-105 transition-transform"
              />
              <span className="mt-1 text-4xs font-bold text-sky-800 flex items-center gap-0.5">
                Zalo OA <ExternalLink className="w-2 h-2 text-sky-600" />
              </span>
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Mở Facebook Saigon Machine"
              className="group flex flex-col items-center p-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 transition-all text-center"
            >
              <img 
                src="/qr-facebook.png" 
                alt="QR Facebook" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg bg-white p-0.5 border border-blue-300 shadow-2xs group-hover:scale-105 transition-transform"
              />
              <span className="mt-1 text-4xs font-bold text-blue-800 flex items-center gap-0.5">
                Facebook <ExternalLink className="w-2 h-2 text-blue-600" />
              </span>
            </a>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 text-center text-3xs text-slate-400">
        © 2026 CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN (SGM OS) • CỔNG TRA CỨU ĐIỆN TỬ
      </div>
    </div>
  );
}
