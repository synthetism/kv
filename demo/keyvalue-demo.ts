#!/usr/bin/env tsx

/**
 * @synet/kv Demo - KeyValue Unit with Memory Adapter
 * 
 * Demonstrates consciousness-based key-value storage following Unit Architecture
 */

import { KeyValue, MemoryAdapter } from '../src/index.js';

async function main() {
  console.log('🧠 SYNET KeyValue Unit Demo\n');

  // Create memory adapter and KeyValue unit
  const adapter = new MemoryAdapter({
    maxKeys: 1000,
    defaultTTL: 5000 // 5 seconds
  });

  const kv = KeyValue.create({
    adapter,
    namespace: 'demo',
    description: 'Demo KeyValue storage'
  });

  console.log('📊 Unit Identity:');
  console.log(kv.whoami());
  console.log();

  // Basic operations
  console.log('🔧 Basic Operations:');
  await kv.set('user:123', { name: 'Alice', age: 30 });
  await kv.set('user:456', { name: 'Bob', age: 25 });
  await kv.set('config:theme', 'dark');

  const user123 = await kv.get('user:123');
  const theme = await kv.get('config:theme');
  
  console.log('User 123:', user123);
  console.log('Theme:', theme);
  console.log();

  // Batch operations
  console.log('📦 Batch Operations:');
  await kv.mset([
    ['session:abc', { userId: 123, timestamp: Date.now() }] as [string, unknown],
    ['session:def', { userId: 456, timestamp: Date.now() }] as [string, unknown],
    ['counter', 42] as [string, unknown]
  ]);

  const sessions = await kv.mget(['session:abc', 'session:def', 'counter']);
  console.log('Batch get results:', sessions);
  console.log();

  // Key existence and deletion
  console.log('🔍 Key Management:');
  console.log('Counter exists:', await kv.exists('counter'));
  console.log('Unknown exists:', await kv.exists('unknown-key'));
  
  await kv.delete('counter');
  console.log('Counter exists after delete:', await kv.exists('counter'));
  console.log();

  // TTL demonstration
  console.log('⏰ TTL Operations:');
  await kv.set('temp-data', 'This will expire', 2000); // 2 seconds
  console.log('Temp data immediately:', await kv.get('temp-data'));
  
  console.log('Waiting 2.5 seconds for expiration...');
  await new Promise(resolve => setTimeout(resolve, 2500));
  console.log('Temp data after expiration:', await kv.get('temp-data'));
  console.log();

  // Health check
  console.log('🏥 Health Status:');
  console.log('Storage healthy:', await kv.isHealthy());
  console.log('Adapter info:', kv.getAdapter());
  console.log();

  // Teaching capabilities
  console.log('🎓 Teaching Capabilities:');
  const contract = kv.teach();
  console.log('Teaching contract ID:', contract.unitId);
  console.log('Available capabilities:', Object.keys(contract.capabilities));
  
  // Demonstrate taught capability
  await contract.capabilities.set('taught-key', 'via teaching contract');
  const taughtValue = await contract.capabilities.get('taught-key');
  console.log('Value set via teaching:', taughtValue);
  console.log();

  // Help documentation
  console.log('📚 Unit Documentation:');
  console.log(kv.help());

  console.log('✅ Demo completed successfully!');
}

main().catch(console.error);
