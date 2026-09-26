import { useMemo } from 'react';
import { Delivery } from '@/src/domain/schema/delivery.schema';

export function useDeliveriesKpis(deliveries: Delivery[], customers: import('@/src/domain/schema/customer.schema').Customer[]) {
  return useMemo(() => {
     const today = new Date().toISOString().split('T')[0];
     
     let inTransit = 0; const inTransitC = new Set(); const inTransitP = new Set();
     let pending = 0; const pendingC = new Set();
     let completed = 0; const completedC = new Set(); const completedP = new Set();
     let late = 0; const lateC = new Set();
     let onTime = 0; const onTimeC = new Set();

     deliveries.forEach(d => {
         const c = customers.find(x => x.id === d.customerId);
         const province = c?.tinhThanh;
         
         const isCompleted = !!d.ngayGiaoThucTe;
         const isCancelled = (d as Delivery & { tinhTrangGiaoHang?: string }).tinhTrangGiaoHang === 'HUY' || (d as Delivery & { tinhTrangGiaoHang?: string }).tinhTrangGiaoHang === 'Hủy';
         if (isCancelled) return;
         
         const isOngoing = !isCompleted && ((d as Delivery & { tinhTrangGiaoHang?: string }).tinhTrangGiaoHang === 'DANG_GIAO' || (d as Delivery & { tinhTrangGiaoHang?: string }).tinhTrangGiaoHang === 'Đang giao');
         
         if (isOngoing) {
             inTransit++;
             if (d.customerId) inTransitC.add(d.customerId);
             if (province) inTransitP.add(province);
         } else if (!isCompleted) {
             pending++;
             if (d.customerId) pendingC.add(d.customerId);
             if (province) inTransitP.add(province); // pending / in-transit combined for province
         }
         
         if (!isCompleted) {
             if (d.ngayGiaoMay && d.ngayGiaoMay < today) {
                late++;
                if (d.customerId) lateC.add(d.customerId);
             }
         } else {
             completed++;
             if (d.customerId) completedC.add(d.customerId);
             if (province) completedP.add(province);
             
             if (d.ngayGiaoMay && d.ngayGiaoThucTe && d.ngayGiaoThucTe <= d.ngayGiaoMay) {
                 onTime++;
                 if (d.customerId) onTimeC.add(d.customerId);
             } else if (d.ngayGiaoMay && d.ngayGiaoThucTe && d.ngayGiaoThucTe > d.ngayGiaoMay) {
                 late++;
                 if (d.customerId) lateC.add(d.customerId);
             }
         }
     });
     
     return { 
       inTransit: { d: pending + inTransit, c: new Set([...pendingC, ...inTransitC]).size, p: inTransitP.size },
       completed: { d: completed, c: completedC.size, p: completedP.size },
       late: { d: late, c: lateC.size },
       onTime: { d: onTime, c: onTimeC.size },
     };
  }, [deliveries, customers]);
}
