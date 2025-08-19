import type { 
   Event,
} from '@synet/unit';

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

type KVEventTypes = 
'kv.set' | 
'kv.update' | 
'kv.get' | 
'kv.delete' | 
'kv.expired' | 
'kv.clear' | 
'kv.error';

/**
 * KV Event types for conscious event-driven behavior
 */
export interface KVEvent extends Event {
  type: KVEventTypes;
  key?: string;
  value?: unknown;
  ttl?: number;
}

export interface KVError extends KVEvent  {
  operation: string;
}

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
