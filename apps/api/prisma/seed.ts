import { PrismaClient } from "../src/generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.aiRun.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.monthlyBudget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.financeCategory.deleteMany();
  await prisma.nutritionLog.deleteMany();
  await prisma.nutritionTarget.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.ironmanPlan.deleteMany();
  await prisma.dailyCheckin.deleteMany();
  await prisma.weekOutcome.deleteMany();
  await prisma.week.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.initiative.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.studioPlan.deleteMany();
  await prisma.profileAgentSetting.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const password = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@productivityos.dev",
      password,
      name: "Demo User",
    },
  });

  // Create profiles
  const profile1 = await prisma.profile.create({
    data: {
      userId: user.id,
      name: "Me",
      timezone: "Europe/Berlin",
      morningCheckinTime: "07:00",
      domainsEnabled: ["studio", "ironman", "nutrition", "finance"],
      strictness: 3,
      tone: "supportive",
      weeklyOutcomeLimit: 3,
    },
  });

  const profile2 = await prisma.profile.create({
    data: {
      userId: user.id,
      name: "GF",
      timezone: "Europe/Berlin",
      morningCheckinTime: "08:00",
      domainsEnabled: ["nutrition", "finance"],
      strictness: 2,
      tone: "supportive",
      weeklyOutcomeLimit: 3,
    },
  });

  // Studio Plan for profile1
  await prisma.studioPlan.create({
    data: {
      profileId: profile1.id,
      mission:
        "Build a profitable indie game studio that ships meaningful games within 10 years",
      definitionOfSuccess:
        "Ship 3 games, reach $1M total revenue, build a team of 5",
      values:
        "Quality over quantity. Ship early, iterate fast. Player-first design.",
      positioning: "Story-driven indie games with unique art direction",
      businessAssumptions: "Can bootstrap for 2 years. Need revenue by year 3.",
      notNowList: "VR games. Multiplayer-first. Mobile ports.",
    },
  });

  // Initiatives
  const initiative1 = await prisma.initiative.create({
    data: {
      profileId: profile1.id,
      title: "Game Prototype Alpha",
      description: "Build the first playable prototype of our debut game",
      status: "active",
      quarterTag: "Q1-2026",
      targetDate: new Date("2026-06-30"),
    },
  });

  const initiative2 = await prisma.initiative.create({
    data: {
      profileId: profile1.id,
      title: "Studio Brand & Website",
      description: "Create the studio brand identity and launch website",
      status: "planned",
      quarterTag: "Q2-2026",
    },
  });

  // Milestones
  await prisma.milestone.createMany({
    data: [
      {
        initiativeId: initiative1.id,
        title: "Core gameplay loop defined",
        done: true,
        sortOrder: 0,
      },
      {
        initiativeId: initiative1.id,
        title: "Art direction document",
        done: false,
        sortOrder: 1,
      },
      {
        initiativeId: initiative1.id,
        title: "First playable build",
        done: false,
        sortOrder: 2,
      },
      {
        initiativeId: initiative2.id,
        title: "Logo design",
        done: false,
        sortOrder: 0,
      },
      {
        initiativeId: initiative2.id,
        title: "Website v1 live",
        done: false,
        sortOrder: 1,
      },
    ],
  });

  // Ideas
  await prisma.idea.createMany({
    data: [
      {
        profileId: profile1.id,
        title: "Use procedural generation for levels",
        status: "evaluating",
      },
      {
        profileId: profile1.id,
        title: "Partner with a pixel artist on Fiverr",
        status: "inbox",
      },
      {
        profileId: profile1.id,
        title: "Apply to indie game festival Q3",
        status: "accepted",
      },
    ],
  });

  // Risks
  await prisma.risk.createMany({
    data: [
      {
        profileId: profile1.id,
        title: "Burnout from day job + studio",
        likelihood: 4,
        impact: 5,
        mitigation: "Strict time boundaries, weekly energy check",
        status: "open",
      },
      {
        profileId: profile1.id,
        title: "Scope creep on prototype",
        likelihood: 3,
        impact: 4,
        mitigation: "Feature freeze date, not-now list",
        status: "open",
      },
    ],
  });

  // Current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const week = await prisma.week.create({
    data: {
      profileId: profile1.id,
      weekStartDate: monday,
    },
  });

  // Week outcomes
  await prisma.weekOutcome.createMany({
    data: [
      {
        weekId: week.id,
        domain: "studio",
        title: "Complete art direction document for prototype",
        definitionOfDone:
          "PDF with mood board, color palette, and 3 concept sketches reviewed",
        priority: 1,
        timeBudgetMinutes: 480,
        status: "in_progress",
        initiativeId: initiative1.id,
      },
      {
        weekId: week.id,
        domain: "studio",
        title: "Write game design one-pager",
        definitionOfDone:
          "1-page doc: core loop, target audience, USP, art direction summary",
        priority: 2,
        timeBudgetMinutes: 120,
        status: "not_started",
        initiativeId: initiative1.id,
      },
      {
        weekId: week.id,
        domain: "ironman",
        title: "Complete 3 endurance sessions",
        definitionOfDone: "1 swim + 1 bike + 1 run minimum",
        priority: 2,
        timeBudgetMinutes: 240,
        status: "in_progress",
      },
    ],
  });

  // Ironman plan
  await prisma.ironmanPlan.create({
    data: {
      profileId: profile1.id,
      targetEventName: "Ironman 2027",
      targetEventDate: new Date("2027-07-06"),
      phase: "base",
      weeklyHoursTarget: 8,
    },
  });

  // Training sessions
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  await prisma.trainingSession.createMany({
    data: [
      {
        profileId: profile1.id,
        date: twoDaysAgo,
        discipline: "swim",
        sessionType: "Endurance",
        durationMinutes: 45,
        intensity: "moderate",
      },
      {
        profileId: profile1.id,
        date: yesterday,
        discipline: "run",
        sessionType: "Easy run",
        durationMinutes: 40,
        intensity: "easy",
      },
      {
        profileId: profile1.id,
        date: yesterday,
        discipline: "strength",
        sessionType: "Upper body",
        durationMinutes: 30,
        intensity: "moderate",
      },
    ],
  });

  // Nutrition target
  await prisma.nutritionTarget.create({
    data: {
      profileId: profile1.id,
      weekId: week.id,
      proteinG: 150,
      waterL: 3,
      mealQualityRule: "2 high-quality meals/day",
    },
  });

  // Nutrition log
  await prisma.nutritionLog.create({
    data: {
      profileId: profile1.id,
      date: yesterday,
      proteinMet: true,
      waterMet: false,
      mealQualityMet: true,
      notes: "Forgot water bottle at home",
    },
  });

  // Finance categories
  const catSalary = await prisma.financeCategory.create({
    data: { profileId: profile1.id, name: "Salary", type: "income" },
  });
  const catRent = await prisma.financeCategory.create({
    data: { profileId: profile1.id, name: "Rent", type: "expense" },
  });
  const catGroceries = await prisma.financeCategory.create({
    data: { profileId: profile1.id, name: "Groceries", type: "expense" },
  });
  const catSavings = await prisma.financeCategory.create({
    data: { profileId: profile1.id, name: "Emergency Fund", type: "savings" },
  });

  // Monthly budget
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const budget = await prisma.monthlyBudget.create({
    data: {
      profileId: profile1.id,
      month: monthStart,
      incomeTarget: 4500,
      savingsTarget: 500,
    },
  });

  await prisma.budgetItem.createMany({
    data: [
      {
        monthlyBudgetId: budget.id,
        categoryId: catRent.id,
        plannedAmount: 1200,
      },
      {
        monthlyBudgetId: budget.id,
        categoryId: catGroceries.id,
        plannedAmount: 400,
      },
      {
        monthlyBudgetId: budget.id,
        categoryId: catSavings.id,
        plannedAmount: 500,
      },
    ],
  });

  // Transactions
  await prisma.transaction.createMany({
    data: [
      {
        profileId: profile1.id,
        date: new Date(today.getFullYear(), today.getMonth(), 1),
        amount: 4500,
        categoryId: catSalary.id,
        notes: "Monthly salary",
        currency: "EUR",
      },
      {
        profileId: profile1.id,
        date: new Date(today.getFullYear(), today.getMonth(), 3),
        amount: -1200,
        categoryId: catRent.id,
        notes: "Monthly rent",
        currency: "EUR",
      },
      {
        profileId: profile1.id,
        date: new Date(today.getFullYear(), today.getMonth(), 5),
        amount: -85,
        categoryId: catGroceries.id,
        merchant: "Rewe",
        currency: "EUR",
      },
      {
        profileId: profile1.id,
        date: new Date(today.getFullYear(), today.getMonth(), 8),
        amount: -62,
        categoryId: catGroceries.id,
        merchant: "Edeka",
        currency: "EUR",
      },
      {
        profileId: profile1.id,
        date: new Date(today.getFullYear(), today.getMonth(), 10),
        amount: -500,
        categoryId: catSavings.id,
        notes: "Transfer to savings",
        currency: "EUR",
      },
    ],
  });

  // Daily check-in (yesterday)
  await prisma.dailyCheckin.create({
    data: {
      profileId: profile1.id,
      date: yesterday,
      top1: "Work on art direction mood board",
      secondary1: "Quick swim session",
      energy: 7,
      sleepHours: 7.5,
      trainingPlanned: true,
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Email: demo@productivityos.dev`);
  console.log(`   Password: password123`);
  console.log(`   Profile 1: ${profile1.id} (Me)`);
  console.log(`   Profile 2: ${profile2.id} (GF)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
