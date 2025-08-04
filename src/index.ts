/**
 * @synet/kv - Consciousness-based key-value storage with Unit Architecture
 * 
 * Provides universal key-value storage abstraction following Unit Architecture principles.
 * 
 * @example
 * ```typescript
 * import { KeyValue, MemoryAdapter } from '@synet/kv';
 * 
 * const adapter = new MemoryAdapter();
 * const kv = KeyValue.create({ adapter });
 * 
 * await kv.set('user:123', { name: 'Alice' });
 * const user = await kv.get('user:123');
 * 
 * // Teaching capabilities
 * const contract = kv.teach();
 * otherUnit.learn([contract]);
 * ```
 */

// Core unit
export { KeyValue } from './kv.unit.js';
export type { KeyValueConfig, KeyValueProps } from './kv.unit.js';

// Interfaces
export type { IKeyValueAdapter } from './interfaces.js';

// Adapters
export { MemoryAdapter } from './adapters/memory-final.adapter.js';
export type { MemoryAdapterConfig } from './adapters/memory-final.adapter.js';

// Events and monitoring
export { 
  KVEventEmitter, 
  createEventSubscription 
} from './events.js';
export type { 
  KVEvent, 
  KVStats, 
  KVError, 
  KVEventObserver 
} from './events.js';

// Serialization
export { 
  defaultSerialize, 
  defaultDeserialize, 
  createSerializationAdapter,
  jsonSerializer,
  identitySerializer
} from './serialization.js';
export type { SerializationAdapter } from './serialization.js';
