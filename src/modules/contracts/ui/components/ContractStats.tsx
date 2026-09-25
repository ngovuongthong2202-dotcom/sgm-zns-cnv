import React, { useMemo } from 'react';
import { FileText, Coins, Package, ShieldAlert } from 'lucide-react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { contractAggregates } from '../aggregates.config';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';

interface Props {
  contracts: Contract[];
  realtimePayments?: any[];
  realtimeDeliveries?: any[];
  activeKpiFilter: 'ALL' | 'UNPAID' | 'UNDELIVERED' | 'OVERDUE' | 'UPCOMING' | 'TOTAL' | 'PAID';
  setActiveKpiFilter: (val: 'ALL' | 'UNPAID' | 'UNDELIVERED' | 'OVERDUE' | 'UPCOMING' | 'TOTAL' | 'PAID') => void;
}

export function ContractStats({
  contracts,
  realtimePayments = [],
  realtimeDeliveries = [],
  activeKpiFilter,
  setActiveKpiFilter
}: Props) {
  const stats = useMemo(() => {
    const payment = contractAggregates.paymentStats(contracts, realtimePayments);
    const delivery = contractAggregates.deliveryStats(contracts, realtimeDeliveries);
    const deadline = contractAggregates.deadlineStats(contracts, realtimeDeliveries);
    const totalVal = contractAggregates.totalContractValue(contracts);
    const totalCust = contractAggregates.totalCustomersWithContracts(contracts);

    return {
      custCount: totalCust,
      totalContractsCount: contractAggregates.totalContracts(contracts),
      totalValue: totalVal,
      overdueCount: deadline.overdueCount,
      upcomingCount: deadline.upcomingCount,
      unpaidCount: payment.unpaidCount,
      paidCount: payment.paidCount,
      totalPaidValue: payment.totalPaidValue,
      totalUnpaidValue: payment.totalUnpaidValue,
      undeliveredCount: delivery.undeliveredCount,
      deliveredCount: delivery.deliveredCount,
      totalUndeliveredQty: delivery.totalUndeliveredQty
    };
  }, [contracts, realtimePayments, realtimeDeliveries]);

  const handleKpiToggle = (targetFilter: 'ALL' | 'UNPAID' | 'UNDELIVERED' | 'OVERDUE' | 'UPCOMING' | 'TOTAL' | 'PAID') => {
    if (activeKpiFilter === targetFilter) {
      setActiveKpiFilter('ALL');
    } else {
      setActiveKpiFilter(targetFilter);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 select-none">
      
      {/* 1. KHÁCH HÀNG (ALL) */}
      <div 
        onClick={() => setActiveKpiFilter('ALL')}
        className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer ${
          activeKpiFilter === 'ALL' 
            ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-400/20' 
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-600">
             <FileText size={16} className="text-slate-500" />
             <h3 className="text-xs font-bold tracking-wide uppercase">Khách Hàng</h3>
           </div>
           {activeKpiFilter === 'ALL' && (
             <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
           )}
        </div>
        <div className="pt-4">
          <div className="text-2xl font-bold font-mono text-slate-800 tracking-tight leading-none mb-1.5">{stats.custCount}</div>
          <p className="text-2xs text-slate-500 font-medium truncate">
            Khách hàng có phát sinh hợp đồng
          </p>
          <div className="mt-2 text-2xs text-slate-500 font-semibold uppercase tracking-wider">Xem tất cả</div>
        </div>
      </div>

      {/* 2. TÌNH TRẠNG HĐ (OVERDUE + UPCOMING) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-slate-600 mb-3">
          <ShieldAlert size={16} className="text-amber-500" />
          <h3 className="text-xs font-bold tracking-wide uppercase">Tình Trạng HĐ</h3>
        </div>
        
        <div className="space-y-2 text-2xs font-medium font-mono mt-auto">
          {/* Trễ hạn dòng */}
          <div 
            onClick={() => handleKpiToggle('OVERDUE')}
            className={`flex justify-between items-center px-2.5 py-1.5 rounded cursor-pointer transition-all border ${
              activeKpiFilter === 'OVERDUE' 
                ? 'border-red-400 bg-red-50 ring-1 ring-red-400/20' 
                : 'bg-slate-50 border-slate-100 hover:border-red-300 hover:bg-red-50/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-slate-500 font-sans truncate">Trễ hạn</span>
            </div>
            <span className="text-red-700 font-bold">{stats.overdueCount} HĐ</span>
          </div>

          {/* Sắp đến hạn dòng */}
          <div 
            onClick={() => handleKpiToggle('UPCOMING')}
            className={`flex justify-between items-center px-2.5 py-1.5 rounded cursor-pointer transition-all border ${
              activeKpiFilter === 'UPCOMING' 
                ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/20' 
                : 'bg-slate-50 border-slate-100 hover:border-amber-300 hover:bg-amber-50/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-slate-500 font-sans truncate">Sắp đến hạn</span>
            </div>
            <span className="text-amber-700 font-bold">{stats.upcomingCount} HĐ</span>
          </div>
        </div>
      </div>

      {/* 3. THANH TOÁN HĐ (TOTAL + PAID + UNPAID) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-slate-600 mb-2.5">
          <Coins size={16} className="text-emerald-500" />
          <h3 className="text-xs font-bold tracking-wide uppercase">Thanh Toán HĐ</h3>
        </div>

        <div className="space-y-1.5 text-2xs font-mono font-medium mt-auto">
          {/* Tổng HĐ */}
          <div 
            onClick={() => handleKpiToggle('TOTAL')}
            className={`flex justify-between items-center px-2 py-1 bg-slate-50 rounded cursor-pointer border transition-all ${
              activeKpiFilter === 'TOTAL' 
                ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-400/15' 
                : 'border-slate-100 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className="text-slate-500 font-sans pl-1">Tổng HĐ: <span className="font-bold text-slate-700">{stats.totalContractsCount}</span></span>
            <span className="text-slate-800 font-semibold pr-1">{formatCurrency(stats.totalValue)}</span>
          </div>

          {/* Đã thu */}
          <div 
            onClick={() => handleKpiToggle('PAID')}
            className={`flex justify-between items-center px-2 py-1 bg-slate-50 rounded cursor-pointer border transition-all ${
              activeKpiFilter === 'PAID' 
                ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/20' 
                : 'border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/15'
            }`}
          >
            <span className="text-slate-500 font-sans pl-1">Đã thu: <span className="font-bold text-emerald-600">{stats.paidCount} HĐ</span></span>
            <span className="text-emerald-700 font-semibold pr-1">{formatCurrency(stats.totalPaidValue)}</span>
          </div>

          {/* Còn nợ */}
          <div 
            onClick={() => handleKpiToggle('UNPAID')}
            className={`flex justify-between items-center px-2 py-1 bg-slate-50 rounded cursor-pointer border transition-all ${
              activeKpiFilter === 'UNPAID' 
                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400/20' 
                : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/15'
            }`}
          >
            <span className="text-slate-500 font-sans pl-1">Nợ HĐ: <span className="font-bold text-blue-600">{stats.unpaidCount} HĐ</span></span>
            <span className="text-blue-700 font-semibold pr-1">{formatCurrency(stats.totalUnpaidValue)}</span>
          </div>
        </div>
      </div>

      {/* 4. CHƯA GIAO ĐỦ (UNDELIVERED) */}
      <div 
        onClick={() => handleKpiToggle('UNDELIVERED')}
        className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer ${
          activeKpiFilter === 'UNDELIVERED' 
            ? 'border-cyan-400 bg-cyan-50/40 ring-1 ring-cyan-400/20' 
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-600">
             <Package size={16} className="text-cyan-500" />
             <h3 className="text-xs font-bold tracking-wide uppercase">Giao Hàng HĐ</h3>
           </div>
           {activeKpiFilter === 'UNDELIVERED' && (
             <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
           )}
        </div>
        <div className="pt-4">
          <div className="text-2xl font-bold font-mono text-cyan-800 tracking-tight leading-none mb-1.5">{stats.undeliveredCount} HĐ</div>
          <p className="text-2xs text-slate-500 font-medium truncate">
            Chưa hoàn tất bàn giao hàng hóa
          </p>
          <div className="mt-2 text-2xs text-cyan-600 font-mono font-semibold truncate bg-cyan-50 border border-cyan-100 rounded pl-1.5 py-0.5">
            Thiếu: {stats.totalUndeliveredQty} SP
          </div>
        </div>
      </div>

    </div>
  );
}
