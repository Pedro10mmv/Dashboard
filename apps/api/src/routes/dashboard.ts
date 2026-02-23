import { Router } from "express";
import type {
  WeekOutcome,
  TrainingSession,
  Transaction,
  BudgetItem,
} from "../generated/client";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

const router = Router({ mergeParams: true });

router.get("/dashboard", async (req, res) => {
  try {
    const { profileId } = req as AuthRequest;
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // 1. Today's check-in
    const todayCheckin = await prisma.dailyCheckin.findUnique({
      where: { profileId_date: { profileId: profileId!, date: today } },
    });

    // 2. Latest daily_focus AI run
    const dailyFocusRun = await prisma.aiRun.findFirst({
      where: { profileId, agentId: "daily_focus", status: "success" },
      orderBy: { createdAt: "desc" },
    });

    // 3. Current week + outcomes
    const week = await prisma.week.findUnique({
      where: {
        profileId_weekStartDate: {
          profileId: profileId!,
          weekStartDate: monday,
        },
      },
      include: {
        outcomes: {
          orderBy: { priority: "asc" },
          include: { initiative: true },
        },
        nutritionTargets: true,
      },
    });

    // 4. Studio outcomes overview
    const studioOutcomes =
      week?.outcomes.filter((o: WeekOutcome) => o.domain === "studio") || [];

    // 5. Training today + weekly summary
    const todaySessions = await prisma.trainingSession.findMany({
      where: { profileId, date: today },
    });

    const weekSessions = await prisma.trainingSession.findMany({
      where: { profileId, date: { gte: monday, lte: sunday } },
    });

    const enduranceSummary = {
      swim: weekSessions.filter((s: TrainingSession) => s.discipline === "swim")
        .length,
      bike: weekSessions.filter((s: TrainingSession) => s.discipline === "bike")
        .length,
      run: weekSessions.filter((s: TrainingSession) => s.discipline === "run")
        .length,
      totalMinutes: weekSessions.reduce(
        (acc: number, s: TrainingSession) => acc + s.durationMinutes,
        0
      ),
      hasLongSession: weekSessions.some(
        (s: TrainingSession) =>
          ["bike", "run"].includes(s.discipline) && s.durationMinutes >= 90
      ),
    };

    // 6. Nutrition today
    const nutritionToday = await prisma.nutritionLog.findUnique({
      where: { profileId_date: { profileId: profileId!, date: today } },
    });

    // 7. Finance month health
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const monthBudget = await prisma.monthlyBudget.findUnique({
      where: { profileId_month: { profileId: profileId!, month: monthStart } },
      include: { budgetItems: { include: { category: true } } },
    });

    const monthTransactions = await prisma.transaction.findMany({
      where: { profileId, date: { gte: monthStart, lt: monthEnd } },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of monthTransactions) {
      if (t.amount > 0) totalIncome += t.amount;
      else totalExpense += Math.abs(t.amount);
    }

    // 8. Alerts
    const alerts: Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "error";
    }> = [];

    // Alert: No check-in today by +2h after checkin time
    if (!todayCheckin) {
      const [hours, minutes] = (profile.morningCheckinTime || "07:00")
        .split(":")
        .map(Number);
      const checkinDeadline = new Date(today);
      checkinDeadline.setHours((hours || 0) + 2, minutes || 0, 0, 0);
      if (new Date() > checkinDeadline) {
        alerts.push({
          type: "no_checkin",
          message: "No check-in today – you're past your morning deadline",
          severity: "warning",
        });
      }
    }

    // Alert: Outcomes exceed limit
    if (week && week.outcomes.length > profile.weeklyOutcomeLimit) {
      alerts.push({
        type: "outcomes_over_limit",
        message: `You have ${week.outcomes.length} outcomes this week (limit: ${profile.weeklyOutcomeLimit})`,
        severity: "warning",
      });
    }

    // Alert: Ironman enabled but no endurance sessions in 7 days
    if (profile.domainsEnabled.includes("ironman")) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentEndurance = await prisma.trainingSession.count({
        where: {
          profileId,
          date: { gte: sevenDaysAgo },
          discipline: { in: ["swim", "bike", "run"] },
        },
      });
      if (recentEndurance === 0) {
        alerts.push({
          type: "no_endurance",
          message: "No swim/bike/run sessions logged in the last 7 days",
          severity: "error",
        });
      }
    }

    // Alert: Nutrition target exists but no log today
    if (profile.domainsEnabled.includes("nutrition")) {
      const hasTarget =
        week?.nutritionTargets && week.nutritionTargets.length > 0;
      if (hasTarget && !nutritionToday) {
        alerts.push({
          type: "no_nutrition_log",
          message: "Nutrition target set but no log for today",
          severity: "info",
        });
      }
    }

    // Alert: Uncategorized transactions > 5
    if (profile.domainsEnabled.includes("finance")) {
      const uncategorized = monthTransactions.filter(
        (t: Transaction) => !t.categoryId
      ).length;
      if (uncategorized > 5) {
        alerts.push({
          type: "uncategorized_transactions",
          message: `${uncategorized} uncategorized transactions this month`,
          severity: "warning",
        });
      }
    }

    res.json({
      profile,
      todayCheckin,
      dailyFocusResult: dailyFocusRun?.resultJson || null,
      dailyFocusRunAt: dailyFocusRun?.createdAt || null,
      week,
      studioOutcomes,
      todaySessions,
      enduranceSummary,
      nutritionToday,
      finance: {
        budget: monthBudget,
        totalIncome,
        totalExpense,
        plannedExpense:
          monthBudget?.budgetItems.reduce(
            (s: number, i: BudgetItem) => s + i.plannedAmount,
            0
          ) || 0,
      },
      alerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

export default router;
