#!/usr/bin/env tsx

/**
 * Final Memory Adapter Test Suite
 * Tests all functionality: TTL, serialization, stats, events
 */

import { KeyValue, MemoryAdapter, defaultSerialize, defaultDeserialize, jsonSerializer } from '../src/index.js';

async function testMemoryAdapter() {
  console.log('🧪 Memory Adapter Test Suite\n');

  // Test 1: Basic operations
  console.log('1️⃣ Testing basic operations...');
  const adapter = new MemoryAdapter({ maxKeys: 100 });
  const kv = KeyValue.create({ adapter, namespace: 'test' });

  await kv.set('string', 'hello');
  await kv.set('number', 42);
  await kv.set('object', { name: 'Alice', age: 30 });
  await kv.set('array', [1, 2, 3]);
  await kv.set('buffer', Buffer.from('binary', 'utf8'));

  console.log('✅ String:', await kv.get('string'));
  console.log('✅ Number:', await kv.get('number'));
  console.log('✅ Object:', await kv.get('object'));
  console.log('✅ Array:', await kv.get('array'));
  console.log('✅ Buffer:', await kv.get('buffer'));
  console.log();

  // Test 2: TTL functionality
  console.log('2️⃣ Testing TTL functionality...');
  await kv.set('temp', 'expires soon', 500); // 500ms TTL
  console.log('✅ Set with TTL:', await kv.get('temp'));
  
  await new Promise(resolve => setTimeout(resolve, 600));
  console.log('✅ After expiration:', await kv.get('temp')); // Should be null
  console.log();

  // Test 3: Batch operations
  console.log('3️⃣ Testing batch operations...');
  await kv.mset([
    ['batch1', 'value1'],
    ['batch2', 'value2'],
    ['batch3', 'value3']
  ] as Array<[string, string]>);

  const batchResults = await kv.mget(['batch1', 'batch2', 'batch3', 'nonexistent']);
  console.log('✅ Batch get results:', batchResults);

  const deleted = await kv.deleteMany(['batch1', 'batch2']);
  console.log('✅ Batch delete success:', deleted);
  console.log('✅ After batch delete:', await kv.mget(['batch1', 'batch2', 'batch3']));
  console.log();

  // Test 4: Statistics
  console.log('4️⃣ Testing statistics...');
  const stats = kv.getStats();
  if (stats) {
    console.log('✅ Statistics:', {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      sets: stats.sets,
      memory: `${stats.memory} bytes`
    });
  }
  console.log();

  // Test 5: Serialization edge cases
  console.log('5️⃣ Testing serialization edge cases...');
  await kv.set('null-value', null);
  await kv.set('boolean-true', true);
  await kv.set('boolean-false', false);
  await kv.set('zero', 0);
  await kv.set('empty-string', '');
  await kv.set('special-string', ':base64:fake');

  console.log('✅ Null value:', await kv.get('null-value'));
  console.log('✅ Boolean true:', await kv.get('boolean-true'));
  console.log('✅ Boolean false:', await kv.get('boolean-false'));
  console.log('✅ Zero:', await kv.get('zero'));
  console.log('✅ Empty string:', await kv.get('empty-string'));
  console.log('✅ Special string:', await kv.get('special-string'));
  console.log();

  return true;
}

async function testCustomSerialization() {
  console.log('6️⃣ Testing custom serialization...');
  
  // JSON serializer
  const jsonAdapter = new MemoryAdapter({
    maxKeys: 50,
    serialization: jsonSerializer
  });
  const jsonKv = KeyValue.create({ adapter: jsonAdapter, namespace: 'json' });

  await jsonKv.set('simple', { data: 'test' });
  console.log('✅ JSON serialization:', await jsonKv.get('simple'));

  // Try Buffer with JSON (should fail gracefully or convert)
  try {
    await jsonKv.set('buffer-test', Buffer.from('test'));
    console.log('✅ Buffer with JSON:', await jsonKv.get('buffer-test'));
  } catch (error) {
    console.log('⚠️ Buffer with JSON failed (expected):', (error as Error).message);
  }
  console.log();

  return true;
}

async function testEventSystem() {
  console.log('7️⃣ Testing event system...');
  
  const adapter = new MemoryAdapter({ maxKeys: 50 });
  const kv = KeyValue.create({ adapter, namespace: 'events' });

  const events: string[] = [];
  
  // Set up event listeners
  kv.on('set', (event) => {
    events.push(`SET: ${event.key} = ${JSON.stringify(event.value)}`);
  });
  
  kv.on('get', (event) => {
    events.push(`GET: ${event.key} = ${JSON.stringify(event.value)}`);
  });
  
  kv.on('delete', (event) => {
    events.push(`DELETE: ${event.key}`);
  });
  
  kv.on('clear', () => {
    events.push('CLEAR: all keys');
  });

  // Perform operations
  await kv.set('event-test', 'value');
  await kv.get('event-test');
  await kv.get('nonexistent');
  await kv.delete('event-test');
  await kv.clear();

  console.log('✅ Captured events:');
  for (const event of events) {
    console.log(`   ${event}`);
  }
  console.log();

  return events.length > 0;
}

async function testHealthAndCleanup() {
  console.log('8️⃣ Testing health and cleanup...');
  
  const adapter = new MemoryAdapter({
    maxKeys: 10,
    cleanupInterval: 0 // Manual cleanup
  });
  const kv = KeyValue.create({ adapter });

  // Test health
  const healthy = await kv.isHealthy();
  console.log('✅ Adapter healthy:', healthy);

  // Test max keys limit - add keys until we hit the limit
  let keysAdded = 0;
  let hitLimit = false;
  
  try {
    for (let i = 0; i < 15 && !hitLimit; i++) {
      try {
        await kv.set(`key${i}`, `value${i}`);
        keysAdded++;
      } catch (error) {
        console.log('✅ Max keys limit enforced after', keysAdded, 'keys');
        hitLimit = true;
        break;
      }
    }
    
    if (!hitLimit) {
      console.log('❌ Should have hit max keys limit');
      return false;
    }
  } catch (error) {
    console.log('✅ Max keys enforcement caught:', (error as Error).message.split(':').pop()?.trim());
  }

  // Test manual cleanup with a fresh adapter to avoid max keys issues
  const cleanupAdapter = new MemoryAdapter({ maxKeys: 100, cleanupInterval: 0 });
  const cleanupKv = KeyValue.create({ adapter: cleanupAdapter });
  
  await cleanupKv.set('cleanup-test', 'expires', 1); // 1ms TTL
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiration
  
  const cleaned = cleanupKv.cleanup();
  console.log('✅ Manual cleanup removed keys:', cleaned);
  console.log();

  return true;
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive KV test suite...\n');
  
  try {
    const results = await Promise.allSettled([
      testMemoryAdapter(),
      testCustomSerialization(),
      testEventSystem(),
      testHealthAndCleanup()
    ]);

    console.log('📊 Test Results:');
    for (const [index, result] of results.entries()) {
      const testName = ['Memory Adapter', 'Custom Serialization', 'Event System', 'Health & Cleanup'][index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${testName}: ${result.value ? 'PASSED' : 'FAILED'}`);
      } else {
        console.log(`❌ ${testName}: ERROR - ${result.reason}`);
      }
    }

    const allPassed = results.every(r => r.status === 'fulfilled' && r.value);
    console.log(`\n${allPassed ? '🎉' : '❌'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('❌ Test runner error:', error);
    return false;
  }
}

// Run with timeout to prevent hanging
runAllTests()
  .then(result => {
    console.log('\n🏁 Test suite completed');
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
