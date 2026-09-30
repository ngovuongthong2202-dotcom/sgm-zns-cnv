import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { reconcileContractStats } from '@/src/domain/services/financial-reconciler';
import { computeContractCompletionTimeline } from '@/src/shared/utils/vietnamBusinessDays';

export const contractAggregates = {
  totalCustomersWithContracts: (contracts: Contract[]) => {
    const customers = new Set(contracts.map(c => c.customerId).filter(Boolean));
    return customers.size;
  },
  
  totalContracts: (contracts: Contract[]) => contracts.length,
  
  totalContractValue: (contracts: Contract[]) => {
     return contracts.reduce((sum, c) => {
        const prodList = Array.isArray(c.products) ? c.products : [];
        return sum + (c.totalAmount || prodList.reduce((s, p) => s + (p.total || 0), 0) || 0);
     }, 0);
  },

  paymentStats: (contracts: Contract[], payments: Payment[]) => {
    const res = reconcileContractStats(contracts, payments);
    return {
      paidCount: res.paidCount,
      unpaidCount: res.unpaidCount,
      totalPaidValue: res.totalPaidValue,
      totalUnpaidValue: res.totalUnpaidValue
    };
  },

  deliveryStats: (contracts: Contract[], deliveries: Delivery[]) => {
    let deliveredCount = 0;
    let undeliveredCount = 0;
    let totalContractQty = 0;
    let totalDeliveredQty = 0;

    contracts.forEach(c => {
      const prodList = Array.isArray(c.products) ? c.products : [];
      const contractQty = prodList.reduce((s, p) => s + (p.quantity || 0), 0) || c.slMay || 0;
      totalContractQty += contractQty;
      
      const dels = deliveries.filter(d => d.contractId === c.id && d.ngayGiaoThucTe != null && d.ngayGiaoThucTe !== '');
      const deliveredQty = dels.reduce((sum, d) => {
        const delProdList = Array.isArray(d.products) ? d.products : [];
        const qtyInShipment = delProdList.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
        return sum + qtyInShipment;
      }, 0);
      
      totalDeliveredQty += deliveredQty;

      if (contractQty > 0 && deliveredQty >= contractQty) {
         deliveredCount++;
      } else {
         undeliveredCount++;
      }
    });

    return { deliveredCount, undeliveredCount, totalContractQty, totalDeliveredQty, totalUndeliveredQty: Math.max(0, totalContractQty - totalDeliveredQty) };
  },
  
  contractsPendingPayment: (contracts: Contract[], payments: Payment[]) => {
    return reconcileContractStats(contracts, payments).unpaidCount;
  },
  
  contractsPendingDelivery: (contracts: Contract[], deliveries: Delivery[]) => {
    let undeliveredCount = 0;
    contracts.forEach(c => {
      const prodList = Array.isArray(c.products) ? c.products : [];
      const contractQty = prodList.reduce((s, p) => s + (p.quantity || 0), 0) || c.slMay || 0;
      const dels = deliveries.filter(d => d.contractId === c.id && d.ngayGiaoThucTe != null && d.ngayGiaoThucTe !== '');
      const deliveredQty = dels.reduce((sum, d) => {
        const delProdList = Array.isArray(d.products) ? d.products : [];
        const qtyInShipment = delProdList.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
        return sum + qtyInShipment;
      }, 0);
      if (contractQty > 0 && deliveredQty < contractQty) {
         undeliveredCount++;
      } else if (contractQty === 0 && dels.length === 0) {
         undeliveredCount++;
      }
    });
    return undeliveredCount;
  },

  deadlineStats: (contracts: Contract[], deliveries: Delivery[], payments?: Payment[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let upcomingCount = 0;

    contracts.forEach(c => {
      const matchingPays = (payments || []).filter(p => p.contractId === c.id || p.contractId === c.soHopDong || p.soHopDong === c.soHopDong);
      const timeline = computeContractCompletionTimeline(c, matchingPays);
      if (!timeline.completionDate) return;
      
      const prodList = Array.isArray(c.products) ? c.products : [];
      const contractQty = prodList.reduce((s, p) => s + (p.quantity || 0), 0) || c.slMay || 0;
      const dels = deliveries.filter(d => d.contractId === c.id && d.ngayGiaoThucTe != null && d.ngayGiaoThucTe !== '');
      const deliveredQty = dels.reduce((sum, d) => {
        const delProdList = Array.isArray(d.products) ? d.products : [];
        const qtyInShipment = delProdList.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
        return sum + qtyInShipment;
      }, 0);
      
      // Ignore if already fully delivered
      if (contractQty > 0 && deliveredQty >= contractQty) return;

      const dt = timeline.completionDate;
      dt.setHours(0, 0, 0, 0);

      const diffTime = dt.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeline.isDelayed || diffDays < 0) {
        overdueCount++;
      } else if (diffDays <= 14 && diffDays >= 0) {
        upcomingCount++;
      }
    });

    return { overdueCount, upcomingCount };
  }
};
