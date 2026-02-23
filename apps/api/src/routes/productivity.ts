import { Router } from "express";
import {
  CreateWeekSchema,
  CreateOutcomeSchema,
  UpdateOutcomeSchema,
  CreateCheckinSchema,
  UpdateCheckinSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// ─── Weeks ───────────────────────────────────────────────────────
router.get("/weeks", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const weeks = await prisma.week.findMany({
    where: { profileId },
    include: {
      outcomes: { orderBy: { priority: "asc" } },
      nutritionTargets: true,
    },
    orderBy: { weekStartDate: "desc" },
  });
  res.json(weeks);
});

router.post("/weeks", validate(CreateWeekSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const weekStartDate = new Date(req.body.weekStartDate);
  const existing = await prisma.week.findUnique({
    where: {
      profileId_weekStartDate: { profileId: profileId!, weekStartDate },
    },
  });
  if (existing) {
    res.status(409).json({ error: "Week already exists", week: existing });
    return;
  }
  const week = await prisma.week.create({
    data: { profileId: profileId!, weekStartDate },
    include: { outcomes: true },
  });
  res.status(201).json(week);
});

router.get("/weeks/current", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  let week = await prisma.week.findUnique({
    where: {
      profileId_weekStartDate: { profileId: profileId!, weekStartDate: monday },
    },
    include: {
      outcomes: {
        orderBy: { priority: "asc" },
        include: { initiative: true, milestone: true },
      },
      nutritionTargets: true,
    },
  });

  if (!week) {
    week = await prisma.week.create({
      data: { profileId: profileId!, weekStartDate: monday },
      include: {
        outcomes: {
          orderBy: { priority: "asc" },
          include: { initiative: true, milestone: true },
        },
        nutritionTargets: true,
      },
    });
  }
  res.json(week);
});

router.get("/weeks/:weekId", async (req, res) => {
  const week = await prisma.week.findUnique({
    where: { id: req.params.weekId },
    include: {
      outcomes: {
        orderBy: { priority: "asc" },
        include: { initiative: true, milestone: true },
      },
      nutritionTargets: true,
    },
  });
  if (!week) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(week);
});

// ─── Outcomes ────────────────────────────────────────────────────
router.post(
  "/weeks/:weekId/outcomes",
  validate(CreateOutcomeSchema),
  async (req, res) => {
    const outcome = await prisma.weekOutcome.create({
      data: { ...req.body, weekId: req.params.weekId },
    });
    res.status(201).json(outcome);
  }
);

router.patch(
  "/outcomes/:outcomeId",
  validate(UpdateOutcomeSchema),
  async (req, res) => {
    const outcome = await prisma.weekOutcome.update({
      where: { id: req.params.outcomeId },
      data: req.body,
    });
    res.json(outcome);
  }
);

router.delete("/outcomes/:outcomeId", async (req, res) => {
  await prisma.weekOutcome.delete({ where: { id: req.params.outcomeId } });
  res.status(204).send();
});

// ─── Daily Check-ins ─────────────────────────────────────────────
router.get("/checkins", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const limit = parseInt(req.query.limit as string) || 7;
  const checkins = await prisma.dailyCheckin.findMany({
    where: { profileId },
    orderBy: { date: "desc" },
    take: limit,
  });
  res.json(checkins);
});

router.post("/checkins", validate(CreateCheckinSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const date = new Date(req.body.date);
  const existing = await prisma.dailyCheckin.findUnique({
    where: { profileId_date: { profileId: profileId!, date } },
  });
  if (existing) {
    const updated = await prisma.dailyCheckin.update({
      where: { id: existing.id },
      data: { ...req.body, date },
    });
    res.json(updated);
    return;
  }
  const checkin = await prisma.dailyCheckin.create({
    data: { ...req.body, profileId: profileId!, date },
  });
  res.status(201).json(checkin);
});

router.get("/checkins/today", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = await prisma.dailyCheckin.findUnique({
    where: { profileId_date: { profileId: profileId!, date: today } },
  });
  res.json(checkin);
});

router.get("/checkins/:id", async (req, res) => {
  const checkin = await prisma.dailyCheckin.findUnique({
    where: { id: req.params.id },
  });
  if (!checkin) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(checkin);
});

router.patch(
  "/checkins/:id",
  validate(UpdateCheckinSchema),
  async (req, res) => {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const checkin = await prisma.dailyCheckin.update({
      where: { id: req.params.id },
      data,
    });
    res.json(checkin);
  }
);

export default router;
