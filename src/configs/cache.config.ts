import logger from "./logger.config.js";
import { createClient, RedisClientType } from "redis";
import { env } from "./env.config.js";


const MAX_RETRIES = 5;

const redisMap = new Map([
  ["test", env.REDIS_TEST_URL],
  ["development", env.REDIS_DEV_URL],
  ["production", env.REDIS_PROD_URL],
]);
const redisUrl = redisMap.get(env.NODE_ENV);

const redisClient: RedisClientType = createClient({
  url: redisUrl!,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= MAX_RETRIES) {
        logger.error(`Max retries (${MAX_RETRIES}) reached. Stop connection attempts.`);
        return new Error("Max retries reached");
      }
      // Generate a random jitter between 0 – 100 ms:
      const jitter = Math.floor(Math.random() * 100);

      // Delay is an exponential backoff, (2^retries) * 50 ms, with a
      // maximum value of 3000 ms:
      const delay = Math.min(Math.pow(2, retries) * 50, 3000);

      return delay + jitter;
    },
  },
});

redisClient.on("error", (err) => {
  logger.error(`Redis Client Creation Error`, { error: err });
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info("Redis Client connected");
  } catch (err) {
    logger.error(`Redis Connection Error`, { error: err });
    process.exit(1);
  }
}

export default redisClient;
