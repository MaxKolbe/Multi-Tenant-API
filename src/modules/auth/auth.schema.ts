import * as z from "zod";

export const exampleAuthScema = z.object({
  body: z.object({
    email: z.email("Must be a valid email").transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
  }),
});
