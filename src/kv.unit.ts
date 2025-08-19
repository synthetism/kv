import { 
  Unit, 
  EventEmitter,
  createUnitSchema, 
  Capabilities,
  Schema,
  Validator,
  type UnitProps, 
  type TeachingContract,
  type UnitCore,
  type Event,
  type IEventEmitter,

} from '@synet/unit';

import type { IKeyValueAdapter } from "./types.js";
import type {
  KVEvent,
  KVError,
  KVStats,
} from "./types.js";
import { StateAsync, type StorageBinding } from "@synet/state";

/**
 * KeyValue Unit Configuration (following Queue pattern)
 */
export interface KeyValueConfig {
  /** Key-value adapter instance */
  adapter: IKeyValueAdapter;
  /** Unit description */
  description?: string;
  /** Default TTL for keys */
  defaultTTL?: number;
  /** Key namespace */
  namespace?: string;
  /** Whether to throw errors or just emit them */
  throwOnErrors?: boolean;

  /** Whether to emit events for operations */
  emitEvents?: boolean;

  /** Event emitter instance  */
  eventEmitter?: IEventEmitter<KVEvent>;
}

/**
 * KeyValue Unit props
 */
export interface KeyValueProps extends UnitProps {
  adapter: IKeyValueAdapter;
  description: string;
  defaultTTL?: number;
  namespace: string;
  throwOnErrors?: boolean;
  emitEvents?: boolean;
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
 * - Event emission for monitoring and debugging
 * - Error handling with optional throwing
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
export const VERSION = "1.0.0";
export class KeyValue extends Unit<KeyValueProps> {
 

  protected constructor(props: KeyValueProps) {
    super(props);
  }

  static create(config: KeyValueConfig): KeyValue {
    if (!config.adapter) {
      throw new Error(
        "[KeyValue] Adapter is required - provide a key-value adapter instance",
      );
    }

    const props: KeyValueProps = {
      dna: createUnitSchema({
        id: "kv",
        version: VERSION,
      }),
      adapter: config.adapter,
      description:
        config.description ||
        `KeyValue Unit with ${config.adapter.name} adapter`,
      defaultTTL: config.defaultTTL,
      namespace: config.namespace || "",
      throwOnErrors: config.throwOnErrors ?? false,
      emitEvents: config.emitEvents ?? false,
      eventEmitter: config.eventEmitter,
    };

    return new KeyValue(props);
  }

