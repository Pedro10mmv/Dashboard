import { Router } from "express";
import {
  StudioPlanSchema,
  CreateInitiativeSchema,
  UpdateInitiativeSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  CreateIdeaSchema,
  UpdateIdeaSchema,
  CreateRiskSchema,
  UpdateRiskSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// ─── Studio Plan ─────────────────────────────────────────────────
router.get("/plan", async (req, res) => {
  const { profileId } = req as AuthRequest;
  let plan = await prisma.studioPlan.findUnique({ where: { profileId } });
  if (!plan) {
    plan = await prisma.studioPlan.create({ data: { profileId: profileId! } });
  }
  res.json(plan);
});

router.put("/plan", validate(StudioPlanSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const plan = await prisma.studioPlan.upsert({
    where: { profileId },
    create: { profileId: profileId!, ...req.body },
    update: req.body,
  });
  res.json(plan);
});

// ─── Initiatives ─────────────────────────────────────────────────
router.get("/initiatives", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const initiatives = await prisma.initiative.findMany({
    where: { profileId },
    include: { milestones: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(initiatives);
});

router.post(
  "/initiatives",
  validate(CreateInitiativeSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const data = { ...req.body, profileId };
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    const initiative = await prisma.initiative.create({ data });
    res.status(201).json(initiative);
  }
);

router.get("/initiatives/:id", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const initiative = await prisma.initiative.findFirst({
    where: { id: req.params.id, profileId },
    include: { milestones: { orderBy: { sortOrder: "asc" } } },
  });
  if (!initiative) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(initiative);
});

router.patch(
  "/initiatives/:id",
  validate(UpdateInitiativeSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const existing = await prisma.initiative.findFirst({
      where: { id: req.params.id, profileId },
    });
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const data = { ...req.body };
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    const initiative = await prisma.initiative.update({
      where: { id: req.params.id },
      data,
    });
    res.json(initiative);
  }
);

router.delete("/initiatives/:id", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const existing = await prisma.initiative.findFirst({
    where: { id: req.params.id, profileId },
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.initiative.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Milestones ──────────────────────────────────────────────────
router.get("/initiatives/:id/milestones", async (req, res) => {
  const milestones = await prisma.milestone.findMany({
    where: { initiativeId: req.params.id },
    orderBy: { sortOrder: "asc" },
  });
  res.json(milestones);
});

router.post(
  "/initiatives/:id/milestones",
  validate(CreateMilestoneSchema),
  async (req, res) => {
    const milestone = await prisma.milestone.create({
      data: { ...req.body, initiativeId: req.params.id },
    });
    res.status(201).json(milestone);
  }
);

router.patch(
  "/milestones/:milestoneId",
  validate(UpdateMilestoneSchema),
  async (req, res) => {
    const milestone = await prisma.milestone.update({
      where: { id: req.params.milestoneId },
      data: req.body,
    });
    res.json(milestone);
  }
);

router.delete("/milestones/:milestoneId", async (req, res) => {
  await prisma.milestone.delete({ where: { id: req.params.milestoneId } });
  res.status(204).send();
});

// ─── Ideas ───────────────────────────────────────────────────────
router.get("/ideas", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const ideas = await prisma.idea.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
  res.json(ideas);
});

router.post("/ideas", validate(CreateIdeaSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const idea = await prisma.idea.create({
    data: { ...req.body, profileId: profileId! },
  });
  res.status(201).json(idea);
});

router.patch("/ideas/:id", validate(UpdateIdeaSchema), async (req, res) => {
  const idea = await prisma.idea.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(idea);
});

router.delete("/ideas/:id", async (req, res) => {
  await prisma.idea.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Risks ───────────────────────────────────────────────────────
router.get("/risks", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const risks = await prisma.risk.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
  res.json(risks);
});

router.post("/risks", validate(CreateRiskSchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const risk = await prisma.risk.create({
    data: { ...req.body, profileId: profileId! },
  });
  res.status(201).json(risk);
});

router.patch("/risks/:id", validate(UpdateRiskSchema), async (req, res) => {
  const risk = await prisma.risk.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(risk);
});

router.delete("/risks/:id", async (req, res) => {
  await prisma.risk.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
