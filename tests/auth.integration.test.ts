import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { clearTables } from "./helpers/setup.js";
import { testDb, closeTestDb } from "./helpers/testDb.js";
import { users, organizations } from "../src/db/models/index.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../src/configs/env.config.js";

describe("Auth API", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("should register a new organization and user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      organizationName: "Test Org",
      email: "test@org.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe("Test Org");
    expect(res.body.data.organization.slug).toBe("test-org");
    expect(res.body.data.user.email).toBe("test@org.com");

    // Verify in DB
    const [org] = await testDb.select().from(organizations).where(eq(organizations.slug, "test-org"));
    expect(org).toBeDefined();

    const [user] = await testDb.select().from(users).where(eq(users.email, "test@org.com"));
    expect(user).toBeDefined();
    expect(user!.orgId).toBe(org!.id);
  });

  it("should login successfully and return a valid JWT", async () => {
    await request(app).post("/api/v1/auth/register").send({
      organizationName: "Login Org",
      email: "login@org.com",
      password: "password123",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      slug: "login-org",
      email: "login@org.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.accessToken).toBeDefined();

    const payload = jwt.verify(res.body.meta.accessToken, env.JWT_SECRET) as any;
    expect(payload.sub).toBeDefined();
    expect(payload.orgId).toBeDefined();
    expect(payload.name).toBe("login@org.com");
  });

  it("should reject login with invalid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      slug: "non-existent-org",
      email: "nope@nope.com",
      password: "wrong",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unauthenticated requests to protected routes", async () => {
    const res = await request(app).get("/api/v1/tasks");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject requests with invalid JWTs", async () => {
    const res = await request(app).get("/api/v1/tasks").set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
