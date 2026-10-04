import { Request, Response, NextFunction } from "express";
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
} from "../../services/tasks.services.js";
import { successResponse } from "../../utils/responseHandler.util.js";

export const createTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  const orgId = req.user!.orgId;
  const userId = req.user!.id;
  try {
    const response = await createTask(orgId, userId, data, req.correlationId!, req.db);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const listTasksController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  try {
    const response = await listTasks(orgId, req.correlationId!, req.db);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const getTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  const taskId = req.params.taskId as string;
  try {
    const response = await getTask(orgId, taskId, req.correlationId!, req.db);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  const orgId = req.user!.orgId;
  const taskId = req.params.taskId as string;
  try {
    const response = await updateTask(orgId, taskId, data, req.correlationId!, req.db);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user!.orgId;
  const taskId = req.params.taskId as string;
  try {
    const response = await deleteTask(orgId, taskId, req.correlationId!, req.db);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};
