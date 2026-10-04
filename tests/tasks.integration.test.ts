import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { clearTables } from "./helpers/setup.js";

import { testDb, closeTestDb } from "./helpers/testDb.js";
import { tasks } from "../src/db/models/index.js";
import { eq } from "drizzle-orm";
import { withTenantContext } from "../src/lib/tenant.js";

describe("Tasks API", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const setupTenant = async (orgName: string, email: string) => {
    const reg = await request(app).post("/api/v1/auth/register").send({
      organizationName: orgName,
      email,
      password: "password123",
    });

    const login = await request(app).post("/api/v1/auth/login").send({
      email,
      slug: reg.body.data.organization.slug,
      password: "password123",
    });

    return {
      orgId: reg.body.data.organization.id,
      userId: reg.body.data.user.id,
      token: login.body.meta.accessToken,
    };
  };

  it("should create a task and enforce tenant boundary on creation", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A", description: "Desc A" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orgId).toBe(tenantA.orgId);
    expect(res.body.data.createdBy).toBe(tenantA.userId);
    expect(res.body.data.title).toBe("Task A");
    expect(res.body.data.status).toBe("pending");

    // Verify in DB
    await withTenantContext(tenantA.orgId, async (tx) => {
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, res.body.data.id));
      expect(task!.orgId).toBe(tenantA.orgId);
      expect(task!.createdBy).toBe(tenantA.userId);
    });
  });

  it("should prevent tenant spoofing on creation", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const tenantB = await setupTenant("Org B", "b@b.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Spoofed Task", orgId: tenantB.orgId, createdBy: tenantB.userId });

    // Zod strips unrecognized keys, or the controller ignores them and uses req.user
    // The important invariant is that the task belongs to Org A
    expect(res.status).toBe(201);
    expect(res.body.data.orgId).toBe(tenantA.orgId);
    expect(res.body.data.createdBy).toBe(tenantA.userId);

    // Verify in DB
    await withTenantContext(tenantA.orgId, async (tx) => {
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, res.body.data.id));
      expect(task!.orgId).toBe(tenantA.orgId);
    });
  });

  it("should list only tasks belonging to the authenticated tenant", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const tenantB = await setupTenant("Org B", "b@b.com");

    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });
    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantB.token}`)
      .send({ title: "Task B" });

    const resA = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].title).toBe("Task A");

    const resB = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantB.token}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(1);
    expect(resB.body.data[0].title).toBe("Task B");
  });

  it("should retrieve a task by ID successfully", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    const getRes = await request(app)
      .get(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.title).toBe("Task A");
  });

  it("should return 404 when accessing another tenant's task by ID", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const tenantB = await setupTenant("Org B", "b@b.com");

    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    // Tenant B tries to get Tenant A's task
    const res = await request(app)
      .get(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Task not found");
  });

  it("should update a task successfully", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    const putRes = await request(app)
      .put(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Updated Task", status: "in_progress" });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.title).toBe("Updated Task");
    expect(putRes.body.data.status).toBe("in_progress");
  });

  it("should return 404 when updating another tenant's task", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const tenantB = await setupTenant("Org B", "b@b.com");

    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    const res = await request(app)
      .put(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantB.token}`)
      .send({ title: "Hacked" });

    expect(res.status).toBe(404);

    // Verify task unchanged in DB
    await withTenantContext(tenantA.orgId, async (tx) => {
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, resA.body.data.id));
      expect(task!.title).toBe("Task A");
    });
  });

  it("should delete a task successfully", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    const delRes = await request(app)
      .delete(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(delRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(getRes.status).toBe(404);
  });

  it("should return 404 when deleting another tenant's task", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");
    const tenantB = await setupTenant("Org B", "b@b.com");

    const resA = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "Task A" });

    const res = await request(app)
      .delete(`/api/v1/tasks/${resA.body.data.id}`)
      .set("Authorization", `Bearer ${tenantB.token}`);

    expect(res.status).toBe(404);

    // Verify task still exists in DB
    await withTenantContext(tenantA.orgId, async (tx) => {
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, resA.body.data.id));
      expect(task).toBeDefined();
      expect(task!.title).toBe("Task A");
    });
  });

  it("should reject malformed task IDs", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");

    const res = await request(app)
      .get("/api/v1/tasks/not-a-uuid")
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject invalid task bodies", async () => {
    const tenantA = await setupTenant("Org A", "a@a.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ title: "" }); // Title empty

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
