import { z } from "zod";

// ─── Ironman Plan ────────────────────────────────────────────────
export const IronmanPhaseEnum = z.enum([
  "base",
  "build",
  "peak",
  "taper",
  "offseason",
]);

export const UpsertIronmanPlanSchema = z.object({
  targetEventName: z.string().default("Ironman 2027"),
  targetEventDate: z.string().optional(),
  phase: IronmanPhaseEnum.default("base"),
  weeklyHoursTarget: z.number().min(0).max(30).default(8),
});
export type UpsertIronmanPlanInput = z.infer<typeof UpsertIronmanPlanSchema>;

// ─── Training Session ────────────────────────────────────────────
export const DisciplineEnum = z.enum([
  "swim",
  "bike",
  "run",
  "strength",
  "crossfit",
  "mobility",
  "other",
]);
export const IntensityEnum = z.enum(["easy", "moderate", "hard"]);

export const CreateTrainingSessionSchema = z.object({
  date: z.string(),
  discipline: DisciplineEnum,
  sessionType: z.string().max(100).default(""),
  durationMinutes: z.number().int().min(1),
  intensity: IntensityEnum.default("moderate"),
  rpe: z.number().int().min(1).max(10).optional(),
  description: z.string().optional(),
});
export type CreateTrainingSessionInput = z.infer<
  typeof CreateTrainingSessionSchema
>;

export const UpdateTrainingSessionSchema =
  CreateTrainingSessionSchema.partial();
export type UpdateTrainingSessionInput = z.infer<
  typeof UpdateTrainingSessionSchema
>;
