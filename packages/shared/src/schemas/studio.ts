import { z } from "zod";

// ─── Studio Plan ─────────────────────────────────────────────────
export const StudioPlanSchema = z.object({
  mission: z.string().default(""),
  definitionOfSuccess: z.string().default(""),
  values: z.string().default(""),
  positioning: z.string().default(""),
  businessAssumptions: z.string().default(""),
  notNowList: z.string().default(""),
});
export type StudioPlanInput = z.infer<typeof StudioPlanSchema>;

// ─── Initiative ──────────────────────────────────────────────────
export const InitiativeStatusEnum = z.enum([
  "planned",
  "active",
  "paused",
  "done",
]);

export const CreateInitiativeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(""),
  status: InitiativeStatusEnum.default("planned"),
  quarterTag: z.string().max(10).optional(),
  targetDate: z.string().optional(),
});
export type CreateInitiativeInput = z.infer<typeof CreateInitiativeSchema>;

export const UpdateInitiativeSchema = CreateInitiativeSchema.partial();
export type UpdateInitiativeInput = z.infer<typeof UpdateInitiativeSchema>;

// ─── Milestone ───────────────────────────────────────────────────
export const CreateMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  done: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial();
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneSchema>;

// ─── Idea Inbox ──────────────────────────────────────────────────
export const IdeaStatusEnum = z.enum([
  "inbox",
  "evaluating",
  "not_now",
  "accepted",
  "rejected",
]);

export const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().default(""),
  status: IdeaStatusEnum.default("inbox"),
});
export type CreateIdeaInput = z.infer<typeof CreateIdeaSchema>;

export const UpdateIdeaSchema = CreateIdeaSchema.partial();
export type UpdateIdeaInput = z.infer<typeof UpdateIdeaSchema>;

// ─── Risk Register ───────────────────────────────────────────────
export const RiskStatusEnum = z.enum([
  "open",
  "mitigated",
  "accepted",
  "closed",
]);

export const CreateRiskSchema = z.object({
  title: z.string().min(1).max(200),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  mitigation: z.string().default(""),
  status: RiskStatusEnum.default("open"),
});
export type CreateRiskInput = z.infer<typeof CreateRiskSchema>;

export const UpdateRiskSchema = CreateRiskSchema.partial();
export type UpdateRiskInput = z.infer<typeof UpdateRiskSchema>;
