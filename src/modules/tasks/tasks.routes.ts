import express from "express";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
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

import { withTenantContext } from "../../lib/tenant.js";
import { createTask } from "../../services/tasks.services.js";

const router = express.Router();

router.use(authenticate());

router.post("/test-multi-op", async (req, res, next) => {
  const orgId = req.user!.orgId;
  const userId = req.user!.id;
  try {
    await withTenantContext(orgId, async (tx) => {
      await createTask(orgId, userId, { title: "HTTP Multi Task A" }, req.correlationId!, tx);
      throw new Error("HTTP multi-operation failure");
    });
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
