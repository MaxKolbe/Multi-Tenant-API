import { Response } from "express";

export const successResponse = (
  res: Response,
  code: number,
  message: string,
  data: any = null,
  meta?: any,
) => {
  return res.status(code).json({
    success: true,
    message,
    data,
    meta,
  });
};
