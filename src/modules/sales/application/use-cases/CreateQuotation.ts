import { Quotation, QuotationItem, QuotationType } from '../../domain/Quotation';
import { QuotationRepository } from '../../domain/QuotationRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus'; // Assuming there is an EventBus, I will create a mock if missing or use the one present.

export interface CreateQuotationCommand {
  id: string; // Provide ID for idempotency or allow auto-gen
  customerId: string;
  type: QuotationType;
  items: QuotationItem[];
  [key: string]: any;
}

export class CreateQuotationUseCase {
  constructor(private readonly repo: QuotationRepository) {}

  public async execute(command: CreateQuotationCommand): Promise<Result<string>> {
    // 1. Check if it already exists (optional, depends on id strategy)
    const existing = await this.repo.getById(command.id);
    if (existing) {
      return Result.fail('Quotation already exists with this ID');
    }

    // 2. Aggregate Creation (contains logic & validation)
    const quotationOrError = Quotation.create({
      customerId: command.customerId,
      type: command.type,
      items: command.items
    }, command.id);

    if (!quotationOrError.isSuccess) {
      return Result.fail(quotationOrError.error!);
    }

    const quotation = quotationOrError.getValue();

    // Merge legacy fields
    for (const key of Object.keys(command)) {
      if (!['id', 'customerId', 'type', 'items'].includes(key)) {
        quotation.props[key] = command[key];
      }
    }

    // 3. Persist
    await this.repo.save(quotation);

    // 4. Dispatch Domain Events
    for (const event of quotation.domainEvents) {
      await eventBus.publish(event);
    }
    quotation.clearEvents();

    return Result.ok(quotation.id);
  }
}
