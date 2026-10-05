import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "../src/db/db.js";
import { testDb, closeTestDb } from "./helpers/testDb.js";
import { clearTables, installExtensions } from "./helpers/setup.js";
import { withTenantContext } from "../src/lib/tenant.js";
import { organizations, users, tasks, referenceTable } from "../src/db/models/index.js";
import { registerOrganization, loginUser } from "../src/services/auth.services.js";
import { createTask, listTasks, getTask, updateTask, deleteTask } from "../src/services/tasks.services.ts";
import { sql, eq } from "drizzle-orm";

describe("PostgreSQL Row-Level Security (RLS) & Tenant Isolation Policies", () => {
  let orgAId: string;
  let userAId: string;
  let orgBId: string;
  let userBId: string;

  beforeAll(async () => {
    await installExtensions();
    await clearTables();

    // Setup Tenant A and Tenant B via privileged setup
    const regA = await registerOrganization(
      {
        organizationName: "Tenant A",
        organizationSlug: "tenant-a",
        email: "alice@tenant-a.com",
        password: "password123",
      },
      "corr-reg-a"
    );
    orgAId = regA.data.organization.id;
    userAId = regA.data.user.id;

    const regB = await registerOrganization(
      {
        organizationName: "Tenant B",
        organizationSlug: "tenant-b",
        email: "bob@tenant-b.com",
        password: "password123",
      },
      "corr-reg-b"
    );
    orgBId = regB.data.organization.id;
    userBId = regB.data.user.id;
  });

  afterAll(async () => {
    await clearTables();
    await closeTestDb();
  });

  describe("Tenant A Self Operations", () => {
    it("should allow Tenant A to insert, select, update, and delete its own tasks", async () => {
      const createRes = await createTask(
        orgAId,
        userAId,
        { title: "Tenant A Task 1", description: "Desc A" },
        "corr-1"
      );
      expect(createRes.code).toBe(201);
      const taskId = createRes.data.id;

      const listRes = await listTasks(orgAId, "corr-2");
      expect(listRes.data.some((t: any) => t.id === taskId)).toBe(true);

      const getRes = await getTask(orgAId, taskId, "corr-3");
      expect(getRes.data.title).toBe("Tenant A Task 1");

      const updateRes = await updateTask(
        orgAId,
        taskId,
        { title: "Updated Tenant A Task 1" },
        "corr-4"
      );
      expect(updateRes.data.title).toBe("Updated Tenant A Task 1");

      const deleteRes = await deleteTask(orgAId, taskId, "corr-5");
      expect(deleteRes.code).toBe(200);
    });

    it("should allow Tenant A to read its own user rows", async () => {
      await withTenantContext(orgAId, async (tx) => {
        const foundUsers = await tx.select().from(users).where(eq(users.orgId, orgAId));
        expect(foundUsers.length).toBeGreaterThan(0);
        expect(foundUsers.every((u: any) => u.orgId === orgAId)).toBe(true);
      });
    });
  });

  describe("Tenant B Self Operations", () => {
    it("should allow Tenant B to insert, select, update, and delete its own tasks", async () => {
      const createRes = await createTask(
        orgBId,
        userBId,
        { title: "Tenant B Task 1", description: "Desc B" },
        "corr-6"
      );
      expect(createRes.code).toBe(201);
      const taskId = createRes.data.id;

      const listRes = await listTasks(orgBId, "corr-7");
      expect(listRes.data.some((t: any) => t.id === taskId)).toBe(true);

      const updateRes = await updateTask(
        orgBId,
        taskId,
        { status: "completed" },
        "corr-8"
      );
      expect(updateRes.data.status).toBe("completed");

      const deleteRes = await deleteTask(orgBId, taskId, "corr-9");
      expect(deleteRes.code).toBe(200);
    });
  });

  describe("Cross-Tenant Security Boundary Isolation", () => {
    let taskBId: string;

    beforeAll(async () => {
      const res = await createTask(
        orgBId,
        userBId,
        { title: "Protected Tenant B Task" },
        "corr-b-setup"
      );
      taskBId = res.data.id;
    });

    it("should prevent Tenant A from selecting Tenant B's task by ID alone (no org_id predicate)", async () => {
      await withTenantContext(orgAId, async (tx) => {
        // Deliberately unfiltered query: WHERE id = taskBId (no org_id filter)
        const result = await tx.select().from(tasks).where(eq(tasks.id, taskBId));
        expect(result.length).toBe(0);
      });
    });

    it("should prevent Tenant A from updating Tenant B's task by ID alone (no org_id predicate)", async () => {
      await withTenantContext(orgAId, async (tx) => {
        // Deliberately unfiltered query: WHERE id = taskBId (no org_id filter)
        const updated = await tx
          .update(tasks)
          .set({ title: "Hacked Title" })
          .where(eq(tasks.id, taskBId))
          .returning();
        expect(updated.length).toBe(0);
      });
    });

    it("should prevent Tenant A from deleting Tenant B's task by ID alone (no org_id predicate)", async () => {
      await withTenantContext(orgAId, async (tx) => {
        // Deliberately unfiltered query: WHERE id = taskBId (no org_id filter)
        const deleted = await tx.delete(tasks).where(eq(tasks.id, taskBId)).returning();
        expect(deleted.length).toBe(0);
      });
    });

    it("should allow Tenant B to select its own task by ID alone (no org_id predicate) when under Tenant B context", async () => {
      await withTenantContext(orgBId, async (tx) => {
        // Deliberately unfiltered query: WHERE id = taskBId (no org_id filter)
        const result = await tx.select().from(tasks).where(eq(tasks.id, taskBId));
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(taskBId);
        expect(result[0].title).toBe("Protected Tenant B Task");
      });
    });

    it("should prevent Tenant A from inserting a task with Tenant B's org_id", async () => {
      await expect(
        withTenantContext(orgAId, async (tx) => {
          await tx.insert(tasks).values({
            orgId: orgBId, // Spoofed orgId
            createdBy: userAId,
            title: "Spoofed Task",
          });
        })
      ).rejects.toThrow();
    });

    it("should prevent Tenant A from altering its task's org_id to Tenant B's org_id", async () => {
      const taskA = await createTask(
        orgAId,
        userAId,
        { title: "Original Task A" },
        "corr-org-change"
      );

      await expect(
        withTenantContext(orgAId, async (tx) => {
          await tx
            .update(tasks)
            .set({ orgId: orgBId })
            .where(eq(tasks.id, taskA.data.id));
        })
      ).rejects.toThrow();
    });
  });

  describe("Missing Tenant Context Handling", () => {
    it("should return 0 rows for SELECT when app.current_org is missing or empty", async () => {
      await withTenantContext("", async (tx) => {
        const selected = await tx.select().from(tasks);
        expect(selected.length).toBe(0);
      });
    });

    it("should reject INSERT when app.current_org is missing or empty", async () => {
      await expect(
        withTenantContext("", async (tx) => {
          await tx.insert(tasks).values({
            orgId: orgAId,
            createdBy: userAId,
            title: "No Context Task",
          });
        })
      ).rejects.toThrow();
    });

    it("should return 0 rows for UPDATE when app.current_org is missing or empty", async () => {
      await withTenantContext("", async (tx) => {
        const updated = await tx.update(tasks).set({ title: "No Context Update" }).returning();
        expect(updated.length).toBe(0);
      });
    });

    it("should return 0 rows for DELETE when app.current_org is missing or empty", async () => {
      await withTenantContext("", async (tx) => {
        const deleted = await tx.delete(tasks).returning();
        expect(deleted.length).toBe(0);
      });
    });
  });

  describe("Authentication Flow & User Isolation", () => {
    it("should successfully execute login flow with organization lookup and user verification", async () => {
      const loginRes = await loginUser(
        {
          slug: "tenant-a",
          email: "alice@tenant-a.com",
          password: "password123",
        },
        "corr-login-a"
      );
      expect(loginRes.code).toBe(200);
      expect(loginRes.data.user.email).toBe("alice@tenant-a.com");
      expect(loginRes.data.user.orgId).toBe(orgAId);
    });

    it("should isolate users table so Tenant A cannot query Tenant B users", async () => {
      await withTenantContext(orgAId, async (tx) => {
        const found = await tx.select().from(users).where(eq(users.id, userBId));
        expect(found.length).toBe(0);
      });
    });
  });

  describe("Organizations & Shared Reference Tables", () => {
    it("should allow querying own organization row and block modifying another org", async () => {
      await withTenantContext(orgAId, async (tx) => {
        const [org] = await tx.select().from(organizations).where(eq(organizations.id, orgAId));
        expect(org).toBeDefined();
        expect(org!.name).toBe("Tenant A");

        const updatedOther = await tx
          .update(organizations)
          .set({ name: "Hacked Org B" })
          .where(eq(organizations.id, orgBId))
          .returning();
        expect(updatedOther.length).toBe(0);
      });
    });

    it("should allow selecting shared reference table", async () => {
      await withTenantContext(orgAId, async (tx) => {
        const refs = await tx.select().from(referenceTable);
        expect(Array.isArray(refs)).toBe(true);
      });
    });
  });
});
