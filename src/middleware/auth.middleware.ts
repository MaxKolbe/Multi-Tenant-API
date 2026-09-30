import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/token.util.js";
import { UnauthorizedError } from "../lib/error.js";

export const authenticate =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers["authorization"] as string;

    if (!header || !header.startsWith("Bearer")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = header.split(" ")[1]!;

    try {
      const payload = verifyToken(token);

      req.user = { id: payload.sub, name: payload.name, orgId: payload.orgId };

      next();
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }

      throw new UnauthorizedError("Invalid access token");
    }
  };

