import { BaseDomainEvent } from '../domain/DomainEvent';

export class QuotationCreated extends BaseDomainEvent {
  constructor(public readonly quotationId: string, public readonly payload: any) {
    super('QuotationCreated');
  }
}

export class QuotationZnsSucceeded extends BaseDomainEvent {
  constructor(public readonly quotationId: string, public readonly payload: any) {
    super('QuotationZnsSucceeded');
  }
}

export class ContractSigned extends BaseDomainEvent {
  constructor(public readonly contractId: string, public readonly payload: any) {
    super('ContractSigned');
  }
}

export class PaymentSucceeded extends BaseDomainEvent {
  constructor(public readonly paymentId: string, public readonly payload: any) {
    super('PaymentSucceeded');
  }
}

export class DeliveryCompleted extends BaseDomainEvent {
  constructor(public readonly deliveryId: string, public readonly payload: any) {
    super('DeliveryCompleted');
  }
}

export class ZnsRequested extends BaseDomainEvent {
  constructor(public readonly znsId: string, public readonly payload: any) {
    super('ZnsRequested');
  }
}

export class ZnsDelivered extends BaseDomainEvent {
  constructor(public readonly znsId: string, public readonly payload: any) {
    super('ZnsDelivered');
  }
}
