import { Customer as CustomerEntity } from '../../domain/Customer';
import { Customer as CustomerData } from '../../domain/customer.schema';
import { customerRepo } from '../../infrastructure/CustomerRepoFirestore';
import { eventBus } from '@/src/platform/events/EventBus';

export class CreateCustomer {
  static async execute(data: Partial<CustomerData>): Promise<CustomerData> {
    const rawData = {
      ...data,
      ngayTao: data.ngayTao || new Date().toISOString(),
      ngayCapNhat: data.ngayCapNhat || new Date().toISOString()
    } as CustomerData;

    // Persist
    const savedData = await customerRepo.create(rawData);
    
    // Create Aggregate & Emit
    const customer = CustomerEntity.create(savedData);
    customer.domainEvents.forEach(event => {
      eventBus.publish(event);
    });
    customer.clearEvents();

    return savedData;
  }
}
