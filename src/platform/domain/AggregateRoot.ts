import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot<T> {
  private _domainEvents: DomainEvent[] = [];
  public readonly id: string;
  public props: T;

  constructor(props: T, id: string) {
    this.id = id;
    this.props = props;
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
