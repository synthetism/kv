#!/usr/bin/env tsx

/**
 * @synet/kv Event System Demo
 * 
 * Demonstrates consciousness-based event-driven key-value storage
 */

import { KeyValue, MemoryAdapter } from '../src/index.js';

async function main() {
  console.log('🎭 SYNET KeyValue Event System Demo\n');

  // Create KeyValue unit with final memory adapter
  const adapter = new MemoryAdapter({
    maxKeys: 1000,
    defaultTTL: 0,
    cleanupInterval: 0, // Manual cleanup for demo
  });

  const kv = KeyValue.create({
    adapter,
    namespace: 'demo',
    description: 'Event-driven KeyValue storage'
  });

  console.log('📊 Unit Identity:');
  console.log(kv.whoami());
  console.log();

  // Set up event listeners
  console.log('🎪 Setting up event listeners...\n');

  // Listen to all set operations
  const unsubscribeSet = kv.on('set', (event) => {
    console.log(`🔥 SET EVENT: Key "${event.key}" set with value:`, event.value);
    if (event.ttl) console.log(`   ⏰ TTL: ${event.ttl}ms`);
  });

  // Listen to all get operations
  kv.on('get', (event) => {
    console.log(`👁️  GET EVENT: Key "${event.key}" retrieved:`, event.value || 'null');
  });

  // Listen to delete operations
  kv.on('delete', (event) => {
    console.log(`🗑️  DELETE EVENT: Key "${event.key}" deleted`);
  });

  // Listen to expired keys
  kv.on('expired', (event) => {
    console.log(`⏰ EXPIRED EVENT: Key "${event.key}" expired due to TTL`);
  });

  // Listen to errors
  kv.onError((error) => {
    console.log(`❌ ERROR EVENT: ${error.operation} failed for key "${error.key}":`, error.error.message);
  });

  // Listen to clear operations
  kv.on('clear', (event) => {
    console.log('🧹 CLEAR EVENT: Storage cleared');
  });

  console.log('🔧 Performing operations that trigger events...\n');

  // Basic operations
  await kv.set('user:alice', { name: 'Alice', role: 'admin' });
  await kv.set('user:bob', { name: 'Bob', role: 'user' });
  await kv.set('config:theme', 'dark');

  await kv.get('user:alice');
  await kv.get('nonexistent-key');

  // TTL operations
  console.log('\n⏰ Testing TTL events...');
  await kv.set('temp-session', { id: 'sess123' }, 1000); // 1 second TTL
  await kv.get('temp-session');

  // Wait for expiration
  console.log('⏳ Waiting 1.2 seconds for TTL expiration...');
  await new Promise(resolve => setTimeout(resolve, 1200));
  await kv.get('temp-session'); // Should trigger expired event

  // Batch operations
  console.log('\n📦 Testing batch operations...');
  await kv.mset([
    ['batch:1', 'first'],
    ['batch:2', 'second']
  ] as Array<[string, unknown]>);

  await kv.mget(['batch:1', 'batch:2', 'nonexistent']);

  // Delete operations
  console.log('\n🗑️ Testing delete operations...');
  await kv.delete('user:bob');
  await kv.deleteMany(['batch:1', 'batch:2']);

  // Demonstrate event unsubscription
  console.log('\n🔇 Unsubscribing from SET events...');
  unsubscribeSet(); // Stop listening to set events

  await kv.set('after-unsubscribe', 'should not show set event');

  // Clear storage (will still trigger clear event)
  console.log('\n🧹 Clearing storage...');
  await kv.clear();

  // Demonstrate adapter-level events
  console.log('\n🔧 Adapter-level event demo...');
  
  // Subscribe directly to adapter events (if supported)
  if ('onEvent' in adapter && typeof adapter.onEvent === 'function') {
    adapter.onEvent('set', (event) => {
      console.log(`📡 ADAPTER EVENT: Raw set event for key "${event.key}"`);
    });
    
    await kv.set('adapter-demo', 'direct adapter event');
  }

  // Demonstrate teaching event capabilities
  console.log('\n🎓 Teaching event capabilities...');
  
  // Create a mock unit that learns from KeyValue
  const mockUnit = {
    capabilities: new Map(),
    learn: function(contracts: Array<{ capabilities: Record<string, (...args: unknown[]) => unknown> }>) {
      for (const contract of contracts) {
        for (const [name, capability] of Object.entries(contract.capabilities)) {
          this.capabilities.set(name, capability);
        }
      }
    },
    execute: function(capability: string, ...args: unknown[]) {
      const fn = this.capabilities.get(capability);
      if (fn) return fn(...args);
      throw new Error(`Unknown capability: ${capability}`);
    }
  };

  // Teach KV capabilities to mock unit
  const contract = kv.teach();
  mockUnit.learn([contract]);

  // Use taught capabilities
  console.log('🤖 Mock unit using taught capabilities:');
  
  // Set up event listener through taught capability
  const unsubscribeTeaching = mockUnit.execute('on', 'set', (event: { key: string; value: unknown }) => {
    console.log(`🎯 TAUGHT EVENT: Mock unit detected set for key "${event.key}"`);
  });

  await mockUnit.execute('set', 'taught-key', 'taught-value');
  await mockUnit.execute('get', 'taught-key');

  // Clean up
  unsubscribeTeaching();

  // Show statistics
  console.log('\n📊 Final Statistics:');
  const stats = kv.getStats();
  if (stats) {
    console.log('Operations performed:');
    console.log(`  Sets: ${stats.sets}`);
    console.log(`  Gets: ${stats.hits + stats.misses} (${stats.hits} hits, ${stats.misses} misses)`);
    console.log(`  Deletes: ${stats.deletes}`);
    console.log(`  Expired: ${stats.expired}`);
    console.log(`  Current keys: ${stats.keys}`);
    if (stats.memory) console.log(`  Memory usage: ${stats.memory} bytes`);
  }

  console.log('\n✅ Event system demo completed successfully!');
  console.log('\n💡 Key Takeaways:');
  console.log('• Events provide real-time visibility into KV operations');
  console.log('• Units can teach event capabilities to other units');
  console.log('• Adapter events flow through to unit-level events');
  console.log('• Event subscriptions can be managed with on/off methods');
  console.log('• Error events provide debugging capabilities');
}

main().catch(console.error);
