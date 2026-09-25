import { QuotationItem } from '../../domain/Quotation';
import { QuotationRepository } from '../../domain/QuotationRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';

export interface UpdateQuotationCommand {
  id: string;
  items?: QuotationItem[];
  [key: string]: any;
}

export class UpdateQuotationUseCase {
  constructor(private readonly repo: QuotationRepository) {}

  public async execute(command: UpdateQuotationCommand): Promise<Result<void>> {
    const quotation = await this.repo.getById(command.id);
    if (!quotation) {
      return Result.fail('Quotation not found');
    }

    if (command.items) {
      // Very naive update logic for prototype
      // In a real application, you'd recreate or modify items and recalculate pricing
      for (const item of command.items) {
        if (item.quantity <= 0) return Result.fail("Quantity must be greater than 0");
        if (item.unitPrice < 0) return Result.fail("Unit price cannot be negative");
      }
      quotation.props.items = command.items;
      
      let subtotalValue = 0;
      for (const item of quotation.props.items) {
         subtotalValue += item.quantity * item.unitPrice;
      }
      quotation.props.subtotal = subtotalValue;
      quotation.props.totalAmount = subtotalValue - quotation.props.discount + quotation.props.vatAmount;
    }

    // Merge legacy fields
    for (const key of Object.keys(command)) {
      if (!['id', 'items'].includes(key)) {
        quotation.props[key] = command[key];
      }
    }
    quotation.props.updatedAt = new Date();

    await this.repo.update(quotation);

    for (const event of quotation.domainEvents) {
      await eventBus.publish(event);
    }
    quotation.clearEvents();

    return Result.ok();
  }
}
