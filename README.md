# KeyValue Unit

```bash
   _  __       __      __   _              _    _       _ _   
 | |/ /       \ \    / /  | |            | |  | |     (_) |  
 | ' / ___ _   \ \  / /_ _| |_   _  ___  | |  | |_ __  _| |_ 
 |  < / _ \ | | \ \/ / _` | | | | |/ _ \ | |  | | '_ \| | __|
 | . \  __/ |_| |\  / (_| | | |_| |  __/ | |__| | | | | | |_ 
 |_|\_\___|\__, | \/ \__,_|_|\__,_|\___|  \____/|_| |_|_|\__|
            __/ |                                            
           |___/                                             
version: 1.0.0
```
**Professional key-value storage with Unit Architecture for Node.js and TypeScript**

A modern, type-safe key-value storage abstraction that works seamlessly in development and production environments. 

##  Features

-  **Adapter-based Architecture** - Seamlessly switch between storage backends
- **High Performance** - Optimized for both development and production workloads
- **Type Safety** - Full TypeScript support with generic type preservation
- **Zero Dependencies** - Core package has no external dependencies (Unit Architecture compliant)
- **Batch Operations** - Efficient bulk operations with adapter-specific optimizations
- **TTL Support** - Time-to-live functionality across all adapters
- **Serialization** - Smart serialization with Buffer support and type preservation
- **Monitoring** - Built-in health checks and statistics
- **Well Tested** - Comprehensive test suite with 55+ tests

##  Installation

```bash
npm install @synet/kv
```

### Available Adapters

| Adapter | Package | Use Case | Features |
|---------|---------|----------|----------|
| **Memory** | `@synet/kv` (included) | Development, Testing, Caching | TTL, Statistics, Cleanup |
| **Redis** | `@synet/kv-redis` | Production, Distributed | Pipelines, Clustering, Persistence |

## Quick Start

### Development Setup (Memory Adapter)

```typescript
import { KeyValue, MemoryAdapter } from '@synet/kv';

// Create memory adapter for development
const adapter = new MemoryAdapter({
  defaultTTL: 60000, // 1 minute default TTL
  maxKeys: 10000,    // Memory limit
  cleanupInterval: 30000 // Cleanup every 30 seconds
});

const kv = KeyValue.create({ adapter });

// Basic operations
await kv.set('user:123', { name: 'Alice', age: 30 });
const user = await kv.get('user:123');
console.log(user); // { name: 'Alice', age: 30 }

// TTL operations
await kv.set('session:abc', 'active', 5000); // Expires in 5 seconds
```

### Production Setup (Redis Adapter)

```bash
npm install @synet/kv-redis ioredis
```

```typescript
import { KeyValue } from '@synet/kv';
import { RedisAdapter } from '@synet/kv-redis';

// Create Redis adapter for production
const adapter = new RedisAdapter({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'myapp:',
  defaultTTL: 3600000, // 1 hour default TTL
  connectionTimeout: 10000,
  maxRetriesPerRequest: 3
});

const kv = KeyValue.create({ adapter });

// Same API, different backend
await kv.set('user:123', { name: 'Alice', age: 30 });
const user = await kv.get('user:123');
```

## API Reference

### KeyValue Unit

```typescript
class KeyValue<TAdapter extends IKeyValueAdapter> {
  // Basic Operations
  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T, ttl?: number): Promise<void>
  async delete(key: string): Promise<boolean>
  async exists(key: string): Promise<boolean>
  async clear(): Promise<void>

  // Batch Operations
  async mget<T>(keys: string[]): Promise<(T | null)[]>
  async mset<T>(entries: Array<[string, T]>, ttl?: number): Promise<void>
  async deleteMany(keys: string[]): Promise<boolean>

  // Health & Monitoring
  async isHealthy(): Promise<boolean>
  
  // Unit Architecture Methods
  teach(): TeachingContract
  learn(contracts: TeachingContract[]): KeyValue<TAdapter>
  help(): string
  whoami(): UnitInfo
}
```

### Memory Adapter

```typescript
interface MemoryAdapterConfig {
  defaultTTL?: number;      // Default TTL in milliseconds
  maxKeys?: number;         // Maximum number of keys
  cleanupInterval?: number; // Cleanup interval in milliseconds
  serialization?: SerializationAdapter;
}

const adapter = new MemoryAdapter(config);
```

### Redis Adapter

```typescript
interface RedisAdapterConfig {
  host?: string;
  port?: number;
  password?: string;
  keyPrefix?: string;
  defaultTTL?: number;
  connectionTimeout?: number;
  maxRetriesPerRequest?: number;
  // ... more Redis options
}

const adapter = new RedisAdapter(config);
```

##  Usage Examples

### Environment-Based Configuration

```typescript
import { KeyValue, MemoryAdapter } from '@synet/kv';

function createKV() {
  if (process.env.NODE_ENV === 'production') {
    // Production: Redis adapter
    const { RedisAdapter } = require('@synet/kv-redis');
    const adapter = new RedisAdapter({
      url: process.env.REDIS_URL,
      keyPrefix: process.env.APP_NAME + ':',
      defaultTTL: 3600000 // 1 hour
    });
    return KeyValue.create({ adapter });
  } else {
    // Development: Memory adapter
    const adapter = new MemoryAdapter({
      defaultTTL: 300000, // 5 minutes
      maxKeys: 1000
    });
    return KeyValue.create({ adapter });
  }
}

