import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "../src/db/db.js";
import { testDb, closeTestDb } from "./helpers/testDb.js";
import { clearTables, installExtensions } from "./helpers/setup.js";
import { sql } from "drizzle-orm";
import { organizations, users, tasks } from "../src/db/models/index.js";
import { withTenantContext } from "../src/lib/tenant.js";

describe("Database Restricted Role Integration & Security Verification", () => {
  beforeAll(async () => {
    await installExtensions();
    await clearTables();
  });

  afterAll(async () => {
    await clearTables();
    await closeTestDb();
  });

  it("should verify API pool connects as restricted app_runtime role", async () => {
    const result = await db.execute(sql`SELECT current_user, session_user;`);
    const row = result.rows[0] as { current_user: string; session_user: string };
    expect(row.current_user).toBe("app_runtime");
  });

  it("should verify app_runtime role attributes in pg_roles catalog", async () => {
    const result = await db.execute(
      sql`SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime';`
    );
    const role = result.rows[0] as {
      rolname: string;
      rolsuper: boolean;
      rolcreaterole: boolean;
      rolcreatedb: boolean;
      rolbypassrls: boolean;
    };

    expect(role).toBeDefined();
    expect(role.rolname).toBe("app_runtime");
    expect(role.rolsuper).toBe(false);
    expect(role.rolcreaterole).toBe(false);
    expect(role.rolcreatedb).toBe(false);
    expect(role.rolbypassrls).toBe(false);
  });

  it("should verify app_runtime does NOT own the application tables", async () => {
    const result = await db.execute(
      sql`SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('organizations', 'users', 'tasks');`
    );
    const tables = result.rows as Array<{ tablename: string; tableowner: string }>;

    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table.tableowner).not.toBe("app_runtime");
    }
  });

  it("should verify app_runtime can perform standard CRUD operations", async () => {
    // INSERT Organization
    const [org] = await db
      .insert(organizations)
      .values({ name: "Role Verification Org", slug: "role-verif-org" })
      .returning();
    expect(org).toBeDefined();
    expect(org!.name).toBe("Role Verification Org");

    await withTenantContext(org!.id, async (tx) => {
      // SELECT
      const foundOrgs = await tx.select().from(organizations).where(sql`id = ${org!.id}`);
      expect(foundOrgs.length).toBe(1);

      // UPDATE
      const [updatedOrg] = await tx
        .update(organizations)
        .set({ name: "Updated Role Org" })
        .where(sql`id = ${org!.id}`)
        .returning();
      expect(updatedOrg).toBeDefined();
      expect(updatedOrg!.name).toBe("Updated Role Org");

      // DELETE
      await tx.delete(organizations).where(sql`id = ${org!.id}`);
      const remaining = await tx.select().from(organizations).where(sql`id = ${org!.id}`);
      expect(remaining.length).toBe(0);
    });
  });

  it("should reject CREATE TABLE operations from app_runtime", async () => {
    await expect(
      db.execute(sql`CREATE TABLE forbidden_test_table (id int);`)
    ).rejects.toThrow();
  });

  it("should reject ALTER TABLE operations from app_runtime", async () => {
    await expect(
      db.execute(sql`ALTER TABLE tasks ADD COLUMN forbidden_col text;`)
    ).rejects.toThrow();
  });

  it("should reject DROP TABLE operations from app_runtime", async () => {
    await expect(
      db.execute(sql`DROP TABLE tasks;`)
    ).rejects.toThrow();
  });

  it("should reject CREATE ROLE operations from app_runtime", async () => {
    await expect(
      db.execute(sql`CREATE ROLE forbidden_subrole;`)
    ).rejects.toThrow();
  });

  it("should reject TRUNCATE TABLE operations from app_runtime", async () => {
    await expect(
      db.execute(sql`TRUNCATE TABLE tasks;`)
    ).rejects.toThrow();
  });
});
