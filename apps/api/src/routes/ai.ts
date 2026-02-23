import { Router } from "express";
import fs from "fs";
import path from "path";
import type {
  Initiative,
  WeekOutcome,
  DailyCheckin,
  TrainingSession,
  NutritionLog,
} from "../generated/client";
import {
  StudioAlignmentOutputSchema,
  WeeklyPlanningOutputSchema,
  DailyFocusOutputSchema,
  WeeklyReviewOutputSchema,
  IronmanWeeklyPlanOutputSchema,
  NutritionTargetsOutputSchema,
  FinanceBudgetOutputSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  generateJSON,
  getProviderConfig,
  isAgentEnabled,
} from "../ai/generate";

const router = Router({ mergeParams: true });

function loadPrompt(agentId: string): string {
  const promptPath = path.join(__dirname, "..", "agents", agentId, "prompt.md");
  return fs.readFileSync(promptPath, "utf-8");
}

function loadVersion(agentId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(__dirname, "..", "agents", agentId, "version"));
  return mod.PROMPT_VERSION as string;
}

// ─── Agent 1: Studio Strategy Alignment ──────────────────────────
router.post("/weeks/:weekId/ai/studio-alignment", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "studio_strategy_alignment";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled for this profile" });
      return;
    }

    const week = await prisma.week.findUnique({
      where: { id: req.params.weekId },
      include: { outcomes: true },
    });
    if (!week) {
      res.status(404).json({ error: "Week not found" });
      return;
    }

    const initiatives = await prisma.initiative.findMany({
      where: { profileId, status: "active" },
    });

    const studioPlan = await prisma.studioPlan.findUnique({
      where: { profileId },
    });

    const input = {
      activeInitiatives: initiatives.map((i: Initiative) => ({
        title: i.title,
        description: i.description,
        quarterTag: i.quarterTag,
      })),
      proposedOutcomes: week.outcomes.map((o: WeekOutcome) => ({
        title: o.title,
        domain: o.domain,
        definitionOfDone: o.definitionOfDone,
      })),
      notNowList: studioPlan?.notNowList || "",
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: StudioAlignmentOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 2: Weekly Planning ────────────────────────────────────
router.post("/weeks/:weekId/ai/weekly-planning", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "weekly_planning";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const week = await prisma.week.findUnique({
      where: { id: req.params.weekId },
      include: { outcomes: true },
    });
    if (!week) {
      res.status(404).json({ error: "Week not found" });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    const input = {
      proposedOutcomes: week.outcomes.map((o: WeekOutcome) => ({
        domain: o.domain,
        title: o.title,
        definitionOfDone: o.definitionOfDone,
        priority: o.priority,
        timeBudgetMinutes: o.timeBudgetMinutes,
      })),
      weeklyOutcomeLimit: profile?.weeklyOutcomeLimit || 3,
      strictness: profile?.strictness || 3,
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: WeeklyPlanningOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 3: Daily Focus ────────────────────────────────────────
router.post("/checkins/:checkinId/ai/daily-focus", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "daily_focus";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const checkin = await prisma.dailyCheckin.findUnique({
      where: { id: req.params.checkinId },
    });
    if (!checkin) {
      res.status(404).json({ error: "Check-in not found" });
      return;
    }

    // Get current week outcomes
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const week = await prisma.week.findUnique({
      where: {
        profileId_weekStartDate: {
          profileId: profileId!,
          weekStartDate: monday,
        },
      },
      include: { outcomes: true },
    });

    // Get last 3 check-ins
    const recentCheckins = await prisma.dailyCheckin.findMany({
      where: { profileId, id: { not: checkin.id } },
      orderBy: { date: "desc" },
      take: 3,
    });

    // Get ironman plan phase
    const ironmanPlan = await prisma.ironmanPlan.findUnique({
      where: { profileId },
    });

    const input = {
      todayCheckin: {
        top1: checkin.top1,
        secondary1: checkin.secondary1,
        secondary2: checkin.secondary2,
        energy: checkin.energy,
        sleepHours: checkin.sleepHours,
        trainingPlanned: checkin.trainingPlanned,
        blocker: checkin.blocker,
        avoidanceTag: checkin.avoidanceTag,
      },
      weekOutcomes:
        week?.outcomes.map((o: WeekOutcome) => ({
          title: o.title,
          status: o.status,
          domain: o.domain,
          priority: o.priority,
        })) || [],
      recentCheckins: recentCheckins.map((c: DailyCheckin) => ({
        date: c.date.toISOString().split("T")[0],
        top1: c.top1,
        energy: c.energy,
        sleepHours: c.sleepHours,
        avoidanceTag: c.avoidanceTag,
      })),
      ironmanPhase: ironmanPlan?.phase || "none",
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: DailyFocusOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 4: Weekly Review ──────────────────────────────────────
router.post("/weeks/:weekId/ai/weekly-review", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "weekly_review";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const week = await prisma.week.findUnique({
      where: { id: req.params.weekId },
      include: { outcomes: true, nutritionTargets: true },
    });
    if (!week) {
      res.status(404).json({ error: "Week not found" });
      return;
    }

    const sunday = new Date(week.weekStartDate);
    sunday.setDate(sunday.getDate() + 6);

    const checkins = await prisma.dailyCheckin.findMany({
      where: { profileId, date: { gte: week.weekStartDate, lte: sunday } },
    });

    const sessions = await prisma.trainingSession.findMany({
      where: { profileId, date: { gte: week.weekStartDate, lte: sunday } },
    });

    const nutritionLogs = await prisma.nutritionLog.findMany({
      where: { profileId, date: { gte: week.weekStartDate, lte: sunday } },
    });

    const input = {
      outcomes: week.outcomes.map((o: WeekOutcome) => ({
        title: o.title,
        status: o.status,
        domain: o.domain,
      })),
      checkins: checkins.map((c: DailyCheckin) => ({
        date: c.date.toISOString().split("T")[0],
        energy: c.energy,
        top1: c.top1,
      })),
      trainingSummary: {
        totalSessions: sessions.length,
        totalMinutes: sessions.reduce(
          (s: number, t: TrainingSession) => s + t.durationMinutes,
          0
        ),
      },
      nutritionAdherence: {
        daysLogged: nutritionLogs.length,
        proteinMet: nutritionLogs.filter((l: NutritionLog) => l.proteinMet)
          .length,
        waterMet: nutritionLogs.filter((l: NutritionLog) => l.waterMet).length,
      },
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: WeeklyReviewOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 5: Ironman Weekly Plan ────────────────────────────────
router.post("/p/:profileId/ironman/ai/weekly-plan", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "ironman_weekly_plan";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const plan = await prisma.ironmanPlan.findUnique({ where: { profileId } });
    if (!plan) {
      res.status(404).json({ error: "No ironman plan" });
      return;
    }

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const sessions = await prisma.trainingSession.findMany({
      where: { profileId, date: { gte: twoWeeksAgo } },
      orderBy: { date: "desc" },
    });

    const input = {
      plan: {
        phase: plan.phase,
        weeklyHoursTarget: plan.weeklyHoursTarget,
        targetEventDate: plan.targetEventDate?.toISOString(),
      },
      recentSessions: sessions.map((s: TrainingSession) => ({
        date: s.date.toISOString().split("T")[0],
        discipline: s.discipline,
        durationMinutes: s.durationMinutes,
        intensity: s.intensity,
      })),
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: IronmanWeeklyPlanOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 6: Nutrition Weekly Targets ───────────────────────────
router.post("/weeks/:weekId/ai/nutrition-targets", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "nutrition_weekly_targets";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const sessions = await prisma.trainingSession.findMany({
      where: { profileId, date: { gte: oneWeekAgo } },
    });

    const currentTarget = await prisma.nutritionTarget.findFirst({
      where: { profileId, weekId: req.params.weekId },
    });

    const input = {
      trainingLoad: {
        totalMinutes: sessions.reduce(
          (s: number, t: TrainingSession) => s + t.durationMinutes,
          0
        ),
        sessionCount: sessions.length,
        disciplines: [
          ...new Set(sessions.map((s: TrainingSession) => s.discipline)),
        ],
      },
      currentTargets: currentTarget
        ? {
            proteinG: currentTarget.proteinG,
            waterL: currentTarget.waterL,
            mealQualityRule: currentTarget.mealQualityRule,
          }
        : null,
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: NutritionTargetsOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Agent 7: Finance Monthly Budget ─────────────────────────────
router.post("/p/:profileId/finance/ai/monthly-budget", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const agentId = "finance_monthly_budget";

    if (!(await isAgentEnabled(profileId!, agentId))) {
      res.status(403).json({ error: "Agent disabled" });
      return;
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await prisma.transaction.findMany({
      where: { profileId, date: { gte: threeMonthsAgo } },
      include: { category: true },
    });

    const byMonth: Record<string, Record<string, number>> = {};
    for (const t of transactions) {
      const month = t.date.toISOString().slice(0, 7);
      if (!byMonth[month]) byMonth[month] = {};
      const cat = t.category?.name || "Uncategorized";
      byMonth[month][cat] = (byMonth[month][cat] || 0) + t.amount;
    }

    const input = {
      spendingSummary: byMonth,
      incomeEstimate: req.body.incomeEstimate || 0,
      savingsGoal: req.body.savingsGoal || 0,
    };

    const { provider, model } = await getProviderConfig(profileId!, agentId);
    const { result, aiRunId, cached } = await generateJSON({
      agentId,
      profileId: profileId!,
      promptVersion: loadVersion(agentId),
      systemPrompt: loadPrompt(agentId),
      userPrompt: JSON.stringify(input),
      input,
      schema: FinanceBudgetOutputSchema,
      providerOverride: provider,
      modelOverride: model,
    });

    res.json({ result, aiRunId, cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
});

// ─── Get last AI run result for any agent ────────────────────────
router.get("/ai/runs/latest/:agentId", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const run = await prisma.aiRun.findFirst({
    where: { profileId, agentId: req.params.agentId, status: "success" },
    orderBy: { createdAt: "desc" },
  });
  res.json(run);
});

export default router;
