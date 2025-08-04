import { Unit, type UnitProps, type TeachingContract, createUnitSchema } from '@synet/unit';
import type { IKeyValueAdapter, KeyValueConfig } from './interfaces.js';

// Re-export config type for convenience
export type { KeyValueConfig } from './interfaces.js';

/**
 * KeyValue Unit props
 */
export interface KeyValueProps extends UnitProps {
  adapter: IKeyValueAdapter;
  description: string;
  defaultTTL?: number;
  namespace: string;
}

/**
 * KeyValue Unit - Consciousness-based key-value storage architecture
 * 
 * A Unit that wraps key-value adapters, providing consciousness-based
 * storage operations with teaching/learning capabilities.
 * 
 * Key Capabilities:
 * - Key-value storage operations (get, set, delete)
 * - Provider-agnostic through adapters
 * - Teaching storage capabilities to other units
 * - Learning storage patterns from other units
 * - Runtime validation and error guidance
 * 
 * Example:
 * ```typescript
 * const memory = new MemoryAdapter();
 * const kv = KeyValue.create({ adapter: memory });
 * 
 * // Store values
 * await kv.set('user:123', { name: 'Alice' });
 * const user = await kv.get('user:123');
 * 
 * // Teach capabilities
 * const contract = kv.teach();
 * otherUnit.learn([contract]);
 * ```
 */
export class KeyValue extends Unit<KeyValueProps> {
  protected constructor(props: KeyValueProps) {
    super(props);
  }
  
  static create(config: KeyValueConfig): KeyValue {
    if (!config.adapter) {
      throw new Error('[KeyValue] Adapter is required - provide a key-value adapter instance');
    }
    
    const props: KeyValueProps = {
      dna: createUnitSchema({
        id: "kv",
        version: "1.0.0",
      }),
      adapter: config.adapter,
      description: config.description || `KeyValue Unit with ${config.adapter.name} adapter`,
      defaultTTL: config.defaultTTL,
      namespace: config.namespace || '',
    };
    
    return new KeyValue(props);
  }

  
  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    if (!key || typeof key !== 'string') {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }
    
    const fullKey = this.buildKey(key);
    
    try {
      return await this.props.adapter.get<T>(fullKey);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to get key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }
    
    if (value === undefined) {
      throw new Error(`[${this.dna.id}] Value cannot be undefined`);
    }
    
    const fullKey = this.buildKey(key);
    const effectiveTTL = ttl ?? this.props.defaultTTL;
    
