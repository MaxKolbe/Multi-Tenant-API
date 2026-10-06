import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { clearTables } from "./helpers/setup.js";

import { testDb, closeTestDb } from "./helpers/testDb.js";
import { tasks, auditLogs } from "../src/db/models/index.js";
import { eq, and, sql } from "drizzle-orm";
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

  describe("automatic updated_at trigger and default timestamp", () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it("should populate updated_at with initial timestamp on creation via column default", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const res = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Task for initial updated_at" });

      expect(res.status).toBe(201);
      expect(res.body.data.updatedAt).toBeDefined();

      const initialUpdatedAt = new Date(res.body.data.updatedAt).getTime();
      expect(isNaN(initialUpdatedAt)).toBe(false);
      expect(initialUpdatedAt).toBeGreaterThan(0);

      // Verify directly from DB
      await withTenantContext(tenantA.orgId, async (tx) => {
        const [dbTask] = await tx.select().from(tasks).where(eq(tasks.id, res.body.data.id));
        expect(dbTask!.updatedAt).toBeDefined();
        expect(dbTask!.updatedAt.getTime()).toBe(initialUpdatedAt);
      });
    });

    it("should refresh updated_at when updating a task, ensuring new timestamp is later than original", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Initial Title" });

      const initialUpdatedAt = new Date(createRes.body.data.updatedAt).getTime();

      // Small delay for deterministic timestamp comparison
      await delay(50);

      const updateRes = await request(app)
        .put(`/api/v1/tasks/${createRes.body.data.id}`)
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "New Title" });

      expect(updateRes.status).toBe(200);
      const updatedTimestamp = new Date(updateRes.body.data.updatedAt).getTime();
      expect(updatedTimestamp).toBeGreaterThan(initialUpdatedAt);

      // Verify via direct DB query
      await withTenantContext(tenantA.orgId, async (tx) => {
        const [dbTask] = await tx.select().from(tasks).where(eq(tasks.id, createRes.body.data.id));
        expect(dbTask!.updatedAt.getTime()).toBe(updatedTimestamp);
        expect(dbTask!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
      });
    });

    it("should refresh updated_at even when updating a field to the same value (firing on every update)", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Same Value Title" });

      const initialTimestamp = new Date(createRes.body.data.updatedAt).getTime();

      await delay(50);

      // Perform a direct DB update without specifying updatedAt, setting title to the exact same value
      await withTenantContext(tenantA.orgId, async (tx) => {
        await tx
          .update(tasks)
          .set({ title: "Same Value Title" })
          .where(eq(tasks.id, createRes.body.data.id));
      });

      await withTenantContext(tenantA.orgId, async (tx) => {
        const [dbTask] = await tx.select().from(tasks).where(eq(tasks.id, createRes.body.data.id));
        const newTimestamp = dbTask!.updatedAt.getTime();
        expect(newTimestamp).toBeGreaterThan(initialTimestamp);
      });
    });
  });

  describe("Task Auditing and Actor Context Propagation", () => {
    it("should record an INSERT audit log with verified actor_id when a task is created", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const res = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Audit Task 1", description: "Audit Desc 1", actorId: "00000000-0000-0000-0000-000000000000" });

      expect(res.status).toBe(201);
      const taskId = res.body.data.id;

      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, taskId));
        expect(logs.length).toBe(1);
        const log = logs[0];
        expect(log.action).toBe("INSERT");
        expect(log.tableName).toBe("tasks");
        expect(log.recordId).toBe(taskId);
        expect(log.orgId).toBe(tenantA.orgId);
        expect(log.actorId).toBe(tenantA.userId); // verified actor from JWT, spoofed actorId in body ignored!
        expect(log.oldData).toBeNull();
        expect(log.newData).toBeDefined();
        expect((log.newData as any).title).toBe("Audit Task 1");
      });
    });

    it("should record an UPDATE audit log with old_data, new_data, and updated_at trigger reflection", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Original Title", description: "Original Desc" });

      const taskId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Updated Title" });

      expect(updateRes.status).toBe(200);

      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx
          .select()
          .from(auditLogs)
          .where(and(eq(auditLogs.recordId, taskId), eq(auditLogs.action, "UPDATE")));
        expect(logs.length).toBe(1);
        const log = logs[0];
        expect(log.action).toBe("UPDATE");
        expect(log.orgId).toBe(tenantA.orgId);
        expect(log.actorId).toBe(tenantA.userId);
        expect((log.oldData as any).title).toBe("Original Title");
        expect((log.newData as any).title).toBe("Updated Title");
        expect((log.newData as any).updated_at).toBeDefined();
      });
    });

    it("should record a DELETE audit log with old_data populated and new_data NULL", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Task to delete" });

      const taskId = createRes.body.data.id;

      const delRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantA.token}`);

      expect(delRes.status).toBe(200);

      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx
          .select()
          .from(auditLogs)
          .where(and(eq(auditLogs.recordId, taskId), eq(auditLogs.action, "DELETE")));
        expect(logs.length).toBe(1);
        const log = logs[0];
        expect(log.action).toBe("DELETE");
        expect(log.orgId).toBe(tenantA.orgId);
        expect(log.actorId).toBe(tenantA.userId);
        expect((log.oldData as any).title).toBe("Task to delete");
        expect(log.newData).toBeNull();
      });
    });

    it("should set actor_id to NULL when database mutation occurs without actor context", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      let taskId: string;
      // Direct DB mutation with orgId context but WITHOUT actor context
      await withTenantContext(tenantA.orgId, async (tx) => {
        const [task] = await tx
          .insert(tasks)
          .values({
            orgId: tenantA.orgId,
            createdBy: tenantA.userId,
            title: "System Task",
          })
          .returning();
        taskId = task.id;
      });

      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, taskId!));
        expect(logs.length).toBe(1);
        expect(logs[0].actorId).toBeNull();
      });
    });

    it("should enforce tenant isolation so tenants cannot read another tenant's audit logs via RLS", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");
      const tenantB = await setupTenant("Org B", "b@b.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Org A Secret Task" });

      const taskId = createRes.body.data.id;

      // Tenant B queries audit_logs using Tenant B's context
      await withTenantContext(tenantB.orgId, async (tx) => {
        const logs = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, taskId));
        expect(logs.length).toBe(0);
      });

      // Tenant A queries audit_logs using Tenant A's context
      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, taskId));
        expect(logs.length).toBe(1);
      });
    });

    it("should not create audit records when a cross-tenant operation is rejected", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");
      const tenantB = await setupTenant("Org B", "b@b.com");

      // Tenant A creates a task
      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Org A Task" });
      const taskId = createRes.body.data.id;

      // Tenant B attempts to update Org A's task
      const updateRes = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantB.token}`)
        .send({ title: "Hacked Title" });

      expect(updateRes.status).toBe(404);

      // Verify no UPDATE audit record was created for taskId
      await withTenantContext(tenantA.orgId, async (tx) => {
        const logs = await tx
          .select()
          .from(auditLogs)
          .where(and(eq(auditLogs.recordId, taskId), eq(auditLogs.action, "UPDATE")));
        expect(logs.length).toBe(0);
      });
    });

    it("should rollback audit records when the task mutation transaction is rolled back", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      let rolledBackTaskId: string | undefined;

      try {
        await withTenantContext(tenantA.orgId, async (tx) => {
          const [task] = await tx
            .insert(tasks)
            .values({
              orgId: tenantA.orgId,
              createdBy: tenantA.userId,
              title: "Rollback Task",
            })
            .returning();
          rolledBackTaskId = task.id;
          throw new Error("Forced transaction rollback");
        }, undefined, tenantA.userId);
      } catch (err: any) {
        expect(err.message).toBe("Forced transaction rollback");
      }

      expect(rolledBackTaskId).toBeDefined();

      // Verify neither the task nor its audit record exists
      await withTenantContext(tenantA.orgId, async (tx) => {
        const dbTasks = await tx.select().from(tasks).where(eq(tasks.id, rolledBackTaskId!));
        expect(dbTasks.length).toBe(0);

        const logs = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, rolledBackTaskId!));
        expect(logs.length).toBe(0);
      });
    });

    it("should enforce direct audit-table privilege and RLS immutability (prevent direct UPDATE and DELETE)", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${tenantA.token}`)
        .send({ title: "Audit Immutability Test Task" });

      const taskId = createRes.body.data.id;

      await withTenantContext(tenantA.orgId, async (tx) => {
        const [log] = await tx.select().from(auditLogs).where(eq(auditLogs.recordId, taskId));
        expect(log).toBeDefined();

        // Attempt direct UPDATE on audit_logs (should update 0 rows due to lack of UPDATE policy for app_runtime)
        const updateResult = await tx
          .update(auditLogs)
          .set({ action: "HACKED" })
          .where(eq(auditLogs.id, log.id))
          .returning();
        expect(updateResult.length).toBe(0);

        // Attempt direct DELETE on audit_logs (should delete 0 rows due to lack of DELETE policy for app_runtime)
        const deleteResult = await tx
          .delete(auditLogs)
          .where(eq(auditLogs.id, log.id))
          .returning();
        expect(deleteResult.length).toBe(0);

        // Verify audit log remains unchanged
        const [unmodifiedLog] = await tx.select().from(auditLogs).where(eq(auditLogs.id, log.id));
        expect(unmodifiedLog.action).toBe("INSERT");
      });
    });

    it("should prevent transaction context leakage across pool connections", async () => {
      const tenantA = await setupTenant("Org A", "a@a.com");

      // Run transaction setting org and user context
      await withTenantContext(tenantA.orgId, async (tx) => {
        const orgRes = await tx.execute(sql`SELECT current_setting('app.current_org', true) as org;`);
        const userRes = await tx.execute(sql`SELECT current_setting('app.current_user', true) as user;`);
        expect((orgRes.rows[0] as any).org).toBe(tenantA.orgId);
        expect((userRes.rows[0] as any).user).toBe(tenantA.userId);
      }, undefined, tenantA.userId);

      // Run another transaction without passing org or user context
      await withTenantContext("", async (tx) => {
        const orgRes = await tx.execute(sql`SELECT current_setting('app.current_org', true) as org;`);
        const userRes = await tx.execute(sql`SELECT current_setting('app.current_user', true) as user;`);
        expect((orgRes.rows[0] as any).org).toBe("");
        expect((userRes.rows[0] as any).user).toBe("");
      });
    });
  });
});



