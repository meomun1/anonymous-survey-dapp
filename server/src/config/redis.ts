import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

// Only create Redis client if URL is provided
export const redisClient = redisUrl ? createClient({
  url: redisUrl,
}) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
  redisClient.on('ready', () => console.log('Redis Client Ready'));
  redisClient.on('end', () => console.log('Redis Client Connection Ended'));
} else {
  console.warn('⚠️  Redis not configured - using in-memory cache (not recommended for production)');
}

// Don't auto-connect here - let the main server handle connection 