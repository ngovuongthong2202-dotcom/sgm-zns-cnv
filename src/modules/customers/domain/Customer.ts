import { CustomerCreated } from './events';
import { Customer as CustomerData } from '@/src/domain/schema/customer.schema';
import { AggregateRoot } from '@/src/platform/domain/AggregateRoot';

/**
 * Customer Aggregate Root.
 * Manages invariants for customer data including health scoring and contacts.
 */
export class Customer extends AggregateRoot<CustomerData> {
  // In a real DDD setup we'd add behavior methods here.
  // For now it wraps the schema type.
  
  public static create(data: CustomerData): Customer {
    const customer = new Customer(data, data.id || 'new');
    customer.addDomainEvent(new CustomerCreated(customer));
    return customer;
  }
}
