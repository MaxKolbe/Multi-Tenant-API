import * as z from "zod";

export const registerBodySchema = z.object({
  body: z.object({
    organizationName: z.string().trim().min(1, "Organization name is required").max(100),
    organizationSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
      .optional(),
    email: z.email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
  }).transform((data) => {
    if (!data.organizationSlug) {
      data.organizationSlug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    return data as Omit<typeof data, "organizationSlug"> & { organizationSlug: string };
  }),
});

export const loginBodySchema = z.object({
  body: z.object({
    slug: z.string().trim().toLowerCase().min(1, "Organization slug is required"),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

export type RegisterBodyType = z.infer<typeof registerBodySchema>["body"];
export type LoginBodyType = z.infer<typeof loginBodySchema>["body"];
