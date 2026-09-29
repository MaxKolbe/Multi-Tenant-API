// import { successResponse } from "../../utils/responseHandler.util.js";
import { Request, Response, NextFunction } from "express";
// import { ValidationError } from "../../lib/error.js";

//CONTROLLER
export const exampleController = async (req: Request, res: Response, next: NextFunction) => {
  const {} = req.body;
  const {} = req.qtransformed;
  const {} = (req as any).params;

  try {
    // const response = await example({}, (req as any).correlationId);
    // return successResponse(res, response.code, response.message, response.data, response.meta);
  } catch (error) {
    next(error);
  }
};
