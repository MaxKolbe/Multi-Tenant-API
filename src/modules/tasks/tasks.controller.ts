import { Request, Response, NextFunction } from "express";
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
} from "../../services/tasks.services.js";
import { successResponse } from "../../utils/responseHandler.util.js";
import { withTenantContext } from "../../lib/tenant.js";

export const createTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  const orgId = req.user!.orgId;
  const userId = req.user!.id;
  try {
    const response = await withTenantContext(
      orgId,
      (tx) => createTask(orgId, userId, data, req.correlationId!, tx),
      undefined,
      userId
    );
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const listTasksController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  const userId = req.user?.id;
  try {
    const response = await withTenantContext(
      orgId,
      (tx) => listTasks(orgId, req.correlationId!, tx),
      undefined,
      userId
    );
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const getTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  const userId = req.user?.id;
  const taskId = req.params.taskId as string;
  try {
    const response = await withTenantContext(
      orgId,
      (tx) => getTask(orgId, taskId, req.correlationId!, tx),
      undefined,
      userId
    );
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  const orgId = req.user!.orgId;
  const userId = req.user?.id;
  const taskId = req.params.taskId as string;
  try {
    const response = await withTenantContext(
      orgId,
      (tx) => updateTask(orgId, taskId, data, req.correlationId!, tx),
      undefined,
      userId
    );
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  const userId = req.user?.id;
  const taskId = req.params.taskId as string;
  try {
    const response = await withTenantContext(
      orgId,
      (tx) => deleteTask(orgId, taskId, req.correlationId!, tx),
      undefined,
      userId
    );
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};


