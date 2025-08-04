import type { IKeyValueAdapter } from '../interfaces.js';

/**
 * Memory adapter configuration
 */
export interface MemoryAdapterConfig {
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Maximum number of keys to store */
  maxKeys?: number;
}

/**
 * In-memory key-value adapter
 * Perfect for development, testing, and single-instance applications
 */
export class MemoryAdapter implements IKeyValueAdapter {
  readonly name = 'memory';
  readonly config: Record<string, unknown>;
  
  private store = new Map<string, { value: unknown; expires?: number }>();
  private adapterConfig: MemoryAdapterConfig;
  
  constructor(config: MemoryAdapterConfig = {}) {
    this.adapterConfig = {
      defaultTTL: undefined,
      maxKeys: 10000,
      ...config,
    };
    this.config = { ...this.adapterConfig };
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check max keys limit
    if (!this.store.has(key) && this.store.size >= (this.adapterConfig.maxKeys || 10000)) {
      throw new Error(`[MemoryAdapter] Maximum keys limit reached: ${this.adapterConfig.maxKeys}`);
    }
    
    const entry: { value: T; expires?: number } = { value };
    
    if (ttl && ttl > 0) {
      entry.expires = Date.now() + ttl;
    }
    
    this.store.set(key, entry);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
  
  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
  
  async clear(): Promise<void> {
    this.store.clear();
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
   * Get current store statistics
   */
  getStats(): { size: number; maxKeys: number } {
    return {
      size: this.store.size,
      maxKeys: this.adapterConfig.maxKeys || 10000
    };
  }
}
