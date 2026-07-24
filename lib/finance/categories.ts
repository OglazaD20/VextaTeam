export const EXPENSE_CATEGORIES = [
  "food",
  "shopping",
  "fuel",
  "transport",
  "entertainment",
  "health",
  "education",
  "travel",
  "business",
  "bills",
  "custom",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_CATEGORIES = ["salary", "freelance", "gift", "investment", "other"] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  food: "Food",
  shopping: "Shopping",
  fuel: "Fuel",
  transport: "Transport",
  entertainment: "Entertainment",
  health: "Health",
  education: "Education",
  travel: "Travel",
  business: "Business",
  bills: "Bills",
  custom: "Custom",
};

export const EXPENSE_CATEGORY_ICON: Record<ExpenseCategory, string> = {
  food: "🍽️",
  shopping: "🛍️",
  fuel: "⛽",
  transport: "🚌",
  entertainment: "🎬",
  health: "🩺",
  education: "🎓",
  travel: "✈️",
  business: "💼",
  bills: "🧾",
  custom: "📦",
};

export const INCOME_CATEGORY_LABEL: Record<IncomeCategory, string> = {
  salary: "Salary",
  freelance: "Freelance",
  gift: "Gift",
  investment: "Investment",
  other: "Other",
};
