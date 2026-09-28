import jwt from "jsonwebtoken";
import { TokenPayload } from "../types/auth.js";
import { env } from "../configs/env.config.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const generateAccessToken = (user: { id: string; name: string; department: string }) => {
  return jwt.sign({ sub: user.id, type: "access" }, ACCESS_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (user: { id: string; name: string; department: string }) => {
  return jwt.sign({ sub: user.id, type: "refresh" }, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};
