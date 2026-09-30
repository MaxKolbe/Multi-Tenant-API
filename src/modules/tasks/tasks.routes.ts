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

const router = express.Router();

router.use(authenticate());

router.post("/", validateRequest(createTaskBodySchema), createTaskController);
router.get("/", listTasksController);
router.get("/:taskId", validateRequest(taskIdParamSchema), getTaskController);
router.put("/:taskId", validateRequest(updateTaskBodySchema), validateRequest(taskIdParamSchema), updateTaskController);
router.delete("/:taskId", validateRequest(taskIdParamSchema), deleteTaskController);

export default router;
