import * as z from "zod";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../lib/error.js";
import logger from "../configs/logger.config.js";

export const validateRequest =
  <T>(schema: z.ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result: any = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue: any) => ({
        field: issue.path.slice(1).join("."), // Remove 'body'/'query' prefix
        message: issue.message,
      }));
      // Replace with custom error
      throw new ValidationError("Request validation failed", errors);
    }

    req.body = result.data.body ?? req.body;
    req.qtransformed = result.data.query ?? req.query;
    req.params = result.data.params ?? req.params;

    next();
  };
