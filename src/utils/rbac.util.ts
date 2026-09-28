import db from "../db/db.js";
import logger from "../configs/logger.config.js";
import { cacheGetOrSet } from "../lib/cache.js";
import { CACHE_TTL } from "../lib/cache.js";

// return all permissions of a user
export const getUserPermissions = async (userId: string): Promise<string[]> => {
  const key = `cedarrise:permissions:${userId}`;

  const userPermissions = await cacheGetOrSet(key, CACHE_TTL.PERMISSIONS, async () => {
    return ["create", "read", "update", "delete"]
  });

  return userPermissions;
};
