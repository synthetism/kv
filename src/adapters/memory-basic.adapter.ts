import type { IKeyValueAdapter } from '../interfaces.js';
import { 
  KVEventEmitter, 
  createEventSubscription, 
  type KVEvent, 
  type KVStats, 
  type KVError 
} from '../events.js';
import { 
  defaultSerialize, 
  defaultDeserialize, 
  type SerializationAdapter 
} from '../serialization.js';

/**
 * Memory adapter configuration
 */
export interface MemoryAdapterConfig {
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Maximum number of keys to store */
  maxKeys?: number;
  /** Enable event emission */
  emitEvents?: boolean;
  /** Cleanup interval for expired keys in milliseconds */
  cleanupInterval?: number;
  /** Custom serialization adapter */
  serialization?: SerializationAdapter;
}

/**
 * Storage entry with TTL support
 */
interface StorageEntry {
  value: string; // Always serialized
  expires?: number; // Absolute timestamp
}

/**
 * Enhanced in-memory key-value adapter
 * Features: TTL, events, stats, serialization, auto-cleanup
 */
export class MemoryAdapter implements IKeyValueAdapter {
  readonly name = 'memory';
  readonly config: Record<string, unknown>;
  
  private store = new Map<string, StorageEntry>();
  private adapterConfig: Required<MemoryAdapterConfig>;
  private events = new KVEventEmitter();
  private stats: KVStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    expired: 0,
    errors: 0,
    keys: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;
  private serialization: SerializationAdapter;
  
  constructor(config: MemoryAdapterConfig = {}) {
    this.adapterConfig = {
      defaultTTL: 0, // 0 means no default TTL
      maxKeys: 10000,
      emitEvents: true,
      cleanupInterval: 60000, // 1 minute
      serialization: { serialize: defaultSerialize, deserialize: defaultDeserialize },
      ...config,
    };
    
    this.config = { ...this.adapterConfig };
    this.serialization = this.adapterConfig.serialization;
    
    // Start cleanup timer if configured
    if (this.adapterConfig.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.store.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.emitEvent({ type: 'get', key, timestamp: Date.now() });
        return null;
      }
      
      // Check TTL expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.store.delete(key);
        this.stats.expired++;
        this.updateKeysCount();
        this.emitEvent({ type: 'expired', key, timestamp: Date.now() });
        return null;
      }
      
      this.stats.hits++;
      const value = this.serialization.deserialize<T>(entry.value);
      this.emitEvent({ type: 'get', key, value, timestamp: Date.now() });
      return value;
      
    } catch (error) {
      this.stats.errors++;
      this.emitError('get', key, error as Error);
      throw error;
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // Check max keys limit
      if (!this.store.has(key) && this.store.size >= this.adapterConfig.maxKeys) {
        const error = new Error(`[MemoryAdapter] Maximum keys limit reached: ${this.adapterConfig.maxKeys}`);
        this.emitError('set', key, error);
        throw error;
      }
      
      // Calculate expiration
      const effectiveTTL = ttl ?? (this.adapterConfig.defaultTTL || undefined);
      const expires = effectiveTTL && effectiveTTL > 0 ? Date.now() + effectiveTTL : undefined;
      
      // Serialize and store
      const serializedValue = this.serialization.serialize(value);
      const entry: StorageEntry = { value: serializedValue, expires };
      
      this.store.set(key, entry);
      this.stats.sets++;
      this.updateKeysCount();
      
      this.emitEvent({ 
        type: 'set', 
        key, 
        value, 
        ttl: effectiveTTL, 
        timestamp: Date.now() 
      });
      
    } catch (error) {
      this.stats.errors++;
      this.emitError('set', key, error as Error);
      throw error;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.store.delete(key);
      
      if (existed) {
        this.stats.deletes++;
        this.updateKeysCount();
        this.emitEvent({ type: 'delete', key, timestamp: Date.now() });
      }
      
      return existed;
      
    } catch (error) {
      this.stats.errors++;
      this.emitError('delete', key, error as Error);
      throw error;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      const entry = this.store.get(key);
      if (!entry) return false;
      
      // Check TTL expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.store.delete(key);
        this.stats.expired++;
        this.updateKeysCount();
        this.emitEvent({ type: 'expired', key, timestamp: Date.now() });
        return false;
      }
      
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.emitError('exists', key, error as Error);
      throw error;
    }
  }
  
  async clear(): Promise<void> {
    try {
      this.store.clear();
      this.resetStats();
      this.emitEvent({ type: 'clear', timestamp: Date.now() });
      
    } catch (error) {
      this.stats.errors++;
      this.emitError('clear', undefined, error as Error);
      throw error;
    }
  }
  
  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }
  
  async mset<T>(entries: Array<[string, T]>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }
  
  async deleteMany(keys: string[]): Promise<boolean> {
    let anyDeleted = false;
    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) anyDeleted = true;
    }
    return anyDeleted;
  }
  
  // Health check
  async isHealthy(): Promise<boolean> {
    return true;
  }
  
  /**
   * Get current statistics
   */
  getStats(): KVStats {
    return {
      ...this.stats,
      memory: this.getMemoryUsage(),
    };
  }

  /**
   * Subscribe to KV events
   */
  onEvent(eventType: string, handler: (event: KVEvent) => void): () => void {
    return createEventSubscription(this.events, eventType, handler);
  }

  /**
   * Subscribe to error events
   */
  onError(handler: (error: KVError) => void): () => void {
    return this.onEvent('error', (event) => {
      if (event.error) {
        handler({
          operation: event.type,
          key: event.key,
          error: event.error,
          timestamp: event.timestamp,
        });
      }
    });
  }

  /**
   * Manual cleanup of expired keys
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.expires && now > entry.expires) {
        this.store.delete(key);
        cleaned++;
        this.stats.expired++;
        this.emitEvent({ type: 'expired', key, timestamp: now });
      }
    }
    
    this.updateKeysCount();
    return cleaned;
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    // Clean expired keys first
    this.cleanup();
    return Array.from(this.store.keys());
  }

  /**
   * Destroy adapter and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.store.clear();
    this.events.clear();
    this.resetStats();
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.adapterConfig.cleanupInterval);
  }

  private emitEvent(event: Omit<KVEvent, 'timestamp'> & { timestamp: number }): void {
    if (this.adapterConfig.emitEvents) {
      this.events.emit(event as KVEvent);
    }
  }

  private emitError(operation: string, key: string | undefined, error: Error): void {
    this.emitEvent({
      type: 'error',
      key,
      error,
      timestamp: Date.now(),
    });
  }

  private updateKeysCount(): void {
    this.stats.keys = this.store.size;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expired: 0,
      errors: 0,
      keys: 0,
    };
  }

  private getMemoryUsage(): number {
    let bytes = 0;
    for (const [key, entry] of this.store.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += entry.value.length * 2;
      bytes += 16; // Overhead for expires timestamp
    }
    return bytes;
  }
}
