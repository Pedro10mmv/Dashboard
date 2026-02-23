import { Router } from "express";
import {
  UpsertIronmanPlanSchema,
  CreateTrainingSessionSchema,
  UpdateTrainingSessionSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// ─── Ironman Plan ────────────────────────────────────────────────
router.get("/plan", async (req, res) => {
  const { profileId } = req as AuthRequest;
  let plan = await prisma.ironmanPlan.findUnique({ where: { profileId } });
  if (!plan) {
    plan = await prisma.ironmanPlan.create({ data: { profileId: profileId! } });
  }
  res.json(plan);
});

router.put("/plan", validate(UpsertIronmanPlanSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const data = { ...req.body };
  if (data.targetEventDate)
    data.targetEventDate = new Date(data.targetEventDate);
  const plan = await prisma.ironmanPlan.upsert({
    where: { profileId },
    create: { profileId: profileId!, ...data },
    update: data,
  });
  res.json(plan);
});

// ─── Training Sessions ──────────────────────────────────────────
router.get("/sessions", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const limit = parseInt(req.query.limit as string) || 50;
  const sessions = await prisma.trainingSession.findMany({
    where: { profileId },
    orderBy: { date: "desc" },
    take: limit,
  });
  res.json(sessions);
});

router.post(
  "/sessions",
  validate(CreateTrainingSessionSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const data = {
      ...req.body,
      profileId: profileId!,
      date: new Date(req.body.date),
    };
    const session = await prisma.trainingSession.create({ data });
    res.status(201).json(session);
  }
);

router.patch(
  "/sessions/:id",
  validate(UpdateTrainingSessionSchema),
  async (req, res) => {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const session = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data,
    });
    res.json(session);
  }
);

router.delete("/sessions/:id", async (req, res) => {
  await prisma.trainingSession.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Weekly Summary ──────────────────────────────────────────────
router.get("/weekly-summary", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const sessions = await prisma.trainingSession.findMany({
    where: {
      profileId,
      date: { gte: monday, lte: sunday },
    },
  });

  const summary = {
    swim: { count: 0, minutes: 0 },
    bike: { count: 0, minutes: 0 },
    run: { count: 0, minutes: 0 },
    strength: { count: 0, minutes: 0 },
    other: { count: 0, minutes: 0 },
    totalMinutes: 0,
    totalSessions: sessions.length,
    hasLongSession: false,
  };

  for (const s of sessions) {
    const key = ["swim", "bike", "run", "strength"].includes(s.discipline)
      ? (s.discipline as "swim" | "bike" | "run" | "strength")
      : "other";
    summary[key].count++;
    summary[key].minutes += s.durationMinutes;
    summary.totalMinutes += s.durationMinutes;
    if (["bike", "run"].includes(s.discipline) && s.durationMinutes >= 90) {
      summary.hasLongSession = true;
    }
  }

  res.json(summary);
});

export default router;
