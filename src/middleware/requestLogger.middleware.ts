import logger from "../configs/logger.config.js";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // generate unique correlation id
  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();

  // attach to request object
  (req as any).correlationId = correlationId;

  // add to response headers so client can reference
  res.setHeader("x-correlation-id", correlationId);

  const startTime = Date.now();

  // Log incoming request
  logger.http("Request Received", {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Log the response when it finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const logData = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: (req as any).user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error("Request failed", logData);
    } else if (res.statusCode >= 400) {
      logger.error("Request failed - client error", logData);
    } else {
      logger.info("Request completed", logData);
    }
  });

  next();
};

export default requestLogger;
