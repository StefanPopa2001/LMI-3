const redis = require('redis');

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

// Handle Redis connection errors gracefully
redisClient.on('error', (err) => {
  console.warn('Redis connection error:', err.message);
  console.warn('Continuing without Redis...');
});

// Connect to Redis with error handling
redisClient.connect().catch((err) => {
  console.warn('Failed to connect to Redis:', err.message);
  console.warn('Continuing without Redis...');
});

module.exports = redisClient;