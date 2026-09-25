import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileIcon } from 'lucide-react';
import { PrintLayout } from './PrintLayout';
import { useReactToPrint } from 'react-to-print';
import { Button } from './Button';
import toast from 'react-hot-toast';

interface ExportMenuProps {
  data: any[]; 
  filename?: string;
  columns?: { key: string; header: string }[];
}

export function ExportMenu({ data, filename = 'export', columns }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../../workers/export.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { status, data, filename, type, message } = e.data;
      
      if (status === 'done') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setIsOpen(false);
        toast.success(`Đã tải xuống ${filename}`);
      } else if (status === 'error') {
        console.error('Export error:', message);
        toast.error('Lỗi khi xuất file');
        setIsExporting(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const getExportData = () => {
    if (!columns) return data;
    return data.map(item => {
      const row: any = {}; 
      columns.forEach(col => {
        row[col.header] = item[col.key];
      });
      return row;
    });
  };

  const exportCSV = () => {
    setIsExporting(true);
    setExportProgress(100);
    workerRef.current?.postMessage({ action: 'exportCSV', data: getExportData(), filename });
  };

  const exportXLSX = () => {
    setIsExporting(true);
    setExportProgress(100);
    workerRef.current?.postMessage({ action: 'exportXLSX', data: getExportData(), filename });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: filename,
    onAfterPrint: () => setIsOpen(false),
  });

  return (
    <div className="relative z-50">
      <Button variant="ghost"
         onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border bg-white border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-accent focus:outline-none"
        aria-label="Export Data"
        aria-expanded={isOpen}
      >
        <Download className="w-4 h-4" />
        Export
      </Button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-48 bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden p-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <Button variant="ghost" 
            onClick={exportCSV}
            className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-slate-50 rounded-lg focus:bg-slate-50 focus:outline-none"
           aria-label="CSV Export">
            <FileText className="w-4 h-4 mr-2 text-slate-600" />
            CSV Export
          </Button>
          <Button variant="ghost" 
            onClick={exportXLSX}
            disabled={isExporting}
            className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-slate-50 rounded-lg disabled:opacity-50 focus:bg-slate-50 focus:outline-none"
           aria-label="Hành động">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            {isExporting ? 'Generating...' : 'Excel (XLSX)'}
          </Button>
          <Button variant="ghost" 
            aria-label="Hành động" onClick={() => handlePrint()}
            className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-slate-50 rounded-lg focus:bg-slate-50 focus:outline-none"
          >
            <FileIcon className="w-4 h-4 mr-2 text-red-700" />
            Print / PDF
          </Button>
        </div>
      )}

      {/* Hidden print layout component */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintLayout title={filename}>
            <table className="w-full text-left border-collapse border border-slate-200 mt-4 leading-relaxed font-sans">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                                    {(columns || Object.keys(data[0] || {})).map((col: any, i) => ( 
                    <th key={i} className="p-2 border-r border-slate-200 font-semibold">{col.header || col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i} className="border-b border-slate-200 text-sm">
                                        {(columns || Object.keys(item)).map((col: any, j) => ( 
                      <td key={j} className="p-2 border-r border-slate-200">
                        {String(item[col.key || col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintLayout>
        </div>
      </div>
    </div>
  );
}
