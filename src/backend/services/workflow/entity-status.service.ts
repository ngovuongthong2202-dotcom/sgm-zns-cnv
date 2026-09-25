import { eventBus } from '../../../platform/events/EventBus';
import { DomainEvent } from '../../../platform/domain/DomainEvent';
import { FEATURE_EVENT_HANDLERS } from './workflow-event.service';
import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

const processedStatusEvents = new Set<string>();

export const entityStatusService = {
  updateStatus: async (event: DomainEvent): Promise<void> => {
    if (!FEATURE_EVENT_HANDLERS) return;

    const payload = (event as any).payload || {};
    const entityId = (event as any).contractId || (event as any).quotationId || (event as any).paymentId || (event as any).deliveryId || (event as any).entityId;
    const idempotencyKey = `${event.eventName}-${entityId || JSON.stringify(payload)}`;
    
    if (processedStatusEvents.has(idempotencyKey)) {
      logger.debug({ idempotencyKey }, `[Entity Status] (Idempotent Bỏ qua) Đã xử lý event: ${event.eventName}`);
      return;
    }
    processedStatusEvents.add(idempotencyKey);

    logger.info({ entityId }, `[Entity Status] Bắt đầu đồng bộ trạng thái chuỗi nghiệp vụ cho event: ${event.eventName}`);

    try {
      switch (event.eventName) {
        case 'ContractSigned': {
          // 1. Khi Hợp đồng được ký -> Tìm Báo giá liên kết và chuyển sang 'WON'
          const quotationId = payload.quotationId;
          if (quotationId) {
            await adminDb.collection('quotations').doc(quotationId).update({
              lifecycleStatus: 'WON',
              status: 'WON',
              wonAt: new Date().toISOString(),
              wonReason: `Ký kết theo Hợp đồng ${payload.soHopDong || entityId}`
            });
            logger.info(`[Entity Status] Đã cập nhật Báo giá ${quotationId} -> WON`);
          }
          break;
        }

        case 'PaymentSucceeded': {
          // 2. Khi Thanh toán thành công -> Rollup công nợ trên Hợp đồng
          const contractId = payload.contractId;
          if (contractId) {
            const contractDoc = await adminDb.collection('contracts').doc(contractId).get();
            if (contractDoc.exists) {
              const contract = contractDoc.data() || {};
              const contractValue = Number(contract.totalAmount || contract.contractValue || 0);

              // Lấy toàn bộ payments của hợp đồng
              const paymentsSnap = await adminDb.collection('payments').where('contractId', '==', contractId).get();
              let totalPaid = 0;
              paymentsSnap.docs.forEach((doc: any) => {
                const p = doc.data();
                if (!p.deletedAt) {
                  totalPaid += Number(p.amount || p.soTien || 0);
                }
              });

              const conLai = Math.max(0, contractValue - totalPaid);
              const tinhTrangThanhToan = conLai === 0 ? 'TAT_TOAN' : 'CONG_NO';

              const updates: Record<string, any> = {
                daThanhToan: totalPaid,
                conLai,
                tinhTrangThanhToan
              };

              // Tự động hoàn tất hợp đồng nếu đã tất toán VÀ đã giao hàng đủ
              if (conLai === 0 && contract.tinhTrangGiaoHang === 'HOAN_TAT') {
                updates.tinhTrangHopDong = 'COMPLETED';
                updates.status = 'COMPLETED';
              }

              await adminDb.collection('contracts').doc(contractId).update(updates);
              logger.info(`[Entity Status] Rollup công nợ HĐ ${contractId}: Đã trả ${totalPaid}/${contractValue}, Còn lại ${conLai}, Tình trạng: ${tinhTrangThanhToan}`);
            }
          }
          break;
        }

        case 'DeliveryCompleted': {
          // 3. Khi Giao hàng hoàn tất -> Cập nhật deliveredQuantities và kiểm tra hoàn thành
          const contractId = payload.contractId;
          if (contractId) {
            const contractDoc = await adminDb.collection('contracts').doc(contractId).get();
            if (contractDoc.exists) {
              const contract = contractDoc.data() || {};
              const currentDelivered: Record<string, number> = { ...(contract.deliveredQuantities || {}) };

              // Cập nhật số lượng giao từ đợt này
              const deliveredItems = payload.products || payload.items || [];
              deliveredItems.forEach((item: any) => {
                const pId = item.productId || item.id;
                if (pId) {
                  currentDelivered[pId] = (currentDelivered[pId] || 0) + Number(item.quantity || 1);
                }
              });

              // Kiểm tra xem tất cả mặt hàng trong Hợp đồng đã giao đủ chưa
              const contractProducts = contract.products || [];
              const isAllDelivered = contractProducts.length > 0 && contractProducts.every((p: any) => {
                const pId = p.productId || p.id;
                return (currentDelivered[pId] || 0) >= Number(p.quantity || 1);
              });

              const updates: Record<string, any> = {
                deliveredQuantities: currentDelivered,
                tinhTrangGiaoHang: isAllDelivered ? 'HOAN_TAT' : 'DANG_GIAO'
              };

              // Nếu đã giao đủ VÀ đã tất toán -> Hoàn tất Hợp đồng
              if (isAllDelivered && (contract.conLai === 0 || contract.tinhTrangThanhToan === 'TAT_TOAN')) {
                updates.tinhTrangHopDong = 'COMPLETED';
                updates.status = 'COMPLETED';
              }

              await adminDb.collection('contracts').doc(contractId).update(updates);
              logger.info(`[Entity Status] Cập nhật giao hàng HĐ ${contractId}: Giao đủ: ${isAllDelivered}`);
            }
          }
          break;
        }

        case 'ZnsDelivered': {
          // 4. Khi ZNS gửi thành công -> Cập nhật trạng thái tin trên thực thể liên quan
          const targetCol = payload.entityType === 'QUOTATION' ? 'quotations'
            : payload.entityType === 'CONTRACT' ? 'contracts'
            : payload.entityType === 'PAYMENT' ? 'payments'
            : payload.entityType === 'DELIVERY' ? 'deliveries' : null;

          if (targetCol && entityId) {
            await adminDb.collection(targetCol).doc(entityId).update({
              trangThaiGuiTin: 'THANH_CONG',
              znsStatus: 'DELIVERED',
              lastZnsDeliveredAt: new Date().toISOString()
            });
            logger.info(`[Entity Status] Cập nhật ZNS thành công cho ${targetCol}/${entityId}`);
          }
          break;
        }

        case 'ContractDeleted': {
          // Khi Hợp đồng bị xóa -> Sibling-Aware Reversal cho Báo giá nguồn
          const quotationId = payload.quotationId;
          const contractId = payload.contractId || entityId;
          if (quotationId) {
            const contractsSnap = await adminDb.collection('contracts').where('quotationId', '==', quotationId).get();
            const activeContracts = contractsSnap.docs.filter(d => d.id !== contractId && !d.data()?.deletedAt);

            if (activeContracts.length === 0) {
              await adminDb.collection('quotations').doc(quotationId).update({
                lifecycleStatus: 'OPEN',
                status: 'OPEN',
                wonAt: null,
                wonReason: null
              });
              logger.info(`[Entity Status] (Reversal) Báo giá ${quotationId} tự động hoàn nguyên về OPEN do HĐ ${contractId} đã bị xóa.`);
            } else {
              logger.info(`[Entity Status] (Sibling Aware) Báo giá ${quotationId} giữ nguyên trạng thái WON vì vẫn còn ${activeContracts.length} HĐ khác.`);
            }
          }
          break;
        }

        case 'PaymentDeleted': {
          // Khi Phiếu thu bị xóa -> Tự động rollup lại công nợ trên Hợp đồng
          const contractId = payload.contractId;
          const paymentId = payload.paymentId || entityId;
          if (contractId) {
            const contractDoc = await adminDb.collection('contracts').doc(contractId).get();
            if (contractDoc.exists) {
              const contract = contractDoc.data() || {};
              const contractValue = Number(contract.totalAmount || contract.contractValue || 0);

              const paymentsSnap = await adminDb.collection('payments').where('contractId', '==', contractId).get();
              let totalPaid = 0;
              paymentsSnap.docs.forEach((doc: any) => {
                if (doc.id !== paymentId && !doc.data()?.deletedAt) {
                  totalPaid += Number(doc.data()?.amount || doc.data()?.soTien || 0);
                }
              });

              const conLai = Math.max(0, contractValue - totalPaid);
              const tinhTrangThanhToan = totalPaid === 0 ? 'CHUA_THANH_TOAN' : (conLai === 0 ? 'TAT_TOAN' : 'CONG_NO');

              const updates: Record<string, any> = {
                daThanhToan: totalPaid,
                conLai,
                tinhTrangThanhToan
              };

              // Nếu trước đó hợp đồng đã tự động hoàn tất, khi xóa phiếu thu mà phát sinh nợ -> mở lại hợp đồng
              if (conLai > 0 && (contract.tinhTrangHopDong === 'COMPLETED' || contract.status === 'COMPLETED')) {
                updates.tinhTrangHopDong = 'DANG_THUC_HIEN';
                updates.status = 'ACTIVE';
              }

              await adminDb.collection('contracts').doc(contractId).update(updates);
              logger.info(`[Entity Status] (Reversal) Rollup lại công nợ HĐ ${contractId}: Đã trả ${totalPaid}/${contractValue}, Còn lại ${conLai}, Tình trạng: ${tinhTrangThanhToan}`);
            }
          }
          break;
        }

        case 'DeliveryDeleted': {
          // Khi Phiếu giao bị xóa -> Hoàn trả deliveredQuantities trên Hợp đồng
          const contractId = payload.contractId;
          const products = payload.products || payload.items || [];
          if (contractId && products.length > 0) {
            const contractDoc = await adminDb.collection('contracts').doc(contractId).get();
            if (contractDoc.exists) {
              const contract = contractDoc.data() || {};
              const currentDelivered: Record<string, number> = { ...(contract.deliveredQuantities || {}) };

              products.forEach((item: any) => {
                const pId = item.productId || item.id;
                if (pId) {
                  const currentQty = currentDelivered[pId] || 0;
                  const subtracted = Math.max(0, currentQty - Number(item.quantity || 1));
                  currentDelivered[pId] = subtracted;
                }
              });

              const contractProducts = contract.products || [];
              const isAllDelivered = contractProducts.length > 0 && contractProducts.every((p: any) => {
                const pId = p.productId || p.id;
                return (currentDelivered[pId] || 0) >= Number(p.quantity || 1);
              });
              const hasAnyDelivered = Object.values(currentDelivered).some(q => q > 0);

              const updates: Record<string, any> = {
                deliveredQuantities: currentDelivered,
                tinhTrangGiaoHang: isAllDelivered ? 'HOAN_TAT' : (hasAnyDelivered ? 'DANG_GIAO' : 'CHUA_GIAO')
              };

              if (!isAllDelivered && (contract.tinhTrangHopDong === 'COMPLETED' || contract.status === 'COMPLETED')) {
                updates.tinhTrangHopDong = 'DANG_THUC_HIEN';
                updates.status = 'ACTIVE';
              }

              await adminDb.collection('contracts').doc(contractId).update(updates);
              logger.info(`[Entity Status] (Reversal) Hoàn kho HĐ ${contractId}, Tiến độ giao: ${updates.tinhTrangGiaoHang}`);
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err }, `[Entity Status] Lỗi khi xử lý event ${event.eventName}`);
    }
  }
};

eventBus.subscribe('ContractSigned', entityStatusService.updateStatus);
eventBus.subscribe('PaymentSucceeded', entityStatusService.updateStatus);
eventBus.subscribe('DeliveryCompleted', entityStatusService.updateStatus);
eventBus.subscribe('ZnsDelivered', entityStatusService.updateStatus);
eventBus.subscribe('ContractDeleted', entityStatusService.updateStatus);
eventBus.subscribe('PaymentDeleted', entityStatusService.updateStatus);
eventBus.subscribe('DeliveryDeleted', entityStatusService.updateStatus);

