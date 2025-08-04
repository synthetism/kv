#!/usr/bin/env tsx

/**
 * @synet/kv Serialization Architecture Demo
 * 
 * Shows how adapters use centralized serialization patterns
 */

import { 
  KeyValue, 
  MemoryAdapter, 
  defaultSerialize, 
  defaultDeserialize,
  jsonSerializer,
  identitySerializer,
  createSerializationAdapter,
  type SerializationAdapter 
} from '../src/index.js';

async function main() {
  console.log('🧬 SYNET KV Serialization Architecture Demo\n');

  // ===== 1. Default Serialization (Buffer + Type Preservation) =====
  console.log('1️⃣ Default Serialization (Buffer + Type Preservation)');
  
  const defaultAdapter = new MemoryAdapter({
    maxKeys: 100,
    // Uses default serialization automatically
  });
  
  const kv1 = KeyValue.create({
    adapter: defaultAdapter,
    namespace: 'default-serialization'
  });

  // Test different data types
  await kv1.set('string', 'Hello World');
  await kv1.set('number', 42);
  await kv1.set('boolean', true);
  await kv1.set('object', { name: 'Alice', age: 30 });
  await kv1.set('array', [1, 2, 3]);
  await kv1.set('buffer', Buffer.from('binary data', 'utf8'));
  await kv1.set('escaped-string', ':special:value');

  console.log('✅ Stored various data types with default serialization');
  console.log('Buffer value:', await kv1.get('buffer'));
  console.log('Escaped string:', await kv1.get('escaped-string'));
  console.log();

  // ===== 2. JSON-Only Serialization (Faster, No Buffers) =====
  console.log('2️⃣ JSON-Only Serialization (Faster, No Buffer Support)');
  
  const jsonAdapter = new MemoryAdapter({
    maxKeys: 100,
    serialization: jsonSerializer // Uses simple JSON.stringify/parse
  });
  
  const kv2 = KeyValue.create({
    adapter: jsonAdapter,
    namespace: 'json-serialization'
  });

  await kv2.set('simple-object', { id: 123, name: 'Bob' });
  await kv2.set('array', ['a', 'b', 'c']);
  
  console.log('✅ JSON serialization - faster but no Buffer support');
  console.log('Object:', await kv2.get('simple-object'));
  console.log();

  // ===== 3. Custom Serialization Adapter =====
  console.log('3️⃣ Custom Serialization (Compression Simulation)');
  
  const customSerializer: SerializationAdapter = createSerializationAdapter(
    // Custom serialize: add compression marker
    (value: unknown) => `COMPRESSED:${defaultSerialize(value)}`,
    // Custom deserialize: remove compression marker
    <T>(data: string): T => {
      if (data.startsWith('COMPRESSED:')) {
        return defaultDeserialize<T>(data.slice(11));
      }
      return defaultDeserialize<T>(data);
    }
  );
  
  const customAdapter = new MemoryAdapter({
    maxKeys: 100,
    serialization: customSerializer
  });
  
  const kv3 = KeyValue.create({
    adapter: customAdapter,
    namespace: 'custom-serialization'
  });

  await kv3.set('compressed-data', { large: 'dataset', numbers: [1,2,3,4,5] });
  
  console.log('✅ Custom serialization with compression markers');
  console.log('Compressed data:', await kv3.get('compressed-data'));
  console.log();

  // ===== 4. Identity Serialization (Pre-serialized Data) =====
  console.log('4️⃣ Identity Serialization (For Pre-serialized Data)');
  
  const identityAdapter = new MemoryAdapter({
    maxKeys: 100,
    serialization: identitySerializer // No serialization - strings only
  });
  
  const kv4 = KeyValue.create({
    adapter: identityAdapter,
    namespace: 'identity-serialization'
  });

  // Store already serialized data
  await kv4.set('json-string', '{"already":"serialized"}');
  await kv4.set('plain-text', 'just a string');
  
  console.log('✅ Identity serialization - no processing');
  console.log('JSON string:', await kv4.get('json-string'));
  console.log();

  // ===== 5. Demonstrate External Adapter Pattern =====
  console.log('5️⃣ External Adapter Pattern (How 3rd Party Adapters Work)');
  
  // Simulating external adapter that imports our serialization
  class ExternalRedisAdapter implements IKeyValueAdapter {
    readonly name = 'external-redis';
    readonly config: Record<string, unknown>;
    private serialization: SerializationAdapter;
    
    constructor(config: { serialization?: SerializationAdapter } = {}) {
      // External adapters can use our default serialization
      this.serialization = config.serialization || {
        serialize: defaultSerialize,
        deserialize: defaultDeserialize
      };
      this.config = config;
    }
    
    async get<T>(key: string): Promise<T | null> {
      // Simulate Redis get
      const rawData = this.mockRedisGet(key);
      if (!rawData) return null;
      return this.serialization.deserialize<T>(rawData);
    }
    
    async set<T>(key: string, value: T): Promise<void> {
      // Simulate Redis set
      const serialized = this.serialization.serialize(value);
      this.mockRedisSet(key, serialized);
    }
    
    async delete(): Promise<boolean> { return true; }
    async exists(): Promise<boolean> { return true; }
    async clear(): Promise<void> { }
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
      return Promise.all(keys.map(key => this.get<T>(key)));
    }
    async mset<T>(entries: Array<[string, T]>): Promise<void> {
      for (const [key, value] of entries) {
        await this.set(key, value);
      }
    }
    async deleteMany(keys: string[]): Promise<boolean> {
      for (const key of keys) {
        this.mockRedisStorage.delete(key);
      }
      return true;
    }
    async isHealthy(): Promise<boolean> { return true; }
    
    private mockRedisStorage = new Map<string, string>();
    private mockRedisGet(key: string): string | null {
      return this.mockRedisStorage.get(key) || null;
    }
    private mockRedisSet(key: string, value: string): void {
      this.mockRedisStorage.set(key, value);
    }
  }
  
  const externalAdapter = new ExternalRedisAdapter({
    serialization: { serialize: defaultSerialize, deserialize: defaultDeserialize }
  });
  
  const kv5 = KeyValue.create({
    adapter: externalAdapter,
    namespace: 'external-adapter'
  });

  await kv5.set('external-test', { message: 'External adapter using @synet/kv serialization!' });
  console.log('✅ External adapter with @synet/kv serialization');
  console.log('External result:', await kv5.get('external-test'));
  console.log();

  // ===== 6. Show Statistics =====
  console.log('📊 Adapter Statistics:');
  
  const adapters = [
    { name: 'Default', adapter: defaultAdapter },
    { name: 'JSON', adapter: jsonAdapter },
    { name: 'Custom', adapter: customAdapter },
    { name: 'Identity', adapter: identityAdapter }
  ];
  
  for (const { name, adapter } of adapters) {
    if ('getStats' in adapter && typeof adapter.getStats === 'function') {
      const stats = adapter.getStats();
      console.log(`${name}: ${stats.keys} keys, ${stats.sets} sets, ${stats.hits} hits, ${stats.memory} bytes`);
    }
  }

  console.log('\n💡 Architecture Benefits:');
  console.log('• Centralized serialization logic in @synet/kv');
  console.log('• External adapters can import and use our serialization');
  console.log('• Configurable per adapter instance');
  console.log('• Zero dependencies for adapters');
  console.log('• Type preservation with Buffer support');
  console.log('• Performance options (JSON vs enhanced)');
}

// Import the interface for the demo
import type { IKeyValueAdapter } from '../src/interfaces.js';

main().catch(console.error);
