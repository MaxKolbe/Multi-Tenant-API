CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."task_status";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE "public"."task_status" USING "status"::"public"."task_status";