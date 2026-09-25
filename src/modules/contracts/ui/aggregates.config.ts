import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

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
    let paidCount = 0;
    let unpaidCount = 0;
    let totalPaidValue = 0;
    let totalUnpaidValue = 0;

    contracts.forEach(c => {
      const prodList = Array.isArray(c.products) ? c.products : [];
      const contractValue = c.totalAmount || prodList.reduce((s, p) => s + (p.total || 0), 0) || 0;
      const pays = payments.filter(p => p.contractId === c.id && ['ĐÃ THANH TOÁN', 'Đã thanh toán', 'Đã TT', 'Tất toán'].includes(String(p.tinhTrangThanhToan)));
      const paid = pays.reduce((sum, p) => sum + (p.soTien || 0), 0);
      
      totalPaidValue += paid;
      totalUnpaidValue += Math.max(0, contractValue - paid);

      if (contractValue > 0 && paid >= contractValue) {
         paidCount++;
      } else {
         unpaidCount++;
      }
    });

    return { paidCount, unpaidCount, totalPaidValue, totalUnpaidValue };
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
    let unpaidCount = 0;
    contracts.forEach(c => {
       const prodList = Array.isArray(c.products) ? c.products : [];
       const contractValue = c.totalAmount || prodList.reduce((s, p) => s + (p.total || 0), 0) || 0;
       const pays = payments.filter(p => p.contractId === c.id && ['ĐÃ THANH TOÁN', 'Đã thanh toán', 'Đã TT', 'Tất toán'].includes(String(p.tinhTrangThanhToan)));
       const paid = pays.reduce((sum, p) => sum + (p.soTien || 0), 0);
       if (contractValue > 0 && paid < contractValue) {
          unpaidCount++;
       } else if (contractValue === 0 && pays.length === 0) {
          unpaidCount++;
       }
    });
    return unpaidCount;
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

  deadlineStats: (contracts: Contract[], deliveries: Delivery[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let upcomingCount = 0;

    contracts.forEach(c => {
      if (!c.ngayKy || !c.soNgayDuKienHoanThanh) return;
      
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

      const dt = new Date(c.ngayKy);
      dt.setDate(dt.getDate() + c.soNgayDuKienHoanThanh);
      dt.setHours(0, 0, 0, 0);

      const diffTime = dt.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdueCount++;
      } else if (diffDays <= 14 && diffDays >= 0) {
        upcomingCount++;
      }
    });

    return { overdueCount, upcomingCount };
  }
};
