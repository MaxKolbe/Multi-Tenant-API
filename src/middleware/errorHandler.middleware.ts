import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/error.js";
import logger from "../configs/logger.config.js";

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn("APPERROR INSTANCE", {
      code: err.code,
      message: err.message,
      details: err.details ? err.details : "",
    });

    return res.status(err.statusCode).json({
      status: false,
      error: {
        code: err.isOperational ? err.code : 500,
        message: err.isOperational ? err.message : "Internal server error",
        ...(err.details && err.isOperational && { details: err.details }),
      },
    });
  }

  // bug
  logger.error(`Unhandled error`, { error: err });
  console.log(`\n Unhandled error`, err ) // Remove on prod
  res.status(500).json({
    status: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occured",
    },
  });
};

export default errorHandler;
