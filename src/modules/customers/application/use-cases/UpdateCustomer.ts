import { Customer as CustomerEntity } from '../../domain/Customer';
import { Customer as CustomerData } from '../../domain/customer.schema';
import { customerRepo } from '../../infrastructure/CustomerRepoFirestore';
import { CustomerUpdated } from '../../domain/events';
import { eventBus } from '@/src/platform/events/EventBus';

export class UpdateCustomer {
  static async execute(id: string, updates: Partial<CustomerData>): Promise<void> {
    const data = {
      ...updates,
      ngayCapNhat: new Date().toISOString()
    };
    
    // Check Optimistic Lock? (done in UI mostly for now, or inside repo base class)
    await customerRepo.update(id, data);

    const currentData = await customerRepo.getById(id);
    if (currentData) {
      const customer = new CustomerEntity(currentData, id);
      eventBus.publish(new CustomerUpdated(customer, data));
    }
  }
}
