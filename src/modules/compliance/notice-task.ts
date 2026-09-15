import { z } from "zod";

export const noticeDueDateSchema = z.iso.date();

export const noticeDraftTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  dueDate: noticeDueDateSchema,
  category: z.string().optional(),
});