    try {
      await this.props.adapter.set(fullKey, value, effectiveTTL);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to set key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a key from storage
   */
  async delete(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }
    
    const fullKey = this.buildKey(key);
    
    try {
      return await this.props.adapter.delete(fullKey);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to delete key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a key exists in storage
   */
  async exists(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }
    
    const fullKey = this.buildKey(key);
    
    try {
      return await this.props.adapter.exists(fullKey);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to check key existence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all keys from storage
   */
  async clear(): Promise<void> {
    try {
      await this.props.adapter.clear();
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!Array.isArray(keys)) {
      throw new Error(`[${this.dna.id}] Keys must be an array`);
    }
    
    const fullKeys = keys.map(key => {
      if (!key || typeof key !== 'string') {
        throw new Error(`[${this.dna.id}] All keys must be non-empty strings`);
      }
      return this.buildKey(key);
    });
    
    try {
      return await this.props.adapter.mget<T>(fullKeys);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to get multiple keys: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(entries: Array<[string, T]>, ttl?: number): Promise<void> {
    if (!Array.isArray(entries)) {
      throw new Error(`[${this.dna.id}] Entries must be an array`);
    }
    
    const fullEntries: Array<[string, T]> = entries.map(([key, value]) => {
      if (!key || typeof key !== 'string') {
        throw new Error(`[${this.dna.id}] All keys must be non-empty strings`);
      }
      if (value === undefined) {
        throw new Error(`[${this.dna.id}] Values cannot be undefined`);
      }
      return [this.buildKey(key), value];
    });
    
    const effectiveTTL = ttl ?? this.props.defaultTTL;
    
    try {
      await this.props.adapter.mset(fullEntries, effectiveTTL);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to set multiple keys: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete multiple keys at once
   */
  async deleteMany(keys: string[]): Promise<boolean> {
    if (!Array.isArray(keys)) {
      throw new Error(`[${this.dna.id}] Keys must be an array`);
    }
    
    const fullKeys = keys.map(key => {
      if (!key || typeof key !== 'string') {
        throw new Error(`[${this.dna.id}] All keys must be non-empty strings`);
      }
      return this.buildKey(key);
    });
    
    try {
      return await this.props.adapter.deleteMany(fullKeys);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to delete multiple keys: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if storage is healthy/connected
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await this.props.adapter.isHealthy();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current adapter info
   */
  getAdapter(): { name: string; config: Record<string, unknown> } {
    return {
      name: this.props.adapter.name,
      config: this.props.adapter.config,
    };
  }

  /**
   * Build full key with namespace
   */
  private buildKey(key: string): string {
    return this.props.namespace ? `${this.props.namespace}:${key}` : key;
  }

  /**
   * Teach storage capabilities to other units
   */
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        get: async (...args: unknown[]) => {
          const [key] = args as [string];
          return this.get(key);
        },
        set: async (...args: unknown[]) => {
          const [key, value, ttl] = args as [string, unknown, number?];
          return this.set(key, value, ttl);
        },
        delete: async (...args: unknown[]) => {
          const [key] = args as [string];
          return this.delete(key);
        },
        exists: async (...args: unknown[]) => {
          const [key] = args as [string];
          return this.exists(key);
        },
        clear: async (...args: unknown[]) => {
          return this.clear();
        },
        mget: async (...args: unknown[]) => {
          const [keys] = args as [string[]];
          return this.mget(keys);
        },
        mset: async (...args: unknown[]) => {
          const [entries, ttl] = args as [Array<[string, unknown]>, number?];
          return this.mset(entries, ttl);
        },
        deleteMany: async (...args: unknown[]) => {
          const [keys] = args as [string[]];
          return this.deleteMany(keys);
        },
        isHealthy: async (...args: unknown[]) => {
          return this.isHealthy();
        },
        getAdapter: (...args: unknown[]) => {
          return this.getAdapter();
        },
      }
    };
  }

  /**
   * Help documentation
   */
  help(): string {
    return `
KeyValue Unit v${this.dna.version} - ${this.props.description}

CAPABILITIES:
• get(key) - Get value by key
• set(key, value, ttl?) - Set key-value pair with optional TTL
• delete(key) - Delete key
• exists(key) - Check if key exists
• clear() - Clear all keys
• mget(keys) - Get multiple values
• mset(entries, ttl?) - Set multiple key-value pairs
• deleteMany(keys) - Delete multiple keys
• isHealthy() - Check storage health
• getAdapter() - Get adapter info

ADAPTER: ${this.props.adapter.name}
CONFIG: ${JSON.stringify(this.props.adapter.config, null, 2)}
NAMESPACE: ${this.props.namespace || 'none'}
DEFAULT TTL: ${this.props.defaultTTL || 'none'}

EXAMPLE:
const kv = KeyValue.create({ adapter: new MemoryAdapter() });

// Store values
await kv.set('user:123', { name: 'Alice' });
const user = await kv.get('user:123');

// Batch operations
await kv.mset([['key1', 'value1'], ['key2', 'value2']]);
const values = await kv.mget(['key1', 'key2']);

TEACHING:
const contract = kv.teach();
otherUnit.learn([contract]);

LEARNING:
// KeyValue units primarily compose rather than learn
// Storage patterns can be learned from other storage units
`;
  }

  /**
   * Unit identity
   */
  whoami(): string {
    return `KeyValue Unit (${this.props.adapter.name} adapter) - Key-value storage with consciousness-based architecture`;
  }
}
