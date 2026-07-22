import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(max).optional(),
  );

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional(),
);

const optionalDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(1).max(40),
  description: optionalString(280),
  occurredAt: z.string().datetime(),
  receiptStoragePath: optionalString(300),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(140),
  amount: z.coerce.number().positive(),
  billingCycle: z.enum(["weekly", "monthly", "yearly"]),
  category: z.string().trim().min(1).max(40).default("bills"),
  nextBillingDate: optionalDate,
  notes: optionalString(500),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const createBudgetSchema = z.object({
  category: z.string().trim().min(1).max(40),
  monthlyLimit: z.coerce.number().positive(),
});
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const createLoanSchema = z.object({
  name: z.string().trim().min(1).max(140),
  principalAmount: z.coerce.number().positive(),
  remainingBalance: z.coerce.number().min(0),
  interestRatePct: optionalNumber,
  monthlyPayment: optionalNumber,
  startDate: optionalDate,
  notes: optionalString(500),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export const createAssetSchema = z.object({
  name: z.string().trim().min(1).max(140),
  assetType: z.enum(["investment", "savings", "property", "other"]),
  currentValue: z.coerce.number().min(0),
  notes: optionalString(500),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateFinanceSettingsSchema = z.object({
  currency: z.string().trim().min(1).max(10),
  monthlyIncomeEstimate: optionalNumber,
});
export type UpdateFinanceSettingsInput = z.infer<typeof updateFinanceSettingsSchema>;
