import { Account } from "../models/Account";
import { Category } from "../models/Category";

export const defaultCategories = [
  { categoryName: "Salary", type: "income", slug: "salary", icon: "Briefcase", color: "#0F766E" },
  { categoryName: "Freelance", type: "income", slug: "freelance", icon: "Laptop", color: "#0D9488" },
  { categoryName: "Business", type: "income", slug: "business", icon: "Building2", color: "#0891B2" },
  { categoryName: "Investments", type: "income", slug: "investments", icon: "TrendingUp", color: "#2563EB" },
  { categoryName: "Rental income", type: "income", slug: "rental-income", icon: "House", color: "#4F46E5" },
  { categoryName: "Gifts", type: "income", slug: "gifts", icon: "Gift", color: "#7C3AED" },
  { categoryName: "Refunds", type: "income", slug: "refunds", icon: "RotateCcw", color: "#059669" },
  { categoryName: "Other income", type: "income", slug: "other-income", icon: "CircleDollarSign", color: "#64748B" },
  { categoryName: "Food & dining", type: "expense", slug: "food-dining", icon: "Utensils", color: "#EA580C" },
  { categoryName: "Groceries", type: "expense", slug: "groceries", icon: "ShoppingBasket", color: "#65A30D" },
  { categoryName: "Transport", type: "expense", slug: "transport", icon: "Car", color: "#0284C7" },
  { categoryName: "Fuel", type: "expense", slug: "fuel", icon: "Fuel", color: "#475569" },
  { categoryName: "Vehicle maintenance", type: "expense", slug: "vehicle-maintenance", icon: "Wrench", color: "#0F766E" },
  { categoryName: "Housing", type: "expense", slug: "housing", icon: "House", color: "#7C3AED" },
  { categoryName: "Rent", type: "expense", slug: "rent", icon: "KeyRound", color: "#9333EA" },
  { categoryName: "Utilities", type: "expense", slug: "utilities", icon: "Bolt", color: "#CA8A04" },
  { categoryName: "Internet & phone", type: "expense", slug: "internet-phone", icon: "Wifi", color: "#2563EB" },
  { categoryName: "Shopping", type: "expense", slug: "shopping", icon: "ShoppingBag", color: "#DB2777" },
  { categoryName: "Health", type: "expense", slug: "health", icon: "HeartPulse", color: "#DC2626" },
  { categoryName: "Insurance", type: "expense", slug: "insurance", icon: "ShieldCheck", color: "#0F766E" },
  { categoryName: "Education", type: "expense", slug: "education", icon: "GraduationCap", color: "#4F46E5" },
  { categoryName: "Entertainment", type: "expense", slug: "entertainment", icon: "Clapperboard", color: "#C026D3" },
  { categoryName: "Subscriptions", type: "expense", slug: "subscriptions", icon: "RefreshCw", color: "#7C3AED" },
  { categoryName: "Travel", type: "expense", slug: "travel", icon: "Plane", color: "#0891B2" },
  { categoryName: "Personal care", type: "expense", slug: "personal-care", icon: "Sparkles", color: "#DB2777" },
  { categoryName: "Family", type: "expense", slug: "family", icon: "Users", color: "#D97706" },
  { categoryName: "Charity", type: "expense", slug: "charity", icon: "HandHeart", color: "#059669" },
  { categoryName: "Taxes", type: "expense", slug: "taxes", icon: "ReceiptText", color: "#64748B" },
  { categoryName: "Bank fees", type: "expense", slug: "bank-fees", icon: "Landmark", color: "#475569" },
  { categoryName: "Loan EMI", type: "expense", slug: "loan-emi", icon: "BadgeDollarSign", color: "#B45309" },
  { categoryName: "Credit card EMI", type: "expense", slug: "credit-card-emi", icon: "CreditCard", color: "#BE123C" },
  { categoryName: "Interest & charges", type: "expense", slug: "interest-charges", icon: "Percent", color: "#DC2626" },
  { categoryName: "Other expense", type: "expense", slug: "other-expense", icon: "Ellipsis", color: "#64748B" },
] as const;

export const ensureMemberDefaults = async (memberId: string) => {
  const cashAccount = await Account.exists({ memberId, accountType: "Cash" });

  const tasks: Promise<unknown>[] = [];

  tasks.push(
    Category.bulkWrite(
      defaultCategories.map((category, sortOrder) => ({
        updateOne: {
          filter: { memberId, categoryName: category.categoryName, type: category.type },
          update: { $set: { ...category, isSystem: true, sortOrder } },
          upsert: true,
        },
      })),
    ),
  );

  if (!cashAccount) {
    let accountNumber = "1000";
    while (await Account.exists({ memberId, accountNumber })) {
      accountNumber = String(Number(accountNumber) + 1);
    }
    tasks.push(
      Account.create({
        memberId,
        accountName: "Cash Wallet",
        accountNumber,
        accountType: "Cash",
        balance: 0,
        currency: "BDT",
      }),
    );
  }

  await Promise.all(tasks);
};
