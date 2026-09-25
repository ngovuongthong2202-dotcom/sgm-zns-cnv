import { BaseDomainEvent } from '@/src/platform/domain/DomainEvent';
import { Customer } from './Customer';

export class CustomerCreated extends BaseDomainEvent {
  constructor(public readonly customer: Customer) {
    super('CustomerCreated');
  }
}

export class CustomerUpdated extends BaseDomainEvent {
  constructor(public readonly customer: Customer, public readonly changes: Record<string, unknown>) {
    super('CustomerUpdated');
  }
}

export class CustomerMerged extends BaseDomainEvent {
  constructor(public readonly sourceId: string, public readonly targetId: string) {
    super('CustomerMerged');
  }
}
