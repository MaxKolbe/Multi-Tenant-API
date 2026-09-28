import { Worker, Job } from "bullmq";
import logger from "../../configs/logger.config.js";
import { env } from "../../configs/env.config.js";

const redis_username = env.REDIS_USERNAME as string;
const redis_password = env.REDIS_PASSWORD as string;
const redis_host = env.REDIS_HOST as string;
const redis_port = Number(env.REDIS_PORT);

const worker = new Worker(
  "feature-queue",
  async (job: Job) => {
    const {} = job.data;

    // job
  },
  {
    connection: {
      username: redis_username,
      password: redis_password,
      host: redis_host,
      port: redis_port,
    },
    // 3 jobs can run concurrently i.e this worker processes up to 3 documents simultaneously.
    // If you have 10 documents in the queue, the worker handles 3 at a time. The rest wait.
    // Set based on server cpu and memory
    concurrency: 3,
  },
);

// Event listeners for logging
worker.on("completed", (job) => {
  logger.info(`Job completed`, {
    jobId: job.id,
    correlationId: job.data.correlationId
  });
});

worker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }

  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    logger.error(`Job failed permanently`, {
      jobId: job?.id,
      correlationId: job?.data.correlationId,
      error,
    });
  }
});

worker.on("error", (error) => {
  logger.error("Worker error", {
    error,
  });
});

export { worker };
