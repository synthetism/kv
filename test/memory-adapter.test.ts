import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryAdapter } from '../src/adapters/memory-final.adapter.js';

describe('Enhanced Memory Adapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter({
      maxKeys: 100,
      defaultTTL: 0,
      cleanupInterval: 0, // Disable auto-cleanup for tests
    });
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get values with serialization', async () => {
      await adapter.set('user', { name: 'Alice', age: 30 });
      const user = await adapter.get('user');
      
      expect(user).toEqual({ name: 'Alice', age: 30 });
    });

    it('should handle different data types', async () => {
      // String
      await adapter.set('string', 'hello');
      expect(await adapter.get('string')).toBe('hello');

      // Number
      await adapter.set('number', 42);
      expect(await adapter.get('number')).toBe(42);

      // Boolean
      await adapter.set('bool', true);
      expect(await adapter.get('bool')).toBe(true);

      // Array
      await adapter.set('array', [1, 2, 3]);
      expect(await adapter.get('array')).toEqual([1, 2, 3]);

      // Null
      await adapter.set('null', null);
      expect(await adapter.get('null')).toBe(null);
    });

    it('should handle Buffer serialization', async () => {
      const buffer = Buffer.from('hello world', 'utf8');
      await adapter.set('buffer', buffer);
      const result = await adapter.get('buffer');
      
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result?.toString()).toBe('hello world');
    });

    it('should return null for non-existent keys', async () => {
      expect(await adapter.get('nonexistent')).toBeNull();
    });

    it('should delete keys', async () => {
      await adapter.set('temp', 'value');
      expect(await adapter.exists('temp')).toBe(true);
      
      const deleted = await adapter.delete('temp');
      expect(deleted).toBe(true);
      expect(await adapter.exists('temp')).toBe(false);
    });

    it('should check key existence', async () => {
      expect(await adapter.exists('test')).toBe(false);
      
      await adapter.set('test', 'value');
      expect(await adapter.exists('test')).toBe(true);
    });

    it('should clear all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      
      await adapter.clear();
      
      expect(await adapter.exists('key1')).toBe(false);
      expect(await adapter.exists('key2')).toBe(false);
    });
  });

  describe('TTL Support', () => {
    it('should expire keys after TTL', async () => {
      await adapter.set('temp', 'value', 100); // 100ms TTL
      expect(await adapter.get('temp')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await adapter.get('temp')).toBeNull();
      expect(await adapter.exists('temp')).toBe(false);
    });

    it('should use default TTL when configured', async () => {
      const adapterWithTTL = new MemoryAdapter({
        defaultTTL: 100, // 100ms default
        cleanupInterval: 0,
      });

      await adapterWithTTL.set('temp', 'value');
      expect(await adapterWithTTL.get('temp')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await adapterWithTTL.get('temp')).toBeNull();
      
      adapterWithTTL.destroy();
    });

    it('should handle TTL override', async () => {
      const adapterWithTTL = new MemoryAdapter({
        defaultTTL: 1000, // 1s default
        cleanupInterval: 0,
      });

      // Override with shorter TTL
      await adapterWithTTL.set('temp', 'value', 100);
      
      // Should expire in 100ms, not 1s
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await adapterWithTTL.get('temp')).toBeNull();
      
      adapterWithTTL.destroy();
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const values = await adapter.mget(['key1', 'key2', 'key4']);
      expect(values).toEqual(['value1', 'value2', null]);
    });

    it('should set multiple values', async () => {
      await adapter.mset([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', { data: 'complex' }]
      ] as Array<[string, unknown]>);

      expect(await adapter.get('key1')).toBe('value1');
      expect(await adapter.get('key2')).toBe('value2');
      expect(await adapter.get('key3')).toEqual({ data: 'complex' });
    });

    it('should set multiple values with TTL', async () => {
      await adapter.mset([
        ['temp1', 'value1'],
        ['temp2', 'value2']
      ], 100);

      expect(await adapter.get('temp1')).toBe('value1');
      expect(await adapter.get('temp2')).toBe('value2');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await adapter.get('temp1')).toBeNull();
      expect(await adapter.get('temp2')).toBeNull();
    });

    it('should delete multiple keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const deleted = await adapter.deleteMany(['key1', 'key3', 'nonexistent']);
      expect(deleted).toBe(true);
      
      expect(await adapter.exists('key1')).toBe(false);
      expect(await adapter.exists('key2')).toBe(true);
      expect(await adapter.exists('key3')).toBe(false);
    });
  });


  describe('Statistics', () => {
    it('should track operation statistics', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.get('key1');
      await adapter.get('nonexistent');
      await adapter.delete('key1');

      const stats = adapter.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.keys).toBe(1); // key2 remains
    });

    it('should track expired keys', async () => {
      await adapter.set('temp', 'value', 50);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      await adapter.get('temp'); // Trigger expiration
      
      const stats = adapter.getStats();
      expect(stats.expired).toBe(1);
    });

    it('should estimate memory usage', async () => {
      const stats1 = adapter.getStats();
      
      await adapter.set('key', 'value');
      
      const stats2 = adapter.getStats();
      expect(stats2.memory).toBeGreaterThan(stats1.memory || 0);
    });
  });

  describe('Cleanup', () => {
    it('should manually cleanup expired keys', async () => {
      await adapter.set('temp1', 'value1', 50);
      await adapter.set('temp2', 'value2', 50);
      await adapter.set('permanent', 'value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cleaned = adapter.cleanup();
      expect(cleaned).toBe(2);
      
      expect(await adapter.exists('temp1')).toBe(false);
      expect(await adapter.exists('temp2')).toBe(false);
      expect(await adapter.exists('permanent')).toBe(true);
    });

    it('should auto-cleanup with timer', async () => {
      const autoCleanupAdapter = new MemoryAdapter({
        cleanupInterval: 100, // 100ms cleanup interval
      });

      await autoCleanupAdapter.set('temp', 'value', 50);
      
      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(await autoCleanupAdapter.exists('temp')).toBe(false);
      
      autoCleanupAdapter.destroy();
    });

    it('should get all keys after cleanup', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('temp', 'value', 50);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const keys = adapter.keys(); // Should trigger cleanup
      expect(keys).toEqual(['key1']);
    });
  });

  describe('Custom Serialization', () => {
    it('should use custom serialization', async () => {
      const customAdapter = new MemoryAdapter({
        serialization: {
          serialize: (value) => `custom:${JSON.stringify(value)}`,
          deserialize: (data) => JSON.parse(data.slice(7)), // Remove "custom:" prefix
        },
        cleanupInterval: 0,
      });

      await customAdapter.set('test', { data: 'value' });
      const result = await customAdapter.get('test');
      
      expect(result).toEqual({ data: 'value' });
      
      customAdapter.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should throw on max keys exceeded', async () => {
      const smallAdapter = new MemoryAdapter({ maxKeys: 1, cleanupInterval: 0 });
      
      await smallAdapter.set('key1', 'value1');
      
      await expect(smallAdapter.set('key2', 'value2')).rejects.toThrow('Maximum keys limit (1) reached');
      
      smallAdapter.destroy();
    });

    it('should be healthy', async () => {
      expect(await adapter.isHealthy()).toBe(true);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', async () => {
      const timerAdapter = new MemoryAdapter({ cleanupInterval: 1000 });
      
      await timerAdapter.set('test', 'value');
      expect(timerAdapter.keys()).toHaveLength(1);
      
      timerAdapter.destroy();
      
      // After destroy, store should be empty
      expect(timerAdapter.keys()).toHaveLength(0);
    });
  });

  describe('Advanced Serialization Tests', () => {
    it('should handle complex nested objects', async () => {
      const complexObject = {
        user: { name: 'Alice', metadata: { roles: ['admin', 'user'], active: true } },
        config: { theme: 'dark', version: 1.2 },
        data: [1, 2, { nested: true }]
      };

      await adapter.set('complex', complexObject);
      const result = await adapter.get('complex');
      
      expect(result).toEqual(complexObject);
    });

    it('should handle string edge cases', async () => {
      // Test strings that might conflict with our serialization markers
      await adapter.set('edge1', ':base64:not-actually-base64');
      await adapter.set('edge2', ':prefix:value');
      await adapter.set('edge3', '::double-colon');
      
      expect(await adapter.get('edge1')).toBe(':base64:not-actually-base64');
      expect(await adapter.get('edge2')).toBe(':prefix:value');
      expect(await adapter.get('edge3')).toBe('::double-colon');
    });

    it('should handle Buffer edge cases', async () => {
      // Empty buffer
      const emptyBuffer = Buffer.alloc(0);
      await adapter.set('empty-buffer', emptyBuffer);
      const result1 = await adapter.get('empty-buffer');
      expect(Buffer.isBuffer(result1)).toBe(true);
      expect((result1 as Buffer).length).toBe(0);

      // Binary data buffer
      const binaryBuffer = Buffer.from([0x00, 0x01, 0xFF, 0xFE]);
      await adapter.set('binary-buffer', binaryBuffer);
      const result2 = await adapter.get('binary-buffer');
      expect(Buffer.isBuffer(result2)).toBe(true);
      expect(Array.from(result2 as Buffer)).toEqual([0x00, 0x01, 0xFF, 0xFE]);
    });
  });

  describe('Memory and Performance Tests', () => {
    it('should handle memory pressure gracefully', async () => {
      const smallAdapter = new MemoryAdapter({ maxKeys: 5, cleanupInterval: 0 });
      
      // Fill to capacity
      for (let i = 0; i < 5; i++) {
        await smallAdapter.set(`key${i}`, `value${i}`);
      }
      
      const stats = smallAdapter.getStats();
      expect(stats.keys).toBe(5);
      expect(stats.sets).toBe(5);
      
      // Should throw on overflow
      await expect(smallAdapter.set('overflow', 'value')).rejects.toThrow();
      
      smallAdapter.destroy();
    });

    it('should track memory accurately', async () => {
      const initialStats = adapter.getStats();
      const initialMemory = initialStats.memory;
      
      // Add progressively larger values
      await adapter.set('small', 'x');
      await adapter.set('medium', 'x'.repeat(100));
      await adapter.set('large', 'x'.repeat(1000));
      
      const finalStats = adapter.getStats();
      expect(finalStats.memory).toBeGreaterThan(initialMemory);
      expect(finalStats.keys).toBe(3);
      
      // Memory should decrease after deletion
      await adapter.delete('large');
      const afterDeleteStats = adapter.getStats();
      expect(afterDeleteStats.memory).toBeLessThan(finalStats.memory);
    });
  });

  describe('TTL Edge Cases', () => {
    it('should handle very short TTL', async () => {
      await adapter.set('very-short', 'value', 1); // 1ms TTL
      
      // Should immediately expire
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(await adapter.get('very-short')).toBeNull();
    });

    it('should handle TTL of 0 (no expiration)', async () => {
      await adapter.set('no-expiry', 'value', 0);
      
      // Should not expire
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(await adapter.get('no-expiry')).toBe('value');
    });

    it('should handle mixed TTL and non-TTL keys', async () => {
      await adapter.set('permanent', 'value');
      await adapter.set('temporary', 'value', 50);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await adapter.get('permanent')).toBe('value');
      expect(await adapter.get('temporary')).toBeNull();
    });
  });

  describe('Error Conditions', () => {
    it('should handle serialization errors gracefully', async () => {
      // Create adapter with faulty serializer
      const faultyAdapter = new MemoryAdapter({
        serialization: {
          serialize: () => { throw new Error('Serialization failed'); },
          deserialize: (data) => JSON.parse(data)
        },
        cleanupInterval: 0
      });

      await expect(faultyAdapter.set('test', 'value')).rejects.toThrow('Serialization failed');
      
      faultyAdapter.destroy();
    });

    it('should handle deserialization errors gracefully', async () => {
      // Create adapter with faulty deserializer
      const faultyAdapter = new MemoryAdapter({
        serialization: {
          serialize: (value) => JSON.stringify(value),
          deserialize: () => { throw new Error('Deserialization failed'); }
        },
        cleanupInterval: 0
      });

      await faultyAdapter.set('test', 'value'); // This should work
      await expect(faultyAdapter.get('test')).rejects.toThrow('Deserialization failed');
      
      faultyAdapter.destroy();
    });
  });
});
