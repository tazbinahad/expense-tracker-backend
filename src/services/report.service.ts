import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Transfer } from "../models/Transfer";
import { roundMoney } from "../utils/money.utils";

type NamedReference = { _id: unknown; categoryName?: string; accountName?: string };

const moneySum = (values: number[]) =>
  roundMoney(values.reduce((sum, value) => sum + value, 0));

export const getMonthlyReportService = async (
  memberId: string,
  month: string,
) => {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7));
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  const range = { $gte: start, $lt: end };

  const [expenses, incomes, transfers] = await Promise.all([
    Expense.find({ memberId, date: range })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName")
      .lean(),
    Income.find({ memberId, date: range })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName")
      .lean(),
    Transfer.find({ memberId, date: range })
      .populate("fromAccountId", "accountName")
      .populate("toAccountId", "accountName")
      .lean(),
  ]);

  const totalIncome = moneySum(incomes.map((entry) => entry.amount));
  const totalExpense = moneySum(expenses.map((entry) => entry.totalAmount));
  const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
  const itemMap = new Map<
    string,
    { name: string; amount: number; quantity: number; transactionCount: number }
  >();
  const adjustmentMap = new Map<
    string,
    { label: string; type: "charge" | "discount"; amount: number; count: number }
  >();
  const accountMap = new Map<
    string,
    { accountId: string; name: string; income: number; expense: number; transferIn: number; transferOut: number }
  >();
  const dailyMap = new Map<number, { day: number; income: number; expense: number }>();

  const daily = (date: Date) => {
    const day = new Date(date).getUTCDate();
    const current = dailyMap.get(day) || { day, income: 0, expense: 0 };
    dailyMap.set(day, current);
    return current;
  };
  const account = (reference: unknown) => {
    const value = reference as NamedReference;
    const accountId = String(value._id);
    const current = accountMap.get(accountId) || {
      accountId,
      name: value.accountName || "Account",
      income: 0,
      expense: 0,
      transferIn: 0,
      transferOut: 0,
    };
    accountMap.set(accountId, current);
    return current;
  };

  incomes.forEach((entry) => {
    daily(entry.date).income += entry.amount;
    account(entry.accountId).income += entry.amount;
  });
  expenses.forEach((entry) => {
    daily(entry.date).expense += entry.totalAmount;
    account(entry.accountId).expense += entry.totalAmount;
    const category = entry.categoryId as unknown as NamedReference;
    const name = category.categoryName || "Uncategorized";
    const current = categoryMap.get(name) || { name, amount: 0, count: 0 };
    current.amount += entry.totalAmount;
    current.count += 1;
    categoryMap.set(name, current);
    entry.items.forEach((item) => {
      const key = item.name.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
      const currentItem = itemMap.get(key) || {
        name: item.name,
        amount: 0,
        quantity: 0,
        transactionCount: 0,
      };
      currentItem.amount += item.price * item.quantity;
      currentItem.quantity += item.quantity;
      currentItem.transactionCount += 1;
      itemMap.set(key, currentItem);
    });
    (entry.adjustments || []).forEach((adjustment) => {
      const key = `${adjustment.type}:${adjustment.label.toLocaleLowerCase("en")}`;
      const currentAdjustment = adjustmentMap.get(key) || {
        label: adjustment.label,
        type: adjustment.type,
        amount: 0,
        count: 0,
      };
      currentAdjustment.amount += adjustment.amount;
      currentAdjustment.count += 1;
      adjustmentMap.set(key, currentAdjustment);
    });
  });
  transfers.forEach((entry) => {
    account(entry.fromAccountId).transferOut += entry.amount + entry.transferFee;
    account(entry.toAccountId).transferIn += entry.amount;
  });

  const categoryBreakdown = [...categoryMap.values()]
    .map((item) => ({
      ...item,
      amount: roundMoney(item.amount),
      percentage: totalExpense ? roundMoney((item.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    period: { start, end },
    summary: {
      totalIncome,
      totalExpense,
      netSavings: roundMoney(totalIncome - totalExpense),
      savingsRate: totalIncome
        ? roundMoney(((totalIncome - totalExpense) / totalIncome) * 100)
        : 0,
      transactionCount: incomes.length + expenses.length + transfers.length,
      emiPayments: moneySum(
        expenses.filter((entry) => entry.liabilityId).map((entry) => entry.totalAmount),
      ),
    },
    categoryBreakdown,
    itemBreakdown: [...itemMap.values()]
      .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
      .sort((a, b) => b.amount - a.amount),
    adjustmentBreakdown: [...adjustmentMap.values()]
      .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
      .sort((a, b) => b.amount - a.amount),
    dailyCashFlow: [...dailyMap.values()]
      .map((item) => ({
        ...item,
        income: roundMoney(item.income),
        expense: roundMoney(item.expense),
      }))
      .sort((a, b) => a.day - b.day),
    accountActivity: [...accountMap.values()].map((item) => ({
      ...item,
      income: roundMoney(item.income),
      expense: roundMoney(item.expense),
      transferIn: roundMoney(item.transferIn),
      transferOut: roundMoney(item.transferOut),
    })),
  };
};
