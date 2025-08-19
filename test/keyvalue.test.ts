import { describe, it, expect, beforeEach } from 'vitest';
import { KeyValue, MemoryAdapter } from '../src/index.js';

describe('KeyValue Unit', () => {
  let kv: KeyValue;
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    kv = KeyValue.create({ adapter });
  });

  describe('Creation', () => {
    it('should create a KeyValue unit with memory adapter', () => {
      expect(kv).toBeDefined();
      expect(kv.whoami()).toContain('KeyValue Unit');
      expect(kv.getAdapter().name).toBe('memory');
    });

    it('should throw error without adapter', () => {
      expect(() => {
        // @ts-expect-error - testing error case
        KeyValue.create({});
      }).toThrow('[KeyValue] Adapter is required');
    });
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await kv.set('test-key', 'test-value');
      const value = await kv.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await kv.get('non-existent');
      expect(value).toBeNull();
    });

    it('should delete keys', async () => {
      await kv.set('delete-me', 'value');
      const deleted = await kv.delete('delete-me');
      expect(deleted).toBe(true);
      
      const value = await kv.get('delete-me');
      expect(value).toBeNull();
    });

    it('should check key existence', async () => {
      await kv.set('exists-key', 'value');
      expect(await kv.exists('exists-key')).toBe(true);
      expect(await kv.exists('not-exists')).toBe(false);
    });

    it('should clear all keys', async () => {
      await kv.set('key1', 'value1');
      await kv.set('key2', 'value2');
      
      await kv.clear();
      
      expect(await kv.get('key1')).toBeNull();
      expect(await kv.get('key2')).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await kv.set('key1', 'value1');
      await kv.set('key2', 'value2');
      
      const values = await kv.mget(['key1', 'key2', 'key3']);
      expect(values).toEqual(['value1', 'value2', null]);
    });

    it('should set multiple values', async () => {
      await kv.mset([
        ['key1', 'value1'],
        ['key2', 'value2']
      ]);
      
      expect(await kv.get('key1')).toBe('value1');
      expect(await kv.get('key2')).toBe('value2');
    });

    it('should delete multiple keys', async () => {
      await kv.set('key1', 'value1');
      await kv.set('key2', 'value2');
      
      const deleted = await kv.deleteMany(['key1', 'key2', 'key3']);
      expect(deleted).toBe(true);
      
      expect(await kv.get('key1')).toBeNull();
      expect(await kv.get('key2')).toBeNull();
    });
  });

  describe('TTL Support', () => {
    it('should support TTL on set', async () => {
      await kv.set('ttl-key', 'value', 100); // 100ms TTL
      expect(await kv.get('ttl-key')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await kv.get('ttl-key')).toBeNull();
    });

    it('should use default TTL from config', async () => {
      const kvWithTTL = KeyValue.create({ 
        adapter: new MemoryAdapter(),
        defaultTTL: 100
      });
      
      await kvWithTTL.set('default-ttl-key', 'value');
      expect(await kvWithTTL.get('default-ttl-key')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await kvWithTTL.get('default-ttl-key')).toBeNull();
    });
  });

  describe('Namespace Support', () => {
    it('should use namespace for keys', async () => {
      const testAdapter = new MemoryAdapter();
      const namespacedKV = KeyValue.create({ 
        adapter: testAdapter,
        namespace: 'test'
      });
      
      await namespacedKV.set('key', 'value');
      
      // Direct adapter access should show namespaced key
      expect(await testAdapter.get('test:key')).toBe('value');
      expect(await testAdapter.get('key')).toBeNull();
    });
  });

  describe('Health Checks', () => {
    it('should report healthy status', async () => {
      expect(await kv.isHealthy()).toBe(true);
    });
  });

  describe('Teaching Capabilities', () => {
    it('should provide teaching contract', () => {
      const contract = kv.teach();
      expect(contract.unitId).toBe('kv');
      expect(contract.capabilities.has('get')).toBe(true);
      expect(contract.capabilities.has('set')).toBe(true);
      expect(contract.capabilities.has('delete')).toBe(true);

    });
  
  });

  describe('Error Handling', () => {
    it('should validate key parameters', async () => {
      await expect(kv.get('')).rejects.toThrow('Key must be a non-empty string');
      await expect(kv.set('', 'value')).rejects.toThrow('Key must be a non-empty string');
      // @ts-expect-error - testing error case
      await expect(kv.get(null)).rejects.toThrow('Key must be a non-empty string');
    });

    it('should validate value parameters', async () => {
    
      await expect(kv.set('key', undefined)).rejects.toThrow('Value cannot be undefined');
    });

    it('should validate array parameters', async () => {
      // @ts-expect-error - testing error case
      await expect(kv.mget('not-array')).rejects.toThrow('Keys must be an array');
      // @ts-expect-error - testing error case
      await expect(kv.mset('not-array')).rejects.toThrow('Entries must be an array');
    });
  });

  describe('Help and Identity', () => {
    it('should provide help documentation', () => {
      const help = kv.help();
      expect(help).toContain('KeyValue Unit');
      expect(help).toContain('CAPABILITIES');
      expect(help).toContain('get(key)');
      expect(help).toContain('set(key, value, ttl?)');
    });

    it('should identify itself correctly', () => {
      const identity = kv.whoami();
      expect(identity).toContain('KeyValue Unit');
      expect(identity).toContain('memory adapter');
    });
  });
});
