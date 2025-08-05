/**
 * KV operation events
 */
export interface KVEvent {
  type: "set" | "get" | "delete" | "clear" | "expired" | "error";
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
 * Based on observer pattern but with direct on/off interface like Node.js EventEmitter
 */
export class KVEventEmitter {
  private handlers = new Map<string, Array<(event: KVEvent) => void>>();

  /**
   * Subscribe to events of a specific type
   */
  on(eventType: string, handler: (event: KVEvent) => void): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, handler?: (event: KVEvent) => void): void {
    if (!handler) {
      // Remove all handlers for this event type
      this.handlers.delete(eventType);
      return;
    }

    const existing = this.handlers.get(eventType);
    if (existing) {
      const index = existing.indexOf(handler);
      if (index !== -1) {
        existing.splice(index, 1);
        if (existing.length === 0) {
          this.handlers.delete(eventType);
        } else {
          this.handlers.set(eventType, existing);
        }
      }
    }
  }

  /**
   * Subscribe to events using observer pattern (legacy compatibility)
   */
  subscribe(eventType: string, observer: KVEventObserver): void {
    this.on(eventType, observer.update);
  }

  /**
   * Unsubscribe using observer pattern (legacy compatibility)
   */
  unsubscribe(eventType: string, observer: KVEventObserver): void {
    this.off(eventType, observer.update);
  }

  /**
   * Emit an event to all subscribed handlers
   */
  emit(event: KVEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        // Don't let handler errors break the emitter
        console.error("[KVEventEmitter] Handler error:", error);
      }
    }
  }

  /**
   * Remove all listeners for event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get number of listeners for event type
   */
  listenerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Check if there are any subscribers for a specific event type
   */
  hasObservers(eventType: string): boolean {
    return this.listenerCount(eventType) > 0;
  }

  /**
   * Get all active event types
   */
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all observers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Helper to create event subscription with automatic cleanup
 */
export const createEventSubscription = (
  emitter: KVEventEmitter,
  eventType: string,
  handler: (event: KVEvent) => void,
): (() => void) => {
  emitter.on(eventType, handler);
  return () => emitter.off(eventType, handler);
};
