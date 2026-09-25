import { PaymentRepository } from '../../domain/PaymentRepository';
import { PaymentProps } from '../../domain/Payment';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';

export interface UpdatePaymentCommand extends Partial<PaymentProps> {
  id: string;
}

export class UpdatePaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(command: UpdatePaymentCommand): Promise<Result<void>> {
    const pm = await this.repo.getById(command.id);
    if (!pm) {
      return Result.fail(`Payment not found: ${command.id}`);
    }

    const { id, ...updates } = command;
    pm.updateFields(updates);

    await this.repo.update(pm);

    for (const event of pm.domainEvents) {
      await eventBus.publish(event);
    }
    pm.clearEvents();

    return Result.ok();
  }
}
