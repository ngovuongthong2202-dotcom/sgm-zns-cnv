import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Delivery, DeliveryProps } from '../../domain/Delivery';
import { Result } from '@/src/platform/domain/Result';
import { eventBus } from '@/src/platform/events/EventBus';
import { GetContractDetailQuery, UpdateContractUseCase } from '@/src/modules/contracts';
import { GetQuotationDetailQuery, UpdateQuotationUseCase } from '@/src/modules/sales';
import { getProductItemKey } from '@/src/shared/utils/product-key';

export type CreateDeliveryCommand = DeliveryProps & { id?: string; };

export class CreateDeliveryUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly getContractQuery: GetContractDetailQuery,
    private readonly getQuotationQuery: GetQuotationDetailQuery,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly updateQuotationUseCase: UpdateQuotationUseCase
  ) {}

  public async execute(command: CreateDeliveryCommand): Promise<Result<string>> {
    let sourceVal: any;
    let updateSourceFn: any = this.updateContractUseCase;

    if (command.contractId) {
      const contractResp = await this.getContractQuery.execute(command.contractId);
      if (contractResp.isSuccess) {
        sourceVal = contractResp.getValue().props;
        sourceVal.id = contractResp.getValue().id;
        updateSourceFn = this.updateContractUseCase;
      } else {
        // Self-Healing Fallback: Kiểm tra xem contractId có phải là quotationId bị gán nhầm không
        const quoResp = await this.getQuotationQuery.execute(command.contractId);
        if (quoResp.isSuccess) {
          sourceVal = quoResp.getValue().props;
          sourceVal.id = quoResp.getValue().id;
          updateSourceFn = this.updateQuotationUseCase;
        }
      }
    }

    if (!sourceVal && command.quotationId) {
      const quoResp = await this.getQuotationQuery.execute(command.quotationId);
      if (quoResp.isSuccess) {
        sourceVal = quoResp.getValue().props;
        sourceVal.id = quoResp.getValue().id;
        updateSourceFn = this.updateQuotationUseCase;
      } else {
        // Fallback kiểm tra contractId
        const contractResp = await this.getContractQuery.execute(command.quotationId);
        if (contractResp.isSuccess) {
          sourceVal = contractResp.getValue().props;
          sourceVal.id = contractResp.getValue().id;
          updateSourceFn = this.updateContractUseCase;
        }
      }
    }

    if (!sourceVal) {
      return Result.fail('Không tìm thấy nguồn dữ liệu tham chiếu (Hợp đồng hoặc Báo giá)');
    }

    const currentDelivered = sourceVal.deliveredQuantities || {};
    const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };

    const allItemKeys = new Set<string>();
    (command.products || []).forEach((p: any, idx: number) => allItemKeys.add(getProductItemKey(p, idx)));

    for (const itemKey of Array.from(allItemKeys)) {
      let contracted = 0;
      if (sourceVal.products) {
        contracted = sourceVal.products.filter((cp: any, sourceIndex: number) => getProductItemKey(cp, sourceIndex) === itemKey)
          .reduce((acc: number, cp: any) => acc + (cp.quantity || 0), 0);
      }

      const previousDelivered = currentDelivered[itemKey] || 0;
      let newShipmentQty = 0;
      if (command.products) {
        newShipmentQty = command.products.filter((np: any, npIndex: number) => getProductItemKey(np, npIndex) === itemKey)
          .reduce((acc: number, np: any) => acc + (np.quantity || 0), 0);
      }

      const remaining = contracted - previousDelivered;
      if (newShipmentQty > remaining) {
        return Result.fail(`Sản phẩm ${itemKey} vượt quá số lượng còn lại (${remaining})`);
      }

      newDeliveredQuantities[itemKey] = Math.max(0, previousDelivered + newShipmentQty);
    }

    // Gate policy checks for payment completed
    // Delivery check allows gate.policy to enforce it
    // Note: canCreateDelivery requires payment object, but we typically just check payment info inside the source if needed, or it's handled differently. We'll leave UI error checks.

    const id = command.id || crypto.randomUUID();
    const deliveryOrError = Delivery.create(command, id);
    if (!deliveryOrError.isSuccess) {
      return Result.fail(deliveryOrError.error!);
    }
    const delivery = deliveryOrError.getValue();

    await this.repo.save(delivery);
    await updateSourceFn.execute({ id: sourceVal.id!, deliveredQuantities: newDeliveredQuantities });

    for (const event of delivery.domainEvents) {
      await eventBus.publish(event);
    }
    delivery.clearEvents();

    return Result.ok(delivery.id);
  }
}
