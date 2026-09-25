import { DomainEvent } from '../domain/DomainEvent';

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const currentHandlers = this.handlers.get(eventName) || [];
    currentHandlers.push(handler as EventHandler);
    this.handlers.set(eventName, currentHandlers);
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName) || [];
    // Publish asynchronously to not block the main thread
    Promise.allSettled(eventHandlers.map(handler => handler(event))).then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.error(`[EventBus] Error handling event ${event.eventName}:`, result.reason);
        }
      });
    });
  }
}

export const eventBus = EventBus.getInstance();
