import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Result } from '@/src/platform/domain/Result';
import { GetContractDetailQuery, UpdateContractUseCase } from '@/src/modules/contracts';
import { GetQuotationDetailQuery, UpdateQuotationUseCase } from '@/src/modules/sales';
import { getProductItemKey } from '@/src/shared/utils/product-key';

export class DeleteDeliveryUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly getContractQuery: GetContractDetailQuery,
    private readonly getQuotationQuery: GetQuotationDetailQuery,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly updateQuotationUseCase: UpdateQuotationUseCase
  ) {}

  public async execute(id: string): Promise<Result<void>> {
    const delivery = await this.repo.getById(id);
    if (!delivery) {
      return Result.fail('Delivery not found');
    }

    const data = delivery.snapshot;
    if (data.tinhTrangGiaoHang === 'HOAN TẤT' || data.tinhTrangGiaoHang === 'Hoàn tất' || data.ngayGiaoThucTe) {
      return Result.fail('Cảnh báo: Phiếu giao hàng đã hoàn tất thì không được phép xóa!');
    }

    let sourceId = data.contractId;
    let updateSourceFn: any = this.updateContractUseCase;

    if (!sourceId && data.quotationId) {
      sourceId = data.quotationId;
      updateSourceFn = this.updateQuotationUseCase;
    }

    if (sourceId && data.tinhTrangGiaoHang !== 'HUY') {
        let sourceVal: any;
        if (data.contractId) {
           const resp = await this.getContractQuery.execute(sourceId!);
           if (resp.isSuccess) { sourceVal = resp.getValue().props; sourceVal.id = resp.getValue().id; }
        } else {
           const resp = await this.getQuotationQuery.execute(sourceId!);
           if (resp.isSuccess) { sourceVal = resp.getValue().props; sourceVal.id = resp.getValue().id; }
        }

        if (sourceVal) {
            const currentDelivered = sourceVal.deliveredQuantities || {};
            const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };

            for (const [index, p] of (data.products || []).entries()) {
              const itemKey = getProductItemKey(p, index);
              const previousDelivered = currentDelivered[itemKey] || 0;
              newDeliveredQuantities[itemKey] = Math.max(0, previousDelivered - ((p as any).quantity || 0));
            }
            await updateSourceFn.execute({ id: sourceVal.id, deliveredQuantities: newDeliveredQuantities });
        }
    }

    await this.repo.delete(id);
    return Result.ok();
  }
}
