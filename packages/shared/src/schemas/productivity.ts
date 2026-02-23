import { z } from "zod";
import { DomainEnum } from "./profile";

// ─── Week ────────────────────────────────────────────────────────
export const CreateWeekSchema = z.object({
  weekStartDate: z.string(), // YYYY-MM-DD (Monday)
});
export type CreateWeekInput = z.infer<typeof CreateWeekSchema>;

// ─── Week Outcome ────────────────────────────────────────────────
export const OutcomeStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "done",
  "dropped",
]);
export const OutcomePriorityEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const CreateOutcomeSchema = z.object({
  domain: DomainEnum,
  title: z.string().min(1).max(300),
  definitionOfDone: z.string().min(1),
  priority: z.number().int().min(1).max(3).default(2),
  timeBudgetMinutes: z.number().int().min(0).optional(),
  status: OutcomeStatusEnum.default("not_started"),
  initiativeId: z.string().optional(),
  milestoneId: z.string().optional(),
});
export type CreateOutcomeInput = z.infer<typeof CreateOutcomeSchema>;

export const UpdateOutcomeSchema = CreateOutcomeSchema.partial();
export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeSchema>;

// ─── Daily Check-in ──────────────────────────────────────────────
export const CreateCheckinSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  top1: z.string().min(1),
  secondary1: z.string().optional(),
  secondary2: z.string().optional(),
  energy: z.number().int().min(1).max(10),
  sleepHours: z.number().min(0).max(24),
  trainingPlanned: z.boolean().default(false),
  blocker: z.string().optional(),
  avoidanceTag: z.string().optional(),
});
export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

export const UpdateCheckinSchema = CreateCheckinSchema.partial();
export type UpdateCheckinInput = z.infer<typeof UpdateCheckinSchema>;
