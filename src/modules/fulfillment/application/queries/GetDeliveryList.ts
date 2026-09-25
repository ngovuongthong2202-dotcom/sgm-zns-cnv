import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Result } from '@/src/platform/domain/Result';
import { DeliveryProps } from '../../domain/Delivery';

export class GetDeliveryListQuery {
  constructor(private readonly repo: DeliveryRepository) {}

  public async execute(filters?: any): Promise<Result<{ id: string; props: DeliveryProps }[]>> {
    const list = await this.repo.list(filters);
    return Result.ok(list.map(d => ({ id: d.id, props: d.snapshot })));
  }
}
