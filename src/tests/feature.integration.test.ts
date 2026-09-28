//INTEGRATION TESTS
import request from "supertest";
import app from "../app.js";
import { describe, it, expect, beforeEach } from "vitest";
import { clearTables, installExtensions } from "./helpers/setup.js";

describe("GET /api/v1/feature/test", () => {
  //   beforeEach(() => {
  //     await clearTables();
  //     await installExtensions();
  //   });

  it("returns 404 ", async () => {
    const res = await request(app).get("/api/v1/feature/test");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe("NOT_FOUND")
  });
});
