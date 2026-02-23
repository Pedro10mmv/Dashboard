import { Router } from "express";
import type { Transaction } from "../generated/client";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  CreateMonthlyBudgetSchema,
  UpsertBudgetItemsSchema,
} from "@pos/shared";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// ─── Categories ──────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const categories = await prisma.financeCategory.findMany({
    where: { profileId },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

router.post("/categories", validate(CreateCategorySchema), async (req, res) => {
  const { profileId } = req as AuthRequest;
  const category = await prisma.financeCategory.create({
    data: { ...req.body, profileId: profileId! },
  });
  res.status(201).json(category);
});

router.patch(
  "/categories/:id",
  validate(UpdateCategorySchema),
  async (req, res) => {
    const category = await prisma.financeCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(category);
  }
);

router.delete("/categories/:id", async (req, res) => {
  await prisma.financeCategory.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Transactions ────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const month = req.query.month as string; // YYYY-MM
  const where: Record<string, unknown> = { profileId };
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.date = { gte: start, lt: end };
  }
  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  res.json(transactions);
});

router.post(
  "/transactions",
  validate(CreateTransactionSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const transaction = await prisma.transaction.create({
      data: {
        ...req.body,
        profileId: profileId!,
        date: new Date(req.body.date),
      },
      include: { category: true },
    });
    res.status(201).json(transaction);
  }
);

router.patch(
  "/transactions/:id",
  validate(UpdateTransactionSchema),
  async (req, res) => {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(transaction);
  }
);

router.delete("/transactions/:id", async (req, res) => {
  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Monthly Budgets ─────────────────────────────────────────────
router.get("/budgets", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const budgets = await prisma.monthlyBudget.findMany({
    where: { profileId },
    include: { budgetItems: { include: { category: true } } },
    orderBy: { month: "desc" },
  });
  res.json(budgets);
});

router.get("/budgets/current", async (req, res) => {
  const { profileId } = req as AuthRequest;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let budget = await prisma.monthlyBudget.findUnique({
    where: { profileId_month: { profileId: profileId!, month: monthStart } },
    include: { budgetItems: { include: { category: true } } },
  });
  if (!budget) {
    budget = await prisma.monthlyBudget.create({
      data: { profileId: profileId!, month: monthStart },
      include: { budgetItems: { include: { category: true } } },
    });
  }

  // Also get actual spending
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const transactions = await prisma.transaction.findMany({
    where: {
      profileId,
      date: { gte: monthStart, lt: monthEnd },
    },
    include: { category: true },
  });

  const actualByCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.amount > 0) totalIncome += t.amount;
    else totalExpense += Math.abs(t.amount);
    if (t.categoryId) {
      actualByCategory[t.categoryId] =
        (actualByCategory[t.categoryId] || 0) + t.amount;
    }
  }

  res.json({
    budget,
    actualByCategory,
    totalIncome,
    totalExpense,
    uncategorizedCount: transactions.filter((t: Transaction) => !t.categoryId)
      .length,
  });
});

router.post(
  "/budgets",
  validate(CreateMonthlyBudgetSchema),
  async (req, res) => {
    const { profileId } = req as AuthRequest;
    const month = new Date(req.body.month);
    const budget = await prisma.monthlyBudget.upsert({
      where: { profileId_month: { profileId: profileId!, month } },
      create: { ...req.body, profileId: profileId!, month },
      update: {
        incomeTarget: req.body.incomeTarget,
        savingsTarget: req.body.savingsTarget,
      },
      include: { budgetItems: { include: { category: true } } },
    });
    res.json(budget);
  }
);

router.put(
  "/budgets/:budgetId/items",
  validate(UpsertBudgetItemsSchema),
  async (req, res) => {
    const { budgetId } = req.params;
    const { items } = req.body as {
      items: Array<{ categoryId: string; plannedAmount: number }>;
    };

    await prisma.budgetItem.deleteMany({
      where: { monthlyBudgetId: budgetId },
    });
    const created = await Promise.all(
      items.map((item) =>
        prisma.budgetItem.create({
          data: { monthlyBudgetId: budgetId!, ...item },
          include: { category: true },
        })
      )
    );
    res.json(created);
  }
);

export default router;
