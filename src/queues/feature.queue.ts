import { Queue } from "bullmq";
import { env } from "../configs/env.config.js";

const redis_username = env.REDIS_USERNAME as string;
const redis_password = env.REDIS_PASSWORD as string;
const redis_host = env.REDIS_HOST as string;
const redis_port = Number(env.REDIS_PORT);

export const featureQueue = new Queue("feature-queue", {
  connection: {
    username: redis_username,
    password: redis_password,
    host: redis_host,
    port: redis_port,
  },
  // The defaultJobOptions apply to every job added to this queue.
  // To add options to specific jobs, add them as the third argument to the queue.add() function
  // Where the first argument is the name: string, second is data: object, and third options: object
  defaultJobOptions: {
    attempts: 3, // attempt 3 retries on failure
    backoff: {
      type: "exponential",
      delay: 3000, // 3 secs in-between retries
    },
    removeOnComplete: { count: 200 }, // keep up to 200 jobs then cleanup older jobs automatically
    removeOnFail: { count: 500 }, // keep up to 500 jobs then cleanup older jobs automatically
  },
});

export const addFeatureToQueue = async (correlationId?: string) => {
  const job = await featureQueue.add("job-name", { correlationId });
  return job.id;
};

// Schedule A Job
// export const scheduleJob = async () => {
//   await featureQueue.upsertJobScheduler(
//     "job-schedule-name",
//     {
//       pattern: "* * * * *", 
//       tz: "Africa/Lagos",
//     },
//     {
//       name: "job-name",
//       data: {},
//     },
//   );
// };
