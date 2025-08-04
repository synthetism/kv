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
export { MemoryAdapter } from './adapters/memory.adapter.js';
export type { MemoryAdapterConfig } from './adapters/memory.adapter.js';
