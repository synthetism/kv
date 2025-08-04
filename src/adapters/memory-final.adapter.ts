import type { IKeyValueAdapter } from '../interfaces.js';
import { defaultSerialize, defaultDeserialize, type SerializationAdapter } from '../serialization.js';

/**
 * Final memory adapter configuration
 */
export interface MemoryAdapterConfig {
  /** Default TTL in milliseconds (0 = no default TTL) */
  defaultTTL?: number;
  /** Maximum number of keys to store */
  maxKeys?: number;
  /** Cleanup interval for expired keys in milliseconds (0 = no cleanup) */
  cleanupInterval?: number;
  /** Serialization adapter for custom serialization logic */
  serialization?: SerializationAdapter;
}

/**
 * Storage entry with TTL support
 */
interface StorageEntry {
  value: string; // Always serialized
  expires?: number; // Absolute timestamp (Date.now() + ttl)
}

/**
 * Statistics tracking
 */
interface MemoryStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  expired: number;
  keys: number;
  memory: number;
}

/**
 * Memory Adapter 
 * 
 * Features:
 * - Smart serialization with Buffer support and type preservation
 * - TTL with automatic expiration and cleanup
 * - Statistics tracking and memory monitoring
 * - Memory limits with overflow protection
 * - Zero dependencies (Unit Architecture compliant)
 * - Performance optimized
 */
export class MemoryAdapter implements IKeyValueAdapter {
  readonly name = 'memory';
  readonly config: Record<string, unknown>;
  
  private store = new Map<string, StorageEntry>();
  private cleanupTimer?: NodeJS.Timeout;
  private stats: MemoryStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    expired: 0,
    keys: 0,
    memory: 0
  };
  private options: Required<MemoryAdapterConfig>;
  private serialization: SerializationAdapter;
  
  constructor(config: MemoryAdapterConfig = {}) {
    this.options = {
      defaultTTL: 0, // 0 means no default TTL
      maxKeys: 10000,
      cleanupInterval: 60000, // 1 minute
      serialization: { serialize: defaultSerialize, deserialize: defaultDeserialize },
      ...config
    };
    
    this.config = { ...this.options };
    this.serialization = this.options.serialization;
    
    // Start automatic cleanup if interval is set
    if (this.options.cleanupInterval > 0) {
      this.startCleanup();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check TTL expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      this.stats.expired++;
      this.updateStats();
      return null;
    }
    
    this.stats.hits++;
    return this.serialization.deserialize<T>(entry.value);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check max keys limit (only for new keys)
    if (!this.store.has(key) && this.store.size >= this.options.maxKeys) {
      throw new Error(`[MemoryAdapter] Maximum keys limit (${this.options.maxKeys}) reached`);
    }
    
    // Calculate expiration
    const effectiveTTL = ttl ?? (this.options.defaultTTL || undefined);
    const expires = effectiveTTL ? Date.now() + effectiveTTL : undefined;
    
    // Serialize and store
    const serialized = this.serialization.serialize(value);
    this.store.set(key, { value: serialized, expires });
    
    this.stats.sets++;
    this.updateStats();
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.deletes++;
      this.updateStats();
    }
    return existed;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    
    if (!entry) return false;
    
    // Check TTL expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      this.stats.expired++;
      this.updateStats();
      return false;
    }
    
    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.resetStats();
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset<T>(entries: Array<[string, T]>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  async deleteMany(keys: string[]): Promise<boolean> {
    let deletedAny = false;
    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) deletedAny = true;
    }
    return deletedAny;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // ===== Enhanced Methods =====
  
  /**
   * Get comprehensive statistics
   */
  getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all keys (for debugging/monitoring)
   */
  keys(): string[] {
    return Array.from(this.store.keys());
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
      }
    }
    
    this.updateStats();
    return cleaned;
  }

  /**
   * Get memory usage estimate in bytes
   */
  getMemoryUsage(): number {
    let bytes = 0;
    for (const [key, entry] of this.store.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += entry.value.length * 2;
      bytes += 16; // Overhead for expires timestamp and object structure
    }
    return bytes;
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
    this.resetStats();
  }

  // ===== Private Methods =====

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private updateStats(): void {
    this.stats.keys = this.store.size;
    this.stats.memory = this.getMemoryUsage();
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expired: 0,
      keys: 0,
      memory: 0
    };
  }
}
