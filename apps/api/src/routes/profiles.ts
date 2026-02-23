import { Router } from "express";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  ProfileAgentSettingSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// List profiles for user
router.get("/", async (req, res) => {
  const { userId } = req as AuthRequest;
  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  res.json(profiles);
});

// Create profile
router.post("/", validate(CreateProfileSchema), async (req, res) => {
  const { userId } = req as AuthRequest;
  const profile = await prisma.profile.create({
    data: { ...req.body, userId },
  });
  res.status(201).json(profile);
});

// Get profile
router.get("/:profileId", async (req, res) => {
  const { userId } = req as AuthRequest;
  const profile = await prisma.profile.findFirst({
    where: { id: req.params.profileId, userId },
    include: { agentSettings: true },
  });
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

// Update profile
router.patch("/:profileId", validate(UpdateProfileSchema), async (req, res) => {
  const { userId } = req as AuthRequest;
  const existing = await prisma.profile.findFirst({
    where: { id: req.params.profileId, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const profile = await prisma.profile.update({
    where: { id: req.params.profileId },
    data: req.body,
  });
  res.json(profile);
});

// Delete profile
router.delete("/:profileId", async (req, res) => {
  const { userId } = req as AuthRequest;
  const existing = await prisma.profile.findFirst({
    where: { id: req.params.profileId, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  await prisma.profile.delete({ where: { id: req.params.profileId } });
  res.status(204).send();
});

// ─── Agent Settings ──────────────────────────────────────────────
router.get("/:profileId/agent-settings", async (req, res) => {
  const settings = await prisma.profileAgentSetting.findMany({
    where: { profileId: req.params.profileId },
  });
  res.json(settings);
});

router.put(
  "/:profileId/agent-settings",
  validate(z.object({ settings: z.array(ProfileAgentSettingSchema) })),
  async (req, res) => {
    const { profileId } = req.params;
    const { settings } = req.body as {
      settings: Array<{
        agentId: string;
        enabled: boolean;
        provider?: string;
        model?: string;
      }>;
    };

    const results = await Promise.all(
      settings.map((s) =>
        prisma.profileAgentSetting.upsert({
          where: {
            profileId_agentId: { profileId: profileId!, agentId: s.agentId },
          },
          create: { profileId: profileId!, ...s },
          update: s,
        })
      )
    );
    res.json(results);
  }
);

export default router;
