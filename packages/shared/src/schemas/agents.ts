import { z } from "zod";

// ─── Agent 1: Studio Strategy Alignment ──────────────────────────
export const StudioAlignmentOutputSchema = z.object({
  alignment_score: z.number().min(0).max(100),
  misaligned_items: z.array(
    z.object({
      outcome_title: z.string(),
      reason: z.string(),
      suggested_fix: z.string(),
    })
  ),
  recommended_week_focus: z.string(),
  what_to_cut: z.array(z.string()),
  one_warning: z.string(),
});
export type StudioAlignmentOutput = z.infer<typeof StudioAlignmentOutputSchema>;

// ─── Agent 2: Weekly Planning ────────────────────────────────────
export const WeeklyPlanningOutputSchema = z.object({
  scope_verdict: z.enum(["too_big", "ok", "too_small"]),
  rewritten_outcomes: z.array(
    z.object({
      domain: z.string(),
      title: z.string(),
      definition_of_done: z.string(),
      priority: z.number().int().min(1).max(3),
      time_budget_minutes: z.number().int(),
      risk: z.string(),
      countermeasure: z.string(),
    })
  ),
  cut_list_suggestions: z.array(z.string()),
  one_warning: z.string(),
});
export type WeeklyPlanningOutput = z.infer<typeof WeeklyPlanningOutputSchema>;

// ─── Agent 3: Daily Focus ────────────────────────────────────────
export const DailyFocusOutputSchema = z.object({
  top1_quality: z.enum(["weak", "ok", "strong"]),
  overload_risk: z.enum(["low", "medium", "high"]),
  fifteen_minute_starter: z.object({
    task: z.string(),
    definition_of_done: z.string(),
  }),
  avoidance_warning: z.string(),
  fallback_if_blocked: z.string(),
  training_nudge: z.string(),
});
export type DailyFocusOutput = z.infer<typeof DailyFocusOutputSchema>;

// ─── Agent 4: Weekly Review ──────────────────────────────────────
export const WeeklyReviewOutputSchema = z.object({
  score: z.object({
    outcomes_completed: z.number().int(),
    outcomes_total: z.number().int(),
    consistency_grade: z.enum(["A", "B", "C", "D", "F"]),
    training_sessions_done: z.number().int(),
  }),
  what_worked: z.array(z.string()),
  what_failed: z.array(z.string()),
  patterns_detected: z.array(z.string()),
  one_rule_change_next_week: z.string(),
  next_week_recommendation: z.object({
    outcome_count: z.number().int(),
    training_focus: z.string(),
    ironman_focus: z.string(),
  }),
});
export type WeeklyReviewOutput = z.infer<typeof WeeklyReviewOutputSchema>;

// ─── Agent 5: Ironman Weekly Plan ────────────────────────────────
export const IronmanWeeklyPlanOutputSchema = z.object({
  weekly_endurance_structure: z.object({
    swim_sessions: z.number().int(),
    bike_sessions: z.number().int(),
    run_sessions: z.number().int(),
    long_session: z.enum(["bike", "run", "brick", "none"]),
    total_target_minutes: z.number().int(),
  }),
  key_sessions: z.array(
    z.object({
      discipline: z.enum(["swim", "bike", "run"]),
      session_type: z.string(),
      duration_minutes: z.number().int(),
      intensity: z.enum(["easy", "moderate", "hard"]),
      notes: z.string(),
    })
  ),
  warning: z.string(),
  minimum_viable_week: z.string(),
});
export type IronmanWeeklyPlanOutput = z.infer<
  typeof IronmanWeeklyPlanOutputSchema
>;

// ─── Agent 6: Nutrition Weekly Targets ───────────────────────────
export const NutritionTargetsOutputSchema = z.object({
  targets: z.object({
    protein_g: z.number().int(),
    water_l: z.number(),
    meal_quality_rule: z.string(),
  }),
  why_this_is_realistic: z.string(),
  one_risk: z.string(),
});
export type NutritionTargetsOutput = z.infer<
  typeof NutritionTargetsOutputSchema
>;

// ─── Agent 7: Finance Monthly Budget ─────────────────────────────
export const FinanceBudgetOutputSchema = z.object({
  proposed_income_target: z.number(),
  proposed_savings_target: z.number(),
  budget_items: z.array(
    z.object({
      category: z.string(),
      planned_amount: z.number(),
    })
  ),
  two_cost_cuts: z.array(z.string()),
  one_warning: z.string(),
});
export type FinanceBudgetOutput = z.infer<typeof FinanceBudgetOutputSchema>;

// ─── All Agent IDs ───────────────────────────────────────────────
export const AgentIdEnum = z.enum([
  "studio_strategy_alignment",
  "weekly_planning",
  "daily_focus",
  "weekly_review",
  "ironman_weekly_plan",
  "nutrition_weekly_targets",
  "finance_monthly_budget",
]);
export type AgentId = z.infer<typeof AgentIdEnum>;

export const AGENT_IDS = AgentIdEnum.options;
