import db from "../db/db.js";
import { tasks } from "../db/models/index.js";
import { NotFoundError } from "../lib/error.js";
import { CreateTaskBodyType, UpdateTaskBodyType } from "../modules/tasks/tasks.schema.js";
import { and, eq } from "drizzle-orm";

export const createTask = async (
  orgId: string,
  userId: string,
  data: CreateTaskBodyType,
  correlationId: string
) => {
  const [task] = await db
    .insert(tasks)
    .values({
      orgId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      status: data.status || "pending",
    })
    .returning();

  return {
    code: 201,
    message: "Task created successfully",
    data: task,
    meta: { correlationId },
  };
};

export const listTasks = async (orgId: string, correlationId: string) => {
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.orgId, orgId));

  return {
    code: 200,
    message: "Tasks retrieved successfully",
    data: allTasks,
    meta: { correlationId },
  };
};

export const getTask = async (orgId: string, taskId: string, correlationId: string) => {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)))
    .limit(1);

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  return {
    code: 200,
    message: "Task retrieved successfully",
    data: task,
    meta: { correlationId },
  };
};

export const updateTask = async (
  orgId: string,
  taskId: string,
  data: UpdateTaskBodyType,
  correlationId: string
) => {
  const [updatedTask] = await db
    .update(tasks)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)))
    .returning();

  if (!updatedTask) {
    throw new NotFoundError("Task not found");
  }

  return {
    code: 200,
    message: "Task updated successfully",
    data: updatedTask,
    meta: { correlationId },
  };
};

export const deleteTask = async (orgId: string, taskId: string, correlationId: string) => {
  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)))
    .returning();

  if (!deletedTask) {
    throw new NotFoundError("Task not found");
  }

  return {
    code: 200,
    message: "Task deleted successfully",
    data: null,
    meta: { correlationId },
  };
};
