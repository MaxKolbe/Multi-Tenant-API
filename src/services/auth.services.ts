import db from "../db/db.js";
import { organizations, users } from "../db/models/index.js";
import { hashPassword, verifyPassword } from "../utils/password.util.js";
import { generateToken } from "../utils/token.util.js";
import { ConflictError, UnauthorizedError } from "../lib/error.js";
import { RegisterBodyType, LoginBodyType } from "../modules/auth/auth.schema.js";
import { eq, and, sql } from "drizzle-orm";

export const registerOrganization = async (data: RegisterBodyType, correlationId: string) => {
  const hashedPassword = await hashPassword(data.password);

  try {
    const result = await db.transaction(async (tx) => {
      // Create Organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: data.organizationName,
          slug: data.organizationSlug,
        })
        .returning();

      if (!org) throw new Error("Failed to create organization");

      // Set tenant context for user creation in transaction
      await tx.execute(sql`SELECT set_config('app.current_org', ${org.id}, true);`);

      // Create First User
      const [user] = await tx
        .insert(users)
        .values({
          orgId: org.id,
          email: data.email,
          passwordHash: hashedPassword,
        })
        .returning();

      if (!user) throw new Error("Failed to create user");

      return { org, user };
    });

    return {
      code: 201,
      message: "Organization registered successfully",
      data: {
        organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
        user: { id: result.user.id, email: result.user.email },
      },
      meta: { correlationId },
    };
  } catch (error: any) {
    // Postgres unique constraint violation (slug or email already exists)
    if (error?.cause?.code === "23505") {
      throw new ConflictError("Organization slug or email already exists");
    }
    throw error;
  }
};

export const loginUser = async (data: LoginBodyType, correlationId: string) => {
  return db.transaction(async (tx) => {
    // Find organization by slug
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.slug, data.slug))
      .limit(1);

    if (!org) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Set tenant context for user lookup
    await tx.execute(sql`SELECT set_config('app.current_org', ${org.id}, true);`);

    // Find user by orgId and email
    const [user] = await tx
      .select()
      .from(users)
      .where(and(eq(users.orgId, org.id), eq(users.email, data.email)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Generate JWT
    const accessToken = generateToken({
      id: user.id,
      name: user.email,
      orgId: org.id,
    });

    return {
      code: 200,
      message: "Login successful",
      data: {
        user: { id: user.id, email: user.email, orgId: user.orgId },
      },
      meta: { accessToken, correlationId },
    };
  });
};
