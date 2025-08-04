import type { IKeyValueAdapter } from '../interfaces.js';

/**
 * Enhanced memory adapter configuration
 */
export interface EnhancedMemoryAdapterConfig {
  maxKeys?: number;
  defaultTTL?: number;
  cleanupInterval?: number; // Auto-cleanup expired keys
  serialize?: (value: unknown) => string;
  deserialize?: <T>(data: string) => T;
}

/**
 * Enhanced Memory Adapter with keyv-inspired features
 * 
 * Features:
 * - Automatic expiration cleanup
 * - Serialization support  
 * - Statistics tracking
 * - Memory management
 */
export class EnhancedMemoryAdapter implements IKeyValueAdapter {
  readonly name = 'enhanced-memory';
  readonly config: Record<string, unknown>;
  
  private store = new Map<string, { value: string; expires?: number }>();
  private cleanupTimer?: NodeJS.Timeout;
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0, expired: 0 };
  private options: Required<EnhancedMemoryAdapterConfig>;
  
  constructor(config: EnhancedMemoryAdapterConfig = {}) {
    this.options = {
      maxKeys: 1000,
      defaultTTL: 0, // 0 means no default TTL
      cleanupInterval: 60000, // 1 minute
      serialize: (value) => JSON.stringify(value),
      deserialize: <T>(data: string): T => JSON.parse(data),
      ...config
    };
    
    this.config = this.options;
    
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
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      this.stats.expired++;
      return null;
    }
    
    this.stats.hits++;
    return this.options.deserialize<T>(entry.value);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check max keys limit
    if (!this.store.has(key) && this.store.size >= this.options.maxKeys) {
      throw new Error(`[${this.name}] Maximum keys limit (${this.options.maxKeys}) reached`);
    }
    
    const effectiveTTL = ttl ?? (this.options.defaultTTL || undefined);
    const expires = effectiveTTL ? Date.now() + effectiveTTL : undefined;
    const serialized = this.options.serialize(value);
    
    this.store.set(key, { value: serialized, expires });
    this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.deletes++;
    }
    return existed;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    
    if (!entry) return false;
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      this.stats.expired++;
      return false;
    }
    
    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, expired: 0 };
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

  // Enhanced methods
  
  /**
   * Get current statistics
   */
  getStats() {
    return { 
      ...this.stats, 
      keys: this.store.size,
      memory: this.getMemoryUsage()
    };
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
    
    return cleaned;
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
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private getMemoryUsage(): number {
    // Rough estimate of memory usage
    let bytes = 0;
    for (const [key, entry] of this.store.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += entry.value.length * 2;
      bytes += 16; // Overhead for expires timestamp
    }
    return bytes;
  }
}
