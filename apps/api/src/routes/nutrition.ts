import { Router } from "express";
import {
  UpsertNutritionTargetSchema,
  CreateNutritionLogSchema,
  UpdateNutritionLogSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// ─── Nutrition Targets ───────────────────────────────────────────
router.get("/targets", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const weekId = req.query.weekId as string;
  if (weekId) {
    const target = await prisma.nutritionTarget.findUnique({
      where: { profileId_weekId: { profileId: profileId!, weekId } },
    });
    res.json(target);
  } else {
    const targets = await prisma.nutritionTarget.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    res.json(targets);
  }
});

router.put(
  "/targets/:weekId",
  validate(UpsertNutritionTargetSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const { weekId } = req.params;
    const target = await prisma.nutritionTarget.upsert({
      where: { profileId_weekId: { profileId: profileId!, weekId: weekId! } },
      create: { profileId: profileId!, weekId: weekId!, ...req.body },
      update: req.body,
    });
    res.json(target);
  }
);

// ─── Nutrition Logs ──────────────────────────────────────────────
router.get("/logs", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const limit = parseInt(req.query.limit as string) || 7;
  const logs = await prisma.nutritionLog.findMany({
    where: { profileId },
    orderBy: { date: "desc" },
    take: limit,
  });
  res.json(logs);
});

router.post("/logs", validate(CreateNutritionLogSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const date = new Date(req.body.date);
  const existing = await prisma.nutritionLog.findUnique({
    where: { profileId_date: { profileId: profileId!, date } },
  });
  if (existing) {
    const updated = await prisma.nutritionLog.update({
      where: { id: existing.id },
      data: { ...req.body, date },
    });
    res.json(updated);
    return;
  }
  const log = await prisma.nutritionLog.create({
    data: { ...req.body, profileId: profileId!, date },
  });
  res.status(201).json(log);
});

router.get("/logs/today", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const log = await prisma.nutritionLog.findUnique({
    where: { profileId_date: { profileId: profileId!, date: today } },
  });
  res.json(log);
});

router.patch(
  "/logs/:id",
  validate(UpdateNutritionLogSchema),
  async (req, res) => {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const log = await prisma.nutritionLog.update({
      where: { id: req.params.id },
      data,
    });
    res.json(log);
  }
);

export default router;
