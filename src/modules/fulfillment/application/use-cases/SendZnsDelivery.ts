import { DeliveryRepository } from '../../domain/DeliveryRepository';
import { Result } from '@/src/platform/domain/Result';
import { eventBus } from '@/src/platform/events/EventBus';

export interface SendZnsDeliveryCommand {
  id: string;
  templateCode: 'GIAOHANG_ZNS' | 'GIAOHANG_HOANTAT';
}

export class SendZnsDeliveryUseCase {
  constructor(private readonly repo: DeliveryRepository) {}

  public async execute(command: SendZnsDeliveryCommand): Promise<Result<void>> {
    const delivery = await this.repo.getById(command.id);
    if (!delivery) {
      return Result.fail('Delivery not found');
    }

    // Since actual ZNS send is still part of the ui `sendZnsAndToast` in the UI layer (which is fine), 
    // we use this use case just in case we need to trigger the Domain Event or decouple UI later.
    // For now, based on strangling, we might just fire the event if needed. Wait, in sales/billing, Zns was sent via the client utility.
    // Let's create an event trigger here.
    
    delivery.recordZnsSent(command.templateCode);

    for (const event of delivery.domainEvents) {
      await eventBus.publish(event);
    }
    delivery.clearEvents();

    return Result.ok();
  }
}
