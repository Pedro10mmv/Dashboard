import { z } from "zod";

export const ToneEnum = z.enum(["supportive", "neutral", "strict"]);
export type Tone = z.infer<typeof ToneEnum>;

export const DomainEnum = z.enum([
  "studio",
  "ironman",
  "nutrition",
  "finance",
  "other",
]);
export type Domain = z.infer<typeof DomainEnum>;

export const CreateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().default("Europe/Berlin"),
  morningCheckinTime: z.string().default("07:00"),
  domainsEnabled: z.array(DomainEnum).default(["studio"]),
  strictness: z.number().int().min(1).max(5).default(3),
  tone: ToneEnum.default("supportive"),
  weeklyOutcomeLimit: z.number().int().min(1).max(10).default(3),
});
export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = CreateProfileSchema.partial();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ProfileAgentSettingSchema = z.object({
  agentId: z.string(),
  enabled: z.boolean().default(true),
  provider: z.string().optional(),
  model: z.string().optional(),
});
export type ProfileAgentSetting = z.infer<typeof ProfileAgentSettingSchema>;
