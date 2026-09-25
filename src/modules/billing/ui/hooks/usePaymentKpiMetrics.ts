import { useMemo } from 'react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Payment } from '@/src/domain/schema/payment.schema';

import { resolvePaymentLoai } from '../../domain/resolvePaymentLoai';

export function usePaymentKpiMetrics(payments: Payment[]) {
  return useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const startOfWeekVal = startOfWeek(new Date(), { weekStartsOn: 1 });
    const startOfMonthVal = startOfMonth(new Date());
    const startOfYearVal = new Date(new Date().getFullYear(), 0, 1);

    let collectedToday = 0;
    let collectedThisWeek = 0;
    let collectedThisMonth = 0;
    let collectedThisYear = 0;
    let totalDebt = 0;

    const statsByStatus = {
      'Miễn phí': { contracts: new Set<string>(), customers: new Set<string>() },
      'Chưa TT': { contracts: new Set<string>(), customers: new Set<string>() },
      'Công nợ': { contracts: new Set<string>(), customers: new Set<string>() },
      'Tất toán': { contracts: new Set<string>(), customers: new Set<string>() },
    };
    
    const statsByType = {
      'BG Máy': { count: 0, customers: new Set<string>() },
      'BG Vật tư': { count: 0, customers: new Set<string>() },
      'BG Dịch vụ': { count: 0, customers: new Set<string>() },
      'MÁY': { count: 0, customers: new Set<string>() },
      'VẬT TƯ': { count: 0, customers: new Set<string>() },
      'DỊCH VỤ': { count: 0, customers: new Set<string>() }
    };

    payments.forEach(p => {
      const amt = p.soTien || 0;
      const t = p.tinhTrangThanhToan || 'Chưa TT';
      const statusKey = (t === 'ĐÃ THANH TOÁN' || t === 'Tất toán') ? 'Tất toán' : ((t === 'Miễn phí' || t === 'Miễn Phí') ? 'Miễn phí' : t);
      
      const typeStr = resolvePaymentLoai(p);
      if (statsByType[typeStr as keyof typeof statsByType]) {
        statsByType[typeStr as keyof typeof statsByType].count += 1;
        if (p.customerId) {
          statsByType[typeStr as keyof typeof statsByType].customers.add(p.customerId);
        }
      }
      // Populate alias keys for backwards compatibility
      const aliasMap: Record<string, 'MÁY' | 'VẬT TƯ' | 'DỊCH VỤ'> = {
        'BG Máy': 'MÁY',
        'BG Vật tư': 'VẬT TƯ',
        'BG Dịch vụ': 'DỊCH VỤ'
      };
      const alias = aliasMap[typeStr];
      if (alias && statsByType[alias]) {
        statsByType[alias].count += 1;
        if (p.customerId) {
          statsByType[alias].customers.add(p.customerId);
        }
      }
      
      if (statsByStatus[statusKey as keyof typeof statsByStatus]) {
         const targetId = p.contractId || p.quotationId || p.id;
         if (targetId) statsByStatus[statusKey as keyof typeof statsByStatus].contracts.add(targetId);
         if (p.customerId) statsByStatus[statusKey as keyof typeof statsByStatus].customers.add(p.customerId);
      }

      const isPaid = statusKey === 'Tất toán' || statusKey === 'Miễn phí';
      const isPending = statusKey === 'Chưa TT' || statusKey === 'Công nợ';

      if (isPending) {
         totalDebt += amt;
      }

      if (isPaid && p.ngayThanhToan) {
        try {
          const d = new Date(p.ngayThanhToan);
          if (format(d, 'yyyy-MM-dd') === todayStr) {
             collectedToday += amt;
          }
          if (d >= startOfWeekVal) {
             collectedThisWeek += amt;
          }
          if (d >= startOfMonthVal) {
             collectedThisMonth += amt;
          }
          if (d >= startOfYearVal) {
             collectedThisYear += amt;
          }
        } catch {
          // ignore
        }
      }
    });

    return { 
      collectedToday, 
      collectedThisWeek, 
      collectedThisMonth, 
      collectedThisYear,
      totalDebt,
      statsByStatus: {
        'Miễn phí': { contracts: statsByStatus['Miễn phí'].contracts.size, customers: statsByStatus['Miễn phí'].customers.size },
        'Chưa TT': { contracts: statsByStatus['Chưa TT'].contracts.size, customers: statsByStatus['Chưa TT'].customers.size },
        'Công nợ': { contracts: statsByStatus['Công nợ'].contracts.size, customers: statsByStatus['Công nợ'].customers.size },
        'Tất toán': { contracts: statsByStatus['Tất toán'].contracts.size, customers: statsByStatus['Tất toán'].customers.size }
      },
      statsByType: {
        'MÁY': { count: statsByType['MÁY'].count || statsByType['BG Máy'].count, customers: statsByType['MÁY'].customers.size || statsByType['BG Máy'].customers.size },
        'VẬT TƯ': { count: statsByType['VẬT TƯ'].count || statsByType['BG Vật tư'].count, customers: statsByType['VẬT TƯ'].customers.size || statsByType['BG Vật tư'].customers.size },
        'DỊCH VỤ': { count: statsByType['DỊCH VỤ'].count || statsByType['BG Dịch vụ'].count, customers: statsByType['DỊCH VỤ'].customers.size || statsByType['BG Dịch vụ'].customers.size },
        'BG Máy': { count: statsByType['BG Máy'].count || statsByType['MÁY'].count, customers: statsByType['BG Máy'].customers.size || statsByType['MÁY'].customers.size },
        'BG Vật tư': { count: statsByType['BG Vật tư'].count || statsByType['VẬT TƯ'].count, customers: statsByType['BG Vật tư'].customers.size || statsByType['VẬT TƯ'].customers.size },
        'BG Dịch vụ': { count: statsByType['BG Dịch vụ'].count || statsByType['DỊCH VỤ'].count, customers: statsByType['BG Dịch vụ'].customers.size || statsByType['DỊCH VỤ'].customers.size },
        'KHÁC': { count: 0, customers: 0 },
      }
    };
  }, [payments]);
}
