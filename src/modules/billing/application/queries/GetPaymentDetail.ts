import { Payment } from '../../domain/Payment';
import { PaymentRepository } from '../../domain/PaymentRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetPaymentDetailQuery {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(id: string): Promise<Result<Payment>> {
    const pm = await this.repo.getById(id);
    if (!pm) {
      return Result.fail(`Payment not found: ${id}`);
    }
    return Result.ok(pm);
  }
}
