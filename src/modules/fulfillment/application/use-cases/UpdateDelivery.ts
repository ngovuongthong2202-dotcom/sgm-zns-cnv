import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Result } from '@/src/platform/domain/Result';
import { eventBus } from '@/src/platform/events/EventBus';
import { GetContractDetailQuery, UpdateContractUseCase } from '@/src/modules/contracts';
import { GetQuotationDetailQuery, UpdateQuotationUseCase } from '@/src/modules/sales';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { DeliveryProps } from '../../domain/Delivery';

export interface UpdateDeliveryCommand {
  id: string;
  data: Partial<DeliveryProps>;
}

export class UpdateDeliveryUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly getContractQuery: GetContractDetailQuery,
    private readonly getQuotationQuery: GetQuotationDetailQuery,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly updateQuotationUseCase: UpdateQuotationUseCase
  ) {}

  public async execute(command: UpdateDeliveryCommand): Promise<Result<void>> {
    const delivery = await this.repo.getById(command.id);
    if (!delivery) {
      return Result.fail('Delivery not found');
    }

    const editingDelivery = delivery.snapshot;
    const oldStatus = editingDelivery.tinhTrangGiaoHang;
    const newStatus = command.data.tinhTrangGiaoHang || oldStatus;

    if ((oldStatus === 'HOAN TẤT' || oldStatus === 'Hoàn tất' || editingDelivery.ngayGiaoThucTe)) {
       if (this.isDeliveryMainContentChanged(editingDelivery, { ...editingDelivery, ...command.data })) {
           return Result.fail(`Cảnh báo: Phiếu giao hàng đã hoàn tất bàn giao. Không được phép chỉnh sửa đổi nội dung chính!`);
       }
       if (newStatus === 'Chưa giao' || newStatus === 'Đang giao') {
          return Result.fail(`Cảnh báo: Phiếu giao hàng đã hoàn tất, không thể chuyển ngược trạng thái!`);
       }
    }
    
    if (oldStatus === 'HUY' && newStatus !== 'HUY') {
        return Result.fail(`Cảnh báo: Phiếu giao hàng đã HỦY, không thể đổi trạng thái khác!`);
    }

    const isProductChanged = !!(command.data.products || newStatus === 'HUY');

    // Only update quantities if products changed or canceled
    if (isProductChanged) {
        let sourceId = command.data.contractId || editingDelivery.contractId;
        let updateSourceFn: any = this.updateContractUseCase;

        if (!sourceId) {
          sourceId = command.data.quotationId || editingDelivery.quotationId;
          updateSourceFn = this.updateQuotationUseCase;
        }

        if (sourceId) {
            let sourceVal: any;
            if (command.data.contractId || editingDelivery.contractId) {
               const resp = await this.getContractQuery.execute(sourceId!);
               if (resp.isSuccess) { sourceVal = resp.getValue().props; sourceVal.id = resp.getValue().id; }
            } else {
               const resp = await this.getQuotationQuery.execute(sourceId!);
               if (resp.isSuccess) { sourceVal = resp.getValue().props; sourceVal.id = resp.getValue().id; }
            }

            if (sourceVal) {
                const currentDelivered = sourceVal.deliveredQuantities || {};
                const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };
                
                const allItemKeys = new Set<string>();
                const newProducts = newStatus === 'HUY' ? [] : (command.data.products || editingDelivery.products || []);
                const oldProducts = editingDelivery.products || [];

                newProducts.forEach((p: any, idx: number) => allItemKeys.add(getProductItemKey(p, idx)));
                oldProducts.forEach((p: any, idx: number) => allItemKeys.add(getProductItemKey(p, idx)));

                for (const itemKey of Array.from(allItemKeys)) {
                    let contracted = 0;
                    if (sourceVal.products) {
                      contracted = sourceVal.products.filter((cp: any, sourceIndex: number) => getProductItemKey(cp, sourceIndex) === itemKey)
                        .reduce((acc: number, cp: any) => acc + (cp.quantity || 0), 0);
                    }

                    const previousDelivered = currentDelivered[itemKey] || 0;
                    
                    const currentShipmentPreviousQty = oldProducts.filter((ep: any, epIndex: number) => getProductItemKey(ep, epIndex) === itemKey)
                      .reduce((acc: number, ep: any) => acc + (ep.quantity || 0), 0);

                    const newShipmentQty = newProducts.filter((np: any, npIndex: number) => getProductItemKey(np, npIndex) === itemKey)
                      .reduce((acc: number, np: any) => acc + (np.quantity || 0), 0);

                    const remaining = contracted - (previousDelivered - currentShipmentPreviousQty);
                    
                    if (newShipmentQty > remaining) {
                      return Result.fail(`Sản phẩm ${itemKey} vượt quá số lượng còn lại (${remaining})`);
                    }

                    newDeliveredQuantities[itemKey] = Math.max(0, (previousDelivered - currentShipmentPreviousQty) + newShipmentQty);
                }

                await updateSourceFn.execute({ id: sourceVal.id!, deliveredQuantities: newDeliveredQuantities });
            }
        }
    }

    const updateResult = delivery.update(command.data);
    if (!updateResult.isSuccess) {
      return updateResult;
    }

    await this.repo.update(delivery);

    for (const event of delivery.domainEvents) {
      await eventBus.publish(event);
    }
    delivery.clearEvents();

    return Result.ok();
  }

  private isDeliveryMainContentChanged(oldD: any, newD: any): boolean {
    if (oldD.customerId !== newD.customerId) return true;
    if (oldD.deliveryId !== newD.deliveryId) return true;
    if (oldD.contractId !== newD.contractId) return true;
    if (oldD.quotationId !== newD.quotationId) return true;
    
    const oldProducts = oldD.products || [];
    const newProducts = newD.products || [];
    if (oldProducts.length !== newProducts.length) return true;
    
    for (let i = 0; i < oldProducts.length; i++) {
      const oP = oldProducts[i];
      const nP = newProducts[i];
      if (oP.productId !== nP.productId && oP.productName !== nP.productName) return true;
      if (oP.quantity !== nP.quantity) return true;
    }
    return false;
  }
}
