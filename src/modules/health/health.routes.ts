import express from "express";
import db from "../../db/db.js";
import redisClient from "../../configs/cache.config.js";
import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../utils/responseHandler.util.js";

const router = express.Router();

// LIVE
router.get("/live", (req: Request, res: Response, next: NextFunction) => {
  return successResponse(res, 200, "online", null, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// DATABASE
router.get("/checkdb", async (req: Request, res: Response, next: NextFunction) => {
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

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  return successResponse(res, allHealthy ? 200 : 503, "online", null, {
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// DB AND REDIS
// router.get("/check", async (req: Request, res: Response, next: NextFunction) => {
//   const checks: Record<string, any> = {};

//   // Check database
//   try {
//     await db.execute("SELECT 1");
//     checks.database = { status: "ok" };
//   } catch (error: any) {
//     checks.database = {
//       status: "error",
//       message: (error as Error).message,
//     };
//   }

//   // Check Redis
//   try {
//     await redisClient.ping();
//     checks.redis = { status: "ok" };
//   } catch (error: any) {
//     checks.redis = {
//       status: "error",
//       message: (error as Error).message,
//     };
//   }

//   const allHealthy = Object.values(checks).every((c) => c.status === "ok");

//   return successResponse(res, allHealthy ? 200 : 503, "online", null, {
//     status: allHealthy ? "ok" : "degraded",
//     timestamp: new Date().toISOString(),
//     checks,
//   });
// });

export default router;
