import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import db from "../src/db/db.js";
import { clearTables, installExtensions } from "./helpers/setup.js";
import { closeTestDb } from "./helpers/testDb.js";
import { withTenantContext } from "../src/lib/tenant.js";
import { tasks, organizations } from "../src/db/models/index.js";
import { sql, eq } from "drizzle-orm";

describe("Phase 3 Step 16: Transaction-Scoped Tenant Context & Pool Hygiene", () => {
  beforeAll(async () => {
    await installExtensions();
    await clearTables();
  });

  afterAll(async () => {
    await clearTables();
    await closeTestDb();
  });

  const setupTenant = async (orgName: string, email: string) => {
    const reg = await request(app).post("/api/v1/auth/register").send({
      organizationName: orgName,
      email,
      password: "Password123!",
    });

    const login = await request(app).post("/api/v1/auth/login").send({
      email,
      slug: reg.body.data.organization.slug,
      password: "Password123!",
    });

    return {
      orgId: reg.body.data.organization.id,
      userId: reg.body.data.user.id,
      token: login.body.meta.accessToken,
    };
  };

  it("should establish transaction-local app.current_org matching trusted JWT claim", async () => {
    const tenant = await setupTenant("Trusted Org", "trusted@org.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenant.token}`)
      .send({ title: "Transaction Task", description: "Testing transaction scoping" });

    expect(res.status).toBe(201);
    expect(res.body.data.orgId).toBe(tenant.orgId);
    expect(res.body.data.createdBy).toBe(tenant.userId);
  });

  it("should ignore client-supplied orgId in body and use trusted JWT claim", async () => {
    const tenantA = await setupTenant("Org Alpha", "alpha@org.com");
    const tenantB = await setupTenant("Org Beta", "beta@org.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({
        title: "Spoof Attempt",
        orgId: tenantB.orgId, // Client attempting to set Org B
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orgId).toBe(tenantA.orgId);
    expect(res.body.data.orgId).not.toBe(tenantB.orgId);
  });

  it("should ensure set_config('app.current_org', ..., true) is strictly transaction-local", async () => {
    const orgId = "11111111-1111-1111-1111-111111111111";

    let settingInsideTx: string | null = null;
    await withTenantContext(orgId, async (tx) => {
      const res = await tx.execute(sql`SELECT current_setting('app.current_org', true) as val;`);
      settingInsideTx = (res.rows[0] as any).val;
    });

    expect(settingInsideTx).toBe(orgId);

    // Outside the transaction, app.current_org should be empty/null
    const resOutside = await db.execute(sql`SELECT current_setting('app.current_org', true) as val;`);
    const settingOutsideTx = (resOutside.rows[0] as any).val;
    expect(settingOutsideTx === "" || settingOutsideTx === null).toBe(true);
  });

  it("should clean up connection pool hygiene after transaction completion", async () => {
    const orgId = "22222222-2222-2222-2222-222222222222";

    // Run tenant transaction
    await withTenantContext(orgId, async (tx) => {
      await tx.execute(sql`SELECT 1;`);
    });

    // Subsequent checkout from pool must NOT carry over the tenant setting
    for (let i = 0; i < 5; i++) {
      const res = await db.execute(sql`SELECT current_setting('app.current_org', true) as val;`);
      const val = (res.rows[0] as any).val;
      expect(val === "" || val === null).toBe(true);
    }
  });

  it("should rollback transaction and leave zero partial mutations on failure", async () => {
    const tenant = await setupTenant("Rollback Org", "rollback@org.com");

    try {
      await withTenantContext(tenant.orgId, async (tx) => {
        // Insert a task
        await tx.insert(tasks).values({
          orgId: tenant.orgId,
          createdBy: tenant.userId,
          title: "Temporary Task",
          status: "pending",
        });

        // Force an artificial failure inside the transaction
        throw new Error("Forced transaction failure for rollback test");
      });
    } catch (err: any) {
      expect(err.message).toBe("Forced transaction failure for rollback test");
    }

    // Verify task was rolled back and does not exist in DB
    await withTenantContext(tenant.orgId, async (tx) => {
      const foundTasks = await tx.select().from(tasks).where(eq(tasks.title, "Temporary Task"));
      expect(foundTasks.length).toBe(0);
    });
  });

  it("should prevent tenant queries outside established tenant transaction via RLS", async () => {
    const tenant = await setupTenant("RLS Direct Org", "rls@org.com");

    // Insert task inside tenant context
    let taskId: string = "";
    await withTenantContext(tenant.orgId, async (tx) => {
      const [task] = await tx.insert(tasks).values({
        orgId: tenant.orgId,
        createdBy: tenant.userId,
        title: "RLS Isolated Task",
        status: "pending",
      }).returning();
      taskId = task.id;
    });

    // Query directly on global db without setting app.current_org (outside tenant context)
    const directRows = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(directRows.length).toBe(0); // RLS returns 0 rows due to missing context
  });

  it("should enforce transaction atomicity across multiple operations on the same transaction", async () => {
    const tenant = await setupTenant("Atomicity Org", "atomicity@org.com");

    try {
      await withTenantContext(tenant.orgId, async (tx) => {
        // Operation A: Insert Task A (succeeds initially)
        await tx.insert(tasks).values({
          orgId: tenant.orgId,
          createdBy: tenant.userId,
          title: "Atomic Task A",
          status: "pending",
        });

        // Operation B: Insert Task B with invalid org_id violating RLS WITH CHECK (fails)
        await tx.insert(tasks).values({
          orgId: "00000000-0000-0000-0000-000000000000",
          createdBy: tenant.userId,
          title: "Atomic Task B",
          status: "pending",
        });
      });
    } catch (err: any) {
      expect(err).toBeDefined();
    }

    // Verify both Operation A and Operation B were rolled back completely
    await withTenantContext(tenant.orgId, async (tx) => {
      const foundA = await tx.select().from(tasks).where(eq(tasks.title, "Atomic Task A"));
      expect(foundA.length).toBe(0);
      const foundB = await tx.select().from(tasks).where(eq(tasks.title, "Atomic Task B"));
      expect(foundB.length).toBe(0);
    });
  });

  it("should enforce HTTP request-level atomicity across multiple operations when downstream processing fails", async () => {
    const tenant = await setupTenant("HTTP Atomicity Org", "httpatomicity@org.com");

    const res = await request(app)
      .post("/api/v1/tasks/test-multi-op")
      .set("Authorization", `Bearer ${tenant.token}`)
      .send({});

    expect(res.status).toBe(500);

    await withTenantContext(tenant.orgId, async (tx) => {
      const foundA = await tx.select().from(tasks).where(eq(tasks.title, "HTTP Multi Task A"));
      expect(foundA.length).toBe(0);
    });
  });

  it("should complete the database transaction before the HTTP response is written", async () => {
    const tenant = await setupTenant("Pre Response Org", "preresponse@org.com");

    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${tenant.token}`)
      .send({ title: "Pre Response Task", description: "Verifying tx completion before HTTP response" });

    expect(res.status).toBe(201);

    // Verify task is committed in DB upon response receipt
    await withTenantContext(tenant.orgId, async (tx) => {
      const [foundTask] = await tx.select().from(tasks).where(eq(tasks.id, res.body.data.id));
      expect(foundTask).toBeDefined();
      expect(foundTask.title).toBe("Pre Response Task");
    });

    // Verify connection pool is not pinned with active tenant context
    const resOutside = await db.execute(sql`SELECT current_setting('app.current_org', true) as val;`);
    const settingOutsideTx = (resOutside.rows[0] as any).val;
    expect(settingOutsideTx === "" || settingOutsideTx === null).toBe(true);
  });
});