   protected build(): UnitCore {
      const capabilities = Capabilities.create(this.dna.id, {
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
      });

      const schema = Schema.create(this.dna.id, {
        get: {
          name: 'get',
          description: 'Get value by key from storage',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to retrieve' }
            },
            required: ['key']
          }
        },
        set: {
          name: 'set',
          description: 'Set key-value pair with optional TTL',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to store' },
              value: { type: 'object', description: 'Value to store (any type)' },
              ttl: { type: 'number', description: 'Time to live in milliseconds (optional)' }
            },
            required: ['key', 'value']
          }
        },
        delete: {
          name: 'delete',
          description: 'Delete key from storage',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to delete' }
            },
            required: ['key']
          }
        },
        exists: {
          name: 'exists',
          description: 'Check if key exists in storage',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to check' }
            },
            required: ['key']
          }
        },
        clear: {
          name: 'clear',
          description: 'Clear all keys from storage',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        mget: {
          name: 'mget',
          description: 'Get multiple values by keys',
          parameters: {
            type: 'object',
            properties: {
              keys: { 
                type: 'array', 
                description: 'Array of keys to retrieve' 
              }
            },
            required: ['keys']
          }
        },
        mset: {
          name: 'mset',
          description: 'Set multiple key-value pairs',
          parameters: {
            type: 'object',
            properties: {
              entries: { 
                type: 'array', 
                description: 'Array of [key, value] pairs' 
              },
              ttl: { type: 'number', description: 'Time to live in milliseconds (optional)' }
            },
            required: ['entries']
          }
        },
        deleteMany: {
          name: 'deleteMany',
          description: 'Delete multiple keys from storage',
          parameters: {
            type: 'object',
            properties: {
              keys: { 
                type: 'array', 
                description: 'Array of keys to delete' 
              }
            },
            required: ['keys']
          }
        },
        isHealthy: {
          name: 'isHealthy',
          description: 'Check if storage is healthy and connected',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      });
      const validator = Validator.create({
        unitId: this.dna.id,
        capabilities,
        schema,
        strictMode: false
      });
  
      return { capabilities, schema, validator };
    }

      // Consciousness Trinity Access
  capabilities(): Capabilities { return this._unit.capabilities; }
  schema(): Schema { return this._unit.schema; }
  validator(): Validator { return this._unit.validator; }
  
  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    if (!key || typeof key !== "string") {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }

    const fullKey = this.buildKey(key);

    try {
      const value = await this.props.adapter.get<T>(fullKey);

      // Emit get event

      if (this.props.emitEvents) {
        this.emit({
          type: "kv.get",
          key: fullKey,
          value,
          timestamp: new Date(),
        } as KVEvent);
      }

      return value;
    } catch (error) {
      this.handleError("get", fullKey, error as Error);
      throw new Error(
        `[${this.dna.id}] Failed to get key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!key || typeof key !== "string") {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }

    if (value === undefined) {
      throw new Error(`[${this.dna.id}] Value cannot be undefined`);
    }

    const fullKey = this.buildKey(key);
    const effectiveTTL = ttl ?? this.props.defaultTTL;

    try {
      await this.props.adapter.set(fullKey, value, effectiveTTL);

      if (this.props.emitEvents) {
        this.emit({
          type: "kv.set",
          key: fullKey,
          value,
          ttl: effectiveTTL,
          timestamp: new Date(),
        } as KVEvent);
      }
    } catch (error) {
      this.handleError("set", fullKey, error as Error);
      throw new Error(
        `[${this.dna.id}] Failed to set key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a key from storage
   */
  async delete(key: string): Promise<boolean> {
    if (!key || typeof key !== "string") {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }

    const fullKey = this.buildKey(key);

    try {
      const deleted = await this.props.adapter.delete(fullKey);

      if (this.props.emitEvents) {
        this.emit({
          type: "kv.delete",
          key: fullKey,
          timestamp: new Date(),
        } as KVEvent);
      }

      return deleted;
    } catch (error) {
      this.handleError("delete", fullKey, error as Error);
      throw new Error(
        `[${this.dna.id}] Failed to delete key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a key exists in storage
   */
  async exists(key: string): Promise<boolean> {
    if (!key || typeof key !== "string") {
      throw new Error(`[${this.dna.id}] Key must be a non-empty string`);
    }

    const fullKey = this.buildKey(key);

    try {
      return await this.props.adapter.exists(fullKey);
    } catch (error) {
      throw new Error(
        `[${this.dna.id}] Failed to check key existence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clear all keys from storage
   */
  async clear(): Promise<void> {
    try {
      await this.props.adapter.clear();

      if (this.props.emitEvents) {
        this.emit({
          type: "kv.clear",
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.handleError("clear", undefined, error as Error);
      throw new Error(
        `[${this.dna.id}] Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!Array.isArray(keys)) {
      throw new Error(`[${this.dna.id}] Keys must be an array`);
    }

    const fullKeys = keys.map((key) => {
      if (!key || typeof key !== "string") {
        throw new Error(`[${this.dna.id}] All keys must be non-empty strings`);
      }
      return this.buildKey(key);
    });

    try {
      return await this.props.adapter.mget<T>(fullKeys);
    } catch (error) {
      throw new Error(
        `[${this.dna.id}] Failed to get multiple keys: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      if (!key || typeof key !== "string") {
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
      throw new Error(
        `[${this.dna.id}] Failed to set multiple keys: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete multiple keys at once
   */
  async deleteMany(keys: string[]): Promise<boolean> {
    if (!Array.isArray(keys)) {
      throw new Error(`[${this.dna.id}] Keys must be an array`);
    }

    const fullKeys = keys.map((key) => {
      if (!key || typeof key !== "string") {
        throw new Error(`[${this.dna.id}] All keys must be non-empty strings`);
      }
      return this.buildKey(key);
    });

    try {
      return await this.props.adapter.deleteMany(fullKeys);
    } catch (error) {
      throw new Error(
        `[${this.dna.id}] Failed to delete multiple keys: ${error instanceof Error ? error.message : String(error)}`,
      );
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
   * Get adapter statistics if available
   */
  getStats(): KVStats | null {
    if (
      "getStats" in this.props.adapter &&
      typeof this.props.adapter.getStats === "function"
    ) {
      return this.props.adapter.getStats() as KVStats;
    }
    return null;
  }

  /**
   * Subscribe to KV events
   *
   * Available events:
   * - 'set': When a key is set
   * - 'get': When a key is retrieved
   * - 'delete': When a key is deleted
   * - 'clear': When storage is cleared
   * - 'error': When an error occurs
   * - 'expired': When a key expires (TTL)
   *
   * @param eventType - Type of event to listen for
   * @param handler - Function to call when event occurs
   * @returns Unsubscribe function
   */


  

  /**
   * Subscribe to events using legacy observer pattern
   */
  onEvent(eventType: string, handler: (event: KVEvent) => void): () => void {
    return this.on(eventType, handler);
  }


  /**
   * Manual cleanup if adapter supports it
   */
  cleanup(): number {
    if (
      "cleanup" in this.props.adapter &&
      typeof this.props.adapter.cleanup === "function"
    ) {
      return this.props.adapter.cleanup() as number;
    }
    return 0;
  }

  /**
   * Producer Pattern: Create a StateAsync unit backed by this storage
   * 
   * This is the KeyValue → StateAsync producer pattern.
   * KeyValue knows how to create storage bindings for State units.
   * 
   * @param config Configuration for the State unit
   * @returns StateAsync unit with this KeyValue as storage backend
   */
  createState(config: { unitId: string; initialState?: Record<string, unknown>; emitEvents?: boolean } = { unitId: 'kv-state' }): StateAsync {
    // Create storage binding from this KeyValue instance
    const storageBinding: StorageBinding = {
      get: async <T>(key: string): Promise<T | null> => {
        return this.get<T>(key);
      },
      set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
        return this.set(key, value, ttl);
      },
      delete: async (key: string): Promise<boolean> => {
        return this.delete(key);
      },
      exists: async (key: string): Promise<boolean> => {
        return this.exists(key);
      },
      clear: async (): Promise<void> => {
        return this.clear();
      }
    };

    // Create StateAsync with this KeyValue as storage backend
    return StateAsync.create({
      unitId: config.unitId,
      initialState: config.initialState || {},
      emitEvents: config.emitEvents ?? false,
      storage: storageBinding
    });
  }

  /**
   * Build full key with namespace
   */
  private buildKey(key: string): string {
    return this.props.namespace ? `${this.props.namespace}:${key}` : key;
  }

  /**
   * Handle errors according to configuration
   */
  private handleError(
    operation: string,
    key: string | undefined,
    error: Error,
  ): void {
    const kvError: KVError = {
      type: "kv.error",
      operation,
      key,
      error,
      timestamp: new Date(),
    };

    // Emit error event
    this.emit(kvError);

    // Throw if configured to do so
    if (this.props.throwOnErrors) {
      throw error;
    }
  }

  /**
   * Teach storage capabilities to other units
   */
 
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: this._unit.capabilities,
      schema: this._unit.schema,
      validator: this._unit.validator
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
NAMESPACE: ${this.props.namespace || "none"}
DEFAULT TTL: ${this.props.defaultTTL || "none"}

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
