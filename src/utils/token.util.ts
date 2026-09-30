import jwt from "jsonwebtoken";
import { TokenPayload } from "../types/auth.js";
import { env } from "../configs/env.config.js";

const SECRET = env.JWT_SECRET;

export const generateToken = (user: { id: string; name: string; orgId: string }) => {
  return jwt.sign({ sub: user.id, name: user.name, orgId: user.orgId }, SECRET, {
    expiresIn: "30m",
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, SECRET) as TokenPayload;
};
