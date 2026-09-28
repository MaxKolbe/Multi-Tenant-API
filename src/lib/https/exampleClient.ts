import { createFetchClient } from "@zayne-labs/callapi";
import logger from "../../configs/logger.config.js";
import { env } from "../../configs/env.config.js";

export const callExampleApi = createFetchClient({
  baseURL: env.EXAMPLE_BASE_URL!,
  retryAttempts: 1,
  throwOnError: true,
  timeout: 10000,
  dedupeStrategy: "cancel",
  // credentials: "same-origin",
  auth: env.EXAMPLE_API_KEY,
  onRequest: (ctx: any) => {
    logger.info("Request to --- has been made", {
      date: new Date(Date.now()),
      context: ctx.data,
    });
  },
  onResponse: (ctx: any) => {
    logger.info("Response from --- has been received", {
      date: new Date(Date.now()),
      context: ctx.data,
    });
  },
  onError: (ctx: any) => {
    logger.error("--- Api returned an error", {
      date: new Date(Date.now()),
      context: ctx.data,
    });
  },
  onSuccess: (ctx: any) => {
    logger.info("Request to --- was successfuly", {
      date: new Date(Date.now()),
      context: ctx.data,
    });
  },
  onRetry: (ctx: any) => {
    logger.info("Request failed. Retrying...", { date: new Date(Date.now()), context: ctx.data });
  },
});
