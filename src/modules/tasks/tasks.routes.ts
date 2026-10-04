import express from "express";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { tenantTransactionMiddleware } from "../../middleware/tenant.middleware.js";
import {
  createTaskBodySchema,
  updateTaskBodySchema,
  taskIdParamSchema,
} from "./tasks.schema.js";
import {
  createTaskController,
  listTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController,
} from "./tasks.controller.js";

import { createTask } from "../../services/tasks.services.js";

const router = express.Router();

router.use(authenticate());
router.use(tenantTransactionMiddleware());

router.post("/test-multi-op", async (req, res, next) => {
  try {
    await createTask(req.user!.orgId, req.user!.id, { title: "HTTP Multi Task A" }, req.correlationId!, req.db);
    throw new Error("HTTP multi-operation failure");
  } catch (err) {
    next(err);
  }
});

router.post("/", validateRequest(createTaskBodySchema), createTaskController);
router.get("/", listTasksController);
router.get("/:taskId", validateRequest(taskIdParamSchema), getTaskController);
router.put("/:taskId", validateRequest(updateTaskBodySchema), validateRequest(taskIdParamSchema), updateTaskController);
router.delete("/:taskId", validateRequest(taskIdParamSchema), deleteTaskController);

export default router;
