import * as z from "zod";

export const createTaskBodySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(500),
    description: z.string().trim().optional(),
    status: z.enum(["pending", "in_progress", "completed"]).optional(),
  }),
});

export const updateTaskBodySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(500).optional(),
    description: z.string().trim().optional(),
    status: z.enum(["pending", "in_progress", "completed"]).optional(),
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: z.uuid("Invalid task ID"),
  }),
});

export type CreateTaskBodyType = z.infer<typeof createTaskBodySchema>["body"];
export type UpdateTaskBodyType = z.infer<typeof updateTaskBodySchema>["body"];
export type TaskIdParamType = z.infer<typeof taskIdParamSchema>["params"];
