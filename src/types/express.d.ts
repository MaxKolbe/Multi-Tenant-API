import { Request } from "express";
import { DbTransaction } from "../lib/tenant.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; orgId: string };
      db?: DbTransaction;
      qtransformed?: any; // for tranformations made to req.query
      correlationId?: string;
    }
  }
}