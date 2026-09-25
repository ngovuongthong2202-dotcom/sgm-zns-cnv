import { DeliveryProps } from '../../domain/Delivery';
import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Result } from '@/src/platform/domain/Result';

export class GetDeliveryDetailQuery {
  constructor(private readonly repo: DeliveryRepository) {}

  public async execute(id: string): Promise<Result<{ id: string; props: DeliveryProps }>> {
    const res = await this.repo.getById(id);
    if (!res) return Result.fail('Not found');
    return Result.ok({ id: res.id, props: res.snapshot });
  }
}
