import React from 'react';

/**
 * Utility component to render a printer-friendly layout for the current page contents.
 * Wrap the main content to automatically hide sidebars and navbars when printing.
 */
export function PrintLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="print-layout contents">
      {/* A header that only shows up when printing */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-black" style={{ breakInside: 'avoid' }}>
         <div className="flex justify-between items-end">
           <div>
             <h1 className="text-3xl font-bold uppercase tracking-wider text-black">{title || 'Báo Cáo Dữ Liệu'}</h1>
             <p className="text-sm font-medium text-gray-800 mt-1">Trích xuất ngày: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}</p>
           </div>
           <div className="text-right text-sm">
             <p className="font-bold">ZNS SGM ENTERPRISE</p>
             <p>Lưu hành Nội bô</p>
           </div>
         </div>
      </div>
      
      <div className="print:m-0 print:p-0 print-content">
        {children}
      </div>

      <div className="hidden print:flex justify-between mt-16 pt-8 break-inside-avoid border-t border-black pb-4">
         <div className="text-center w-48">
            <p className="font-bold mb-16 uppercase text-sm">Người Lập</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
         </div>
         <div className="text-center w-48 relative">
            <p className="font-bold mb-16 uppercase text-sm">Phụ trách / Giám Đốc</p>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-70 w-24 h-24 border-4 border-red-600 rounded-full flex items-center justify-center -rotate-12 pointer-events-none mix-blend-multiply">
               <div className="text-red-700 text-2xs font-bold text-center leading-tight uppercase font-serif">
                 SGM VN<br/>APPROVED
               </div>
            </div>
            <p className="text-xs italic">(Ký, đóng dấu)</p>
         </div>
         <div className="text-center w-32 flex flex-col items-center">
            <div className="w-24 h-24 border-2 border-black p-1">
              {/* Fake QR code SVG for print layout */}
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black">
                <rect x="0" y="0" width="30" height="30" fill="currentColor"/>
                <rect x="70" y="0" width="30" height="30" fill="currentColor"/>
                <rect x="0" y="70" width="30" height="30" fill="currentColor"/>
                <rect x="10" y="10" width="10" height="10" fill="white"/>
                <rect x="80" y="10" width="10" height="10" fill="white"/>
                <rect x="10" y="80" width="10" height="10" fill="white"/>
                <rect x="40" y="40" width="20" height="20" fill="currentColor"/>
                <rect x="70" y="70" width="10" height="10" fill="currentColor"/>
                <rect x="50" y="70" width="10" height="10" fill="currentColor"/>
                <rect x="40" y="10" width="20" height="10" fill="currentColor"/>
                <rect x="10" y="40" width="20" height="10" fill="currentColor"/>
                <rect x="80" y="40" width="10" height="20" fill="currentColor"/>
              </svg>
            </div>
            <p className="text-2xs mt-2 font-mono break-all cursor-text text-black">Scan to verify</p>
         </div>
      </div>
    </div>
  );
}

