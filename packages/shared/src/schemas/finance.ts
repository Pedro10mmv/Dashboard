import { z } from "zod";

// ─── Category ────────────────────────────────────────────────────
export const CategoryTypeEnum = z.enum([
  "income",
  "expense",
  "savings",
  "investment",
]);

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: CategoryTypeEnum,
  icon: z.string().max(10).optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// ─── Transaction ─────────────────────────────────────────────────
export const CreateTransactionSchema = z.object({
  date: z.string(),
  amount: z.number(), // positive = income, negative = expense
  categoryId: z.string().optional(),
  merchant: z.string().max(200).optional(),
  notes: z.string().optional(),
  currency: z.string().max(3).default("EUR"),
});
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// ─── Monthly Budget ──────────────────────────────────────────────
export const CreateMonthlyBudgetSchema = z.object({
  month: z.string(), // YYYY-MM-01
  incomeTarget: z.number().default(0),
  savingsTarget: z.number().default(0),
});
export type CreateMonthlyBudgetInput = z.infer<
  typeof CreateMonthlyBudgetSchema
>;

export const BudgetItemSchema = z.object({
  categoryId: z.string(),
  plannedAmount: z.number(),
});
export type BudgetItemInput = z.infer<typeof BudgetItemSchema>;

export const UpsertBudgetItemsSchema = z.object({
  items: z.array(BudgetItemSchema),
});
export type UpsertBudgetItemsInput = z.infer<typeof UpsertBudgetItemsSchema>;
