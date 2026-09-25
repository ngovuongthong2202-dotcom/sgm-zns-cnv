import { PaymentRepository } from '../../domain/PaymentRepository';
import { Result } from '../../../../platform/domain/Result';

export class DeletePaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(id: string, linkedDeliveriesCount: number): Promise<Result<void>> {
    const pm = await this.repo.getById(id);
    if (!pm) {
      return Result.fail(`Payment not found: ${id}`);
    }

    const canDelete = pm.canBeDeleted(linkedDeliveriesCount);
    if (!canDelete.isSuccess) {
      return Result.fail(canDelete.error!);
    }

    await this.repo.delete(id);

    return Result.ok();
  }
}
