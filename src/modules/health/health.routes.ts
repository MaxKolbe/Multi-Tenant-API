import express from "express";
import db from "../../db/db.js";
// import redisClient from "../../configs/cache.config.js";
import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../utils/responseHandler.util.js";

const router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const checks: Record<string, any> = {};

  // Check database
  try {
    await db.execute("SELECT 1");
    checks.database = { status: "ok" };
  } catch (error: any) {
    checks.database = {
      status: "error",
      message: (error as Error).message,
    };
  }

  // Check Redis
  // try {
  //   await redisClient.ping();
  //   checks.redis = { status: "ok" };
  // } catch (error: any) {
  //   checks.redis = {
  //     status: "error",
  //     message: (error as Error).message,
  //   };
  // }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  return successResponse(res, allHealthy ? 200 : 503, "online", null, {
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
