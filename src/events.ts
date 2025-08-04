/**
 * KV operation events
 */
export interface KVEvent {
  type: 'set' | 'get' | 'delete' | 'clear' | 'expired' | 'error';
  key?: string;
  value?: unknown;
  ttl?: number;
  error?: Error;
  timestamp: number;
}

/**
 * KV operation statistics
 */
export interface KVStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  expired: number;
  errors: number;
  keys: number;
  memory?: number;
}

/**
 * KV error types
 */
export interface KVError {
  operation: string;
  key?: string;
  error: Error;
  timestamp: number;
}

/**
 * Event observer interface
 */
export interface KVEventObserver {
  update(event: KVEvent): void;
}

/**
 * Simple event emitter for KV operations
 * Based on observer pattern from @synet/patterns
 */
export class KVEventEmitter {
  private observers: Map<string, KVEventObserver[]> = new Map();

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, observer: KVEventObserver): void {
    const observers = this.observers.get(eventType) || [];
    if (!observers.includes(observer)) {
      observers.push(observer);
      this.observers.set(eventType, observers);
    }
  }

  /**
   * Unsubscribe from events of a specific type
   */
  unsubscribe(eventType: string, observer: KVEventObserver): void {
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
  emit(event: KVEvent): void {
    const observers = this.observers.get(event.type) || [];
    for (const observer of observers) {
      try {
        observer.update(event);
      } catch (error) {
        // Don't let observer errors break the emitter
        console.error('KVEventEmitter observer error:', error);
      }
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

  /**
   * Get all active event types
   */
  getEventTypes(): string[] {
    return Array.from(this.observers.keys());
  }

  /**
   * Clear all observers
   */
  clear(): void {
    this.observers.clear();
  }
}

/**
 * Helper to create event subscription with automatic cleanup
 */
export const createEventSubscription = (
  emitter: KVEventEmitter,
  eventType: string,
  handler: (event: KVEvent) => void
): (() => void) => {
  const observer: KVEventObserver = { update: handler };
  emitter.subscribe(eventType, observer);
  return () => emitter.unsubscribe(eventType, observer);
};
