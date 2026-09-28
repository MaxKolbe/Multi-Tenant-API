import { cacheDel, cacheDelPattern, cacheGet } from "../lib/cache.js";
import redisClient from "../configs/cache.config.js";
import logger from "../configs/logger.config.js";

export const doKeysForThisPatternExist = async (pattern: string): Promise<boolean> => {
  const isExistsArr = [];

  for await (const keys of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    for (const key of keys) {
      const data = await redisClient.get(key.toString());
      
      if (data) {
        isExistsArr.push(data);
        break;
      }
    }
  }

  if (isExistsArr.length > 0) {
    
    return true;
  }
  
  return false;
};

export const invalidateCache = async (singleKey?: string, patternKey?: string) => {
  // delete a single item
  if (singleKey) {
    const cacheRes = await cacheGet<any>(singleKey);
    if (cacheRes) {
      await cacheDel(singleKey);
      logger.debug("*invalidateCache fxn* single cache key invalidated successfully");
    }
  }

  // delete items with a pattern
  if (patternKey) {
    const cacheRes = await doKeysForThisPatternExist(patternKey);
    if (cacheRes) {
      await cacheDelPattern(patternKey);
      logger.debug("*invalidateCache fxn*  key pattern invalidated successfully");
    }
  }

  return true;
};
