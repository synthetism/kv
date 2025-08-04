/**
 * Interface for events that can be emitted
 * This interface can be extended to create specific event types
 * with additional properties as needed.
 * @see /docs/event-emitter.md
 */
export interface Event {
  type: string;
}

/**
 * Interface for observer objects that want to be notified of specific events
 */
export interface EventObserver<T extends Event> {
  update(event: T): void;
}

/**
 * EventEmitter that maintains a list of observers and notifies them of events
 */
export class EventEmitter<T extends Event> {
  private observers: Map<string, EventObserver<T>[]> = new Map();

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, observer: EventObserver<T>): void {
    const observers = this.observers.get(eventType) || [];
    if (!observers.includes(observer)) {
      observers.push(observer);
      this.observers.set(eventType, observers);
    }
  }

  /**
   * Unsubscribe from events of a specific type
   */
  unsubscribe(eventType: string, observer: EventObserver<T>): void {
    const observers = this.observers.get(eventType);
    if (!observers) return;

    const index = observers.indexOf(observer);
    if (index !== -1) {
      observers.splice(index, 1);
      if (observers.length === 0) {
        this.observers.delete(eventType);
      } else {
        this.observers.set(eventType, observers);
      }
    }
  }

  /**
   * Emit an event to all subscribed observers
   */
  emit(event: T): void {
    const observers = this.observers.get(event.type) || [];
    for (const observer of observers) {
      observer.update(event);
    }
  }

  /**
   * Check if there are any subscribers for a specific event type
   */
  hasObservers(eventType: string): boolean {
    return (
      this.observers.has(eventType) &&
      (this.observers.get(eventType)?.length ?? 0) > 0
    );
  }
}
