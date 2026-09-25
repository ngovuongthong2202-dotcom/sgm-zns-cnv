import { QuotationRepository } from '../../domain/QuotationRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';

export interface SendZnsQuotationCommand {
  id: string;
}

export class SendZnsQuotationUseCase {
  constructor(private readonly repo: QuotationRepository) {}

  public async execute(command: SendZnsQuotationCommand): Promise<Result<void>> {
    const quotation = await this.repo.getById(command.id);
    if (!quotation) {
      return Result.fail('Quotation not found');
    }

    const sentResult = quotation.markAsSent();
    if (!sentResult.isSuccess) {
      return Result.fail(sentResult.error!);
    }
    
    // Simulate ZNS sending (or call infrastructure adapter for ZNS vendor directly)
    // Then mark succeeded which fires DomainEvent
    const msgId = `msg-${Date.now()}`;
    const znsSucceededResult = quotation.markZnsSucceeded(msgId);
    if (!znsSucceededResult.isSuccess) {
        return znsSucceededResult;
    }

    await this.repo.update(quotation);

    for (const event of quotation.domainEvents) {
      await eventBus.publish(event);
    }
    quotation.clearEvents();

    return Result.ok();
  }
}
