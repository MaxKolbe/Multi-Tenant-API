import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import requestLogger from "./middleware/requestLogger.middleware.js";
import errorHandler from "./middleware/errorHandler.middleware.js";
import healthRouter from "./modules/health/health.routes.js";
// import { connectRedis } from "./configs/cache.config.js";
// import { bullBoardAdapter } from "./configs/bull-board.config.js";
// import featureRouter from "./modules/feature/feature.routes.js";
// import "./queues/workers/feature.worker.js"
import { env } from "./configs/env.config.js";

const app = express();

const whitelist = [`http://localhost:${env.PORT}`];
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allowed?: boolean) => void,
  ) {
    if (whitelist.indexOf(origin || "") !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true, //Allow cookies/auth headers
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(requestLogger);

// (async () => {
//   await connectRedis();
// })();

//ROUTES
/* app.use("/api/v1", featureRouter); */
// app.use("/queues", bullBoardAdapter.getRouter());
app.use("/api/v1/health", healthRouter);

// BULL BOARD DASHBOARD. (ADD AUTH N' AUTH IN PRODUCTION)
// app.use("/api/v1/admin/queues", bullBoardAdapter.getRouter());

// HANDLER FOR UNKNOWN ROUTES
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.path} not found` },
  });
});

//GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
