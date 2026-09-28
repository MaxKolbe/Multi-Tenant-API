import logger from "../configs/logger.config.js";
import redisClient from "../configs/cache.config.js";
import crypto from "crypto";

export const CACHE_TTL = {
  PERMISSIONS: 300, // 5 mins
  /*
    ...other TTLs
    */
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const raw = await redisClient.get(key);
  if (!raw) return null;
  try {
    logger.debug(`*cacheGet fxn* cache hit @${new Date(Date.now())}`);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: any, ttlseconds: number): Promise<void> => {
  await redisClient.setEx(key, ttlseconds, JSON.stringify(value));
  logger.debug(`*cacheSet fxn* cache set @${new Date(Date.now())}`);
};

export const cacheDel = async (key: string) => {
  await redisClient.del(key);
  logger.debug(`*cacheDel fxn* cache key deleted @${new Date(Date.now())}`);
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  for await (const keys of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    for (const key of keys) {
      await redisClient.del(key);
    }
  }
  logger.debug(`*cacheDelPattern fxn* cache key pattern deleted @${new Date(Date.now())}`);
};

export const hashKey = async (...parts: string[]): Promise<string> => {
  const data = parts.join(":");
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
};

export const cacheGetOrSet = async <T>(
  key: string,
  ttlseconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> => {
  // 1. Try cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  //2. Try to acquire lock
  const lockKey = `cedarrise:lock:${key}`;
  const acquired = await redisClient.set(lockKey, "1", { EX: 5, condition: "NX" }); // Expires in 5s, set only if it does NOT already exist

  if (acquired) {
    // We got the lock. fetch and cache
    try {
      const value = await fetchFn();
      await cacheSet(key, value, ttlseconds);
      return value;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  //3. someone else has the lock. Wait briefly, then try cache again
  await new Promise((resolve) => setTimeout(resolve, 100));
  const retried = await cacheGet<T>(key);
  if (retried !== null) return retried;

  //4. Lock holder failed or cache still empty. Just fetch directly
  return fetchFn();
};
