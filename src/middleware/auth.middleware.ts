import jwt from "jsonwebtoken";
import { refresh } from "../services/auth.services.js";
import { Request, Response, NextFunction } from "express";
import { getUserPermissions } from "../utils/rbac.util.js";
import { verifyAccessToken } from "../utils/token.util.js";
import { ForbiddentError, UnauthorizedError } from "../lib/error.js";
import { accessCookieOptions, refreshCookieOptions } from "../lib/cookie.js";

export const authenticate = () => async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies["cookie-name"];

  if (!token) throw new UnauthorizedError("No token provided");

  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== "access") throw new UnauthorizedError("Invalid token type");

    req.user = { id: payload.sub };

    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      const refreshToken = req.cookies["cookie-name"];
      if (!refreshToken) throw new UnauthorizedError("No refresh token provided");

      const authResponse = await refresh(
        refreshToken,
        (req as any).correlationId,
        req.headers["user-agent"] as string,
      );

      res.cookie("cookie-name", authResponse.meta.accessToken, {
        ...accessCookieOptions,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });
      res.cookie("cookie-name", authResponse.meta.refreshToken, {
        ...refreshCookieOptions,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });

      req.user = {
        id: authResponse.meta.sub,
      };

      return next();
    }

    throw new UnauthorizedError("Invalid access token");
  }
};

export const authenticateWithHeaders =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers["authorization"] as string;

    if (!header || !header.startsWith("Bearer")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = header.split(" ")[1]!;

    try {
      const payload = verifyAccessToken(token);

      if (payload.type !== "access") throw new UnauthorizedError("Invalid token type");

      req.user = { id: payload.sub };

      next();
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }

      throw new UnauthorizedError("Invalid access token");
    }
  };

export const authorize =
  (...requiredPermissions: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const userPermissions = await getUserPermissions(req.user.id);

      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));

      if (missing.length > 0) {
        throw new ForbiddentError("You do not have the required permission");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
