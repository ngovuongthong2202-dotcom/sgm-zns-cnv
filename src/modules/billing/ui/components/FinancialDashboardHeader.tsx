import React from 'react';
import { Coins, FileText, Users, AlertCircle, PieChart } from 'lucide-react';

interface FinancialDashboardHeaderProps {
  collectedToday: number;
  collectedThisWeek: number;
  collectedThisMonth: number;
  collectedThisYear: number;
  totalDebt: number;
  statsByStatus: {
    'Miễn phí': { contracts: number, customers: number },
    'Chưa TT': { contracts: number, customers: number },
    'Công nợ': { contracts: number, customers: number },
    'Tất toán': { contracts: number, customers: number },
  };
  statsByType?: {
    'MÁY': { count: number, customers: number },
    'VẬT TƯ': { count: number, customers: number },
    'DỊCH VỤ': { count: number, customers: number },
    'KHÁC': { count: number, customers: number }
  };
  activeTab?: 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE';
  selectedStatus?: string;
  selectedPhanLoai?: string;
  onFilterTab?: (tab: 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE') => void;
  onFilterStatus?: (status: string) => void;
  onFilterPhanLoai?: (type: string) => void;
}

export function FinancialDashboardHeader({ 
  collectedToday, 
  collectedThisWeek, 
  collectedThisMonth, 
  collectedThisYear,
  totalDebt,
  statsByStatus,
  statsByType,
  activeTab,
  selectedStatus,
  selectedPhanLoai,
  onFilterTab,
  onFilterStatus,
  onFilterPhanLoai
}: FinancialDashboardHeaderProps) {
  const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  // Tính số liệu tổng để hiển thị badge
  const totalContracts = Object.values(statsByStatus).reduce((sum, item) => sum + item.contracts, 0);
  const totalCustomers = Object.values(statsByStatus).reduce((sum, item) => sum + item.customers, 0);
  const totalTypesCount = statsByType 
    ? Object.values(statsByType).reduce((sum, item) => sum + (item.count || 0), 0) 
    : 0;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3 select-none">
      {/* 1. Tổng số Hợp Đồng theo tình trạng */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-col hover:border-slate-300 transition-colors relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-600">
            <FileText size={16} className="text-blue-600" />
            <h3 className="text-2xs font-bold tracking-wider uppercase text-slate-500">Số Hợp Đồng</h3>
            <span className="px-1.5 py-0.2 text-3xs font-black bg-blue-50 text-blue-700 rounded-full border border-blue-100" title="Tổng số hợp đồng">{totalContracts}</span>
          </div>
          {selectedStatus && (
            <button type="button" aria-label="Xem tất cả" onClick={() => onFilterStatus?.('')} className="text-3xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold transition-colors border-0 cursor-pointer">
              Xem tất cả
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-2xs font-medium font-mono mt-auto">
           {['Miễn phí', 'Chưa TT', 'Công nợ', 'Tất toán'].map(st => (
              <div 
                key={st} 
                onClick={() => onFilterStatus?.(selectedStatus === st ? '' : st)}
                className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer transition-colors border ${selectedStatus === st ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400 font-bold text-blue-700' : 'bg-slate-50 border-slate-100 hover:border-blue-350 hover:bg-blue-50/50'}`}
              >
                <span className="text-slate-500 font-sans truncate pr-1" title={st}>{st}</span>
                <span className="text-slate-800">{statsByStatus[st as keyof typeof statsByStatus].contracts}</span>
              </div>
           ))}
        </div>
      </div>

      {/* 2. Tổng số Khách Hàng theo tình trạng */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-col hover:border-slate-300 transition-colors relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Users size={16} className="text-cyan-600" />
            <h3 className="text-2xs font-bold tracking-wider uppercase text-slate-500">Khách Hàng</h3>
            <span className="px-1.5 py-0.2 text-3xs font-black bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100" title="Tổng số khách hàng">{totalCustomers}</span>
          </div>
          {selectedStatus && (
            <button type="button" aria-label="Xem tất cả" onClick={() => onFilterStatus?.('')} className="text-3xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold transition-colors border-0 cursor-pointer">
              Xem tất cả
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-2xs font-medium font-mono mt-auto">
           {['Miễn phí', 'Chưa TT', 'Công nợ', 'Tất toán'].map(st => (
              <div 
                key={st} 
                onClick={() => onFilterStatus?.(selectedStatus === st ? '' : st)}
                className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer transition-colors border ${selectedStatus === st ? 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-400 font-bold text-cyan-700' : 'bg-slate-50 border-slate-100 hover:border-cyan-350 hover:bg-cyan-50/50'}`}
              >
                <span className="text-slate-500 font-sans truncate pr-1" title={st}>{st}</span>
                <span className="text-slate-800">{statsByStatus[st as keyof typeof statsByStatus].customers}</span>
              </div>
           ))}
        </div>
      </div>

      {/* 3. Tình trạng công nợ (Gồm Công nợ tổng + Đã thu) */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-slate-300 transition-colors overflow-hidden relative">
        <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100/60 shrink-0 bg-slate-50/50">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Tình trạng công nợ</span>
        </div>
        
        <div className="flex flex-col divide-y divide-slate-100 flex-1">
          {/* Nửa trên: Công nợ tổng */}
          <div 
            onClick={() => onFilterTab?.(activeTab === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-2.5 py-2 flex items-center justify-between cursor-pointer transition-colors duration-150 ${activeTab === 'PENDING' ? 'bg-amber-50/40 ring-1 ring-inset ring-amber-400' : 'hover:bg-slate-50/40'}`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" /> Công Nợ Tổng
              </span>
              <span className="text-sm font-black font-mono text-amber-700 tracking-tight mt-0.5">{formatMoney(totalDebt)}</span>
            </div>
            {activeTab === 'PENDING' && (
              <span className="text-3xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Đang lọc</span>
            )}
          </div>

          {/* Nửa dưới: Đã thu */}
          <div 
            onClick={() => onFilterTab?.(activeTab === 'PAID' ? 'ALL' : 'PAID')}
            className={`px-2.5 py-1.5 flex flex-col justify-between cursor-pointer transition-colors duration-150 ${activeTab === 'PAID' ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-400' : 'hover:bg-slate-50/40'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={12} className="text-emerald-500" /> Thu tích luỹ
              </span>
              {activeTab === 'PAID' && (
                <span className="text-3xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Đang lọc</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-2xs font-mono leading-tight">
              <div className="flex justify-between border-r border-slate-100 pr-1.5">
                <span className="text-slate-400 font-sans">Hôm nay</span>
                <span className="text-emerald-700 font-bold">{formatMoney(collectedToday)}</span>
              </div>
              <div className="flex justify-between pl-1.5">
                <span className="text-slate-400 font-sans">Tuần này</span>
                <span className="text-slate-700 font-bold">{formatMoney(collectedThisWeek)}</span>
              </div>
              <div className="flex justify-between border-r border-slate-100/50 pr-1.5">
                <span className="text-slate-400 font-sans">Tháng này</span>
                <span className="text-slate-700 font-bold">{formatMoney(collectedThisMonth)}</span>
              </div>
              <div className="flex justify-between pl-1.5">
                <span className="text-slate-400 font-sans">Năm nay</span>
                <span className="text-slate-700 font-bold">{formatMoney(collectedThisYear)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Phân loại theo Bảng Giá */}
      {statsByType && (
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-col hover:border-slate-300 transition-colors relative">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-600">
              <PieChart size={16} className="text-cyan-600" />
              <h3 className="text-2xs font-bold tracking-wider uppercase text-slate-500">Phân Loại</h3>
              <span className="px-1.5 py-0.2 text-3xs font-black bg-cyan-50 text-cyan-700 rounded-full border border-cyan-150" title="Tổng số báo giá">{totalTypesCount}</span>
            </div>
            {selectedPhanLoai && (
              <button type="button" aria-label="Xem tất cả" onClick={() => onFilterPhanLoai?.('')} className="text-3xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold transition-colors border-0 cursor-pointer">
                Tất cả
              </button>
            )}
          </div>

          <div className="text-3xs text-slate-400 font-sans mb-1.5 px-0.5 flex justify-between uppercase tracking-wider border-b border-dashed border-slate-100 pb-1">
            <span>Danh mục</span>
            <span>Số báo giá / Số Khách hàng</span>
          </div>

          <div className="grid grid-cols-1 gap-1 text-2xs font-medium mt-auto">
             {['MÁY', 'VẬT TƯ', 'DỊCH VỤ'].map(type => {
               const st = statsByType[type as keyof typeof statsByType];
               const isSelected = selectedPhanLoai === type;
               return (
                  <div 
                    key={type} 
                    className={`flex justify-between items-center px-1.5 py-1 rounded cursor-pointer transition-colors border ${isSelected ? 'border-cyan-400 bg-cyan-50/70 ring-1 ring-cyan-400 font-bold text-cyan-700' : 'border-slate-100 bg-slate-50 hover:bg-cyan-50/50 hover:border-cyan-350'}`}
                    onClick={() => onFilterPhanLoai?.(isSelected ? '' : type)}
                  >
                    <span className="text-slate-500 font-sans truncate">{type}</span>
                    <span className="space-x-1 flex items-center shrink-0">
                      <span className="text-slate-800 font-mono" title="Số lượng báo giá">{st.count} <span className="text-3xs text-slate-400 font-sans font-normal ml-0.5">báo giá</span></span> 
                      <span className="text-slate-300 font-sans">/</span> 
                      <span className="text-slate-500 font-mono" title="Số lượng khách hàng">{st.customers} <span className="text-3xs text-slate-400 font-sans font-normal ml-0.5">KH</span></span>
                    </span>
                  </div>
               );
             })}
          </div>
        </div>
      )}
    </div>
  );
}