const kv = createKV();
```

### User Session Management

```typescript
interface UserSession {
  userId: string;
  email: string;
  lastActive: Date;
  permissions: string[];
}

class SessionManager {
  constructor(private kv: KeyValue<any>) {}

  async createSession(sessionId: string, user: UserSession): Promise<void> {
    // Sessions expire in 24 hours
    await this.kv.set(`session:${sessionId}`, user, 24 * 60 * 60 * 1000);
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.kv.get<UserSession>(`session:${sessionId}`);
  }

  async updateLastActive(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActive = new Date();
      await this.kv.set(`session:${sessionId}`, session, 24 * 60 * 60 * 1000);
    }
  }

  async destroySession(sessionId: string): Promise<boolean> {
    return this.kv.delete(`session:${sessionId}`);
  }
}
```

### Caching with TTL

```typescript
class ApiCache {
  constructor(private kv: KeyValue<any>) {}

  async getCachedResponse<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.kv.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetchFn();
    
    // Cache the result
    await this.kv.set(cacheKey, fresh, ttl);
    
    return fresh;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Note: Pattern invalidation depends on adapter capabilities
    // Memory adapter: iterate through keys
    // Redis adapter: use SCAN with pattern
  }
}

// Usage
const cache = new ApiCache(kv);

const userData = await cache.getCachedResponse(
  `user:${userId}`,
  () => fetchUserFromDatabase(userId),
  600000 // Cache for 10 minutes
);
```

### Batch Operations for Performance

```typescript
// Efficient bulk operations
const userIds = ['1', '2', '3', '4', '5'];

// Batch get multiple users
const userKeys = userIds.map(id => `user:${id}`);
const users = await kv.mget<User>(userKeys);

// Batch set multiple cache entries
const cacheEntries: Array<[string, any]> = [
  ['cache:popular-posts', posts],
  ['cache:trending-tags', tags],
  ['cache:user-stats', stats]
];
await kv.mset(cacheEntries, 1800000); // 30 minutes TTL

// Batch delete expired sessions
const expiredSessions = ['session:abc', 'session:def', 'session:ghi'];
await kv.deleteMany(expiredSessions);
```

### Health Monitoring

```typescript
import { KeyValue, MemoryAdapter } from '@synet/kv';

const adapter = new MemoryAdapter();
const kv = KeyValue.create({ adapter });

// Basic health check
const isHealthy = await kv.isHealthy();
console.log('KV Health:', isHealthy);

// Memory adapter statistics
if (adapter instanceof MemoryAdapter) {
  const stats = adapter.getStats();
  console.log('Memory Stats:', {
    keys: stats.keys,
    memory: stats.memory,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses)
  });
}

// Redis adapter statistics (if using Redis)
// const redisStats = await adapter.getStatistics();
// console.log('Redis Stats:', redisStats);
```

### Event Integration (Unit Architecture)

```typescript
import { EventEmitter } from 'events';

// Create event emitter for KV operations
const eventEmitter = new EventEmitter();

// Listen to KV events
eventEmitter.on('set', (key, value) => {
  console.log(`Set: ${key} = ${JSON.stringify(value)}`);
});

eventEmitter.on('get', (key, found) => {
  console.log(`Get: ${key} (${found ? 'HIT' : 'MISS'})`);
});

eventEmitter.on('delete', (key, deleted) => {
  console.log(`Delete: ${key} (${deleted ? 'SUCCESS' : 'NOT_FOUND'})`);
});

// Create KV with event emission
const kv = KeyValue.create({ 
  adapter: new MemoryAdapter(),
  eventEmitter 
});
```

## Adapter Comparison

| Feature | Memory Adapter | Redis Adapter |
|---------|---------------|---------------|
| **Performance** | Fastest (in-memory) | High (network overhead) |
| **Persistence** | ❌ Lost on restart | ✅ Persistent |
| **Distributed** | ❌ Single process | ✅ Multi-instance |
| **Memory Usage** | Uses Node.js heap | Uses Redis memory |
| **TTL Support** | ✅ Built-in cleanup | ✅ Native Redis TTL |
| **Batch Operations** | ✅ Simple iteration | ✅ Redis pipelines |
| **Production Ready** | Testing/Development | ✅ Production |
| **Dependencies** | Zero | ioredis |

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run coverage

# Run tests in development mode
npm run dev:test
```

## Deployment

### Docker Compose Example

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Environment Variables

```bash
# Production
NODE_ENV=production
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=myapp:

# Development
NODE_ENV=development
```

## 🏗️ Unit Architecture

This package follows [SYNET Unit Architecture](https://github.com/synthetism/unit) principles:

- **Zero Dependencies**: Core package has no external dependencies
- **Teaching/Learning**: Units can share capabilities with other units
- **Composition**: Build complex systems by composing simple units
- **Evolution**: Units can evolve while maintaining backward compatibility

```typescript
// Teaching KV capabilities to another unit
const kvTeaching = kv.teach();

// Another unit learning KV capabilities
const enhancedUnit = someUnit.learn([kvTeaching]);

// Now enhancedUnit can use KV operations
await enhancedUnit.execute('kv.set', 'key', 'value');
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 🔗 Related Packages

- [`@synet/kv-redis`](https://github.com/synthetism/kv-redis) - Redis adapter for distributed storage
- [`@synet/unit`](https://github.com/synthetism/unit) - Core Unit Architecture framework
- [`@synet/patterns`](https://github.com/synthetism/patterns) - Common patterns for Unit Architecture

---

**Made with ❤️ by the SYNET Team**
