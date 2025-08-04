/**
 * Key-Value Storage Adapter Interface
 * Following @synet/queue adapter pattern
 */
export interface IKeyValueAdapter {
  /** Adapter name for identification */
  readonly name: string;
  /** Adapter configuration */
  readonly config: Record<string, unknown>;
  
  // Core operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  
  // Batch operations
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(entries: Array<[string, T]>, ttl?: number): Promise<void>;
  deleteMany(keys: string[]): Promise<boolean>;
  
  // Health & monitoring
  isHealthy(): Promise<boolean>;
}

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
}

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
}

/**
 * KV Event types for conscious event-driven behavior
 */
export interface KVEvent {
  type: string;
  key: string;
  value?: unknown;
  ttl?: number;
  timestamp: number;
}

export interface KVSetEvent extends KVEvent {
  type: 'set' | 'update';
  value: unknown;
  ttl?: number;
}

export interface KVGetEvent extends KVEvent {
  type: 'get';
  value: unknown;
  hit: boolean;
}

export interface KVDeleteEvent extends KVEvent {
  type: 'delete';
  existed: boolean;
}

export interface KVExpiredEvent extends KVEvent {
  type: 'expired';
}

export interface KVClearEvent extends KVEvent {
  type: 'clear';
  count?: number;
}

export interface KVErrorEvent extends KVEvent {
  type: 'error';
  error: string;
}

export type KVEvents = KVSetEvent | KVGetEvent | KVDeleteEvent | KVExpiredEvent | KVClearEvent | KVErrorEvent;
