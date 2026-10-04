import { Request, Response, NextFunction } from "express";
import { withTenantContext } from "../lib/tenant.js";

/**
 * Middleware that establishes a transaction-scoped database context for protected requests.
 * Runs AFTER authentication has populated `req.user.orgId`.
 *
 * 1. Reads trusted `req.user.orgId` (from verified JWT).
 * 2. Starts a database transaction using `withTenantContext`.
 * 3. Assigns transaction handle `tx` to `req.db`.
 * 4. Intercepts `res.end` to await PostgreSQL `COMMIT` before completing the HTTP response.
 * 5. Automatically commits on success, or rolls back on error.
 */
export const tenantTransactionMiddleware =
  () => (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return next();
    }

    let finishResolve: (() => void) | null = null;
    let finishReject: ((err: any) => void) | null = null;

    const finishPromise = new Promise<void>((resolve, reject) => {
      finishResolve = resolve;
      finishReject = reject;
    });

    let settled = false;
    const originalEnd = res.end;

    const restoreEnd = () => {
      res.end = originalEnd;
    };

    res.end = function (...args: any[]) {
      restoreEnd();

      if (!settled) {
        settled = true;
        if (finishResolve) {
          finishResolve();
        }
      }

      txPromise
        .then(() => {
          res.end(...(args as [any?, any?, any?]));
        })
        .catch(() => {
          res.end(...(args as [any?, any?, any?]));
        });

      return res;
    };

    // Handle client disconnect / socket abort
    res.once("close", () => {
      if (!settled) {
        settled = true;
        if (finishReject) {
          finishReject(new Error("Request closed by client"));
        }
      }
    });

    const originalNext = next;
    const interceptedNext = (err?: any) => {
      if (err) {
        if (!settled) {
          settled = true;
          if (finishReject) {
            finishReject(err);
          }
        }
        return; // txPromise.catch will invoke originalNext(err) once ROLLBACK finishes
      }
      originalNext();
    };

    const txPromise = withTenantContext(orgId, async (tx) => {
      req.db = tx;
      await finishPromise;
    });

    txPromise
      .then(() => {
        restoreEnd();
      })
      .catch((err) => {
        restoreEnd();
        originalNext(err);
      });

    interceptedNext();
  };
