import { PaymentRepository } from '../../domain/PaymentRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';
import { ZnsMessageType } from '../../../../domain/enums/zns-status';

export interface SendZnsPaymentCommand {
  id: string;
}

export class SendZnsPaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(command: SendZnsPaymentCommand): Promise<Result<void>> {
    const pm = await this.repo.getById(command.id);
    if (!pm) {
      return Result.fail(`Payment not found: ${command.id}`);
    }

    const messageType = pm.props.tinhTrangThanhToan === 'Tất toán' 
      ? ZnsMessageType.THANH_TOAN_TAT_TOAN 
      : ZnsMessageType.THANH_TOAN_CONG_NO;

    pm.requestZns(messageType);

    for (const event of pm.domainEvents) {
      await eventBus.publish(event);
    }
    pm.clearEvents();

    return Result.ok();
  }
}

export class SendZnsReminderUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  public async execute(command: SendZnsPaymentCommand): Promise<Result<void>> {
    const pm = await this.repo.getById(command.id);
    if (!pm) {
      return Result.fail(`Payment not found: ${command.id}`);
    }

    pm.requestZns(ZnsMessageType.THANH_TOAN_CONG_NO_DEN_HAN);

    for (const event of pm.domainEvents) {
      await eventBus.publish(event);
    }
    pm.clearEvents();

    return Result.ok();
  }
}
