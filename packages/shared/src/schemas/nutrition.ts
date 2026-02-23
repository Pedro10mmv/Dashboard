import { z } from "zod";

// ─── Weekly Nutrition Targets ────────────────────────────────────
export const UpsertNutritionTargetSchema = z.object({
  proteinG: z.number().int().min(0).optional(),
  waterL: z.number().min(0).optional(),
  mealQualityRule: z.string().default("2 high-quality meals/day"),
});
export type UpsertNutritionTargetInput = z.infer<
  typeof UpsertNutritionTargetSchema
>;

// ─── Daily Nutrition Log ─────────────────────────────────────────
export const CreateNutritionLogSchema = z.object({
  date: z.string(),
  proteinMet: z.boolean().default(false),
  waterMet: z.boolean().default(false),
  mealQualityMet: z.boolean().default(false),
  notes: z.string().optional(),
});
export type CreateNutritionLogInput = z.infer<typeof CreateNutritionLogSchema>;

export const UpdateNutritionLogSchema = CreateNutritionLogSchema.partial();
export type UpdateNutritionLogInput = z.infer<typeof UpdateNutritionLogSchema>;
