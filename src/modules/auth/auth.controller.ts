import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../utils/responseHandler.util.js";
import { signup, login, logout } from "../../services/auth.services.js";

//CONTROLLER
export const signupController = async (req: Request, res: Response, next: NextFunction) => {
  const {} = req.body;
  try {
    const response = await signup({}, (req as any).correlationId);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  const {} = req.body;
  try {
    const response = await login({}, (req as any).correlationId);
    return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies["refresh"];
  //   const refreshToken = req.headers["refresh"];
  try {
    await logout(refreshToken);
    return successResponse(res, 200, "Logged out successfully", null, {
      correlationId: (req as any).correlationId,
    });
  } catch (error) {
    next(error);
  }
};

export const sessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return successResponse(res, 200, "User session verified", {
      id: (req as any).user.id,
    });
  } catch (error) {
    next(error);
  }
};
