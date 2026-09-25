import { Payment } from '../../domain/Payment';
import { PaymentRepository } from '../../domain/PaymentRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetPaymentListQuery {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(filters?: any): Promise<Result<Payment[]>> {
    const list = await this.repo.list(filters);
    return Result.ok(list);
  }
}
