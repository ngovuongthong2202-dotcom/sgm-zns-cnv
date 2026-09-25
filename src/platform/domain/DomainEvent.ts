export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventName: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName: string;

  constructor(eventName: string) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
    this.eventName = eventName;
  }
}
