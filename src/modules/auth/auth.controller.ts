import { Request, Response, NextFunction } from "express";
import { registerOrganization, loginUser } from "../../services/auth.services.js";
import { successResponse } from "../../utils/responseHandler.util.js";

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  try {
    const response = await registerOrganization(data, (req as any).correlationId);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;
  try {
    const response = await loginUser(data, (req as any).correlationId);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};
