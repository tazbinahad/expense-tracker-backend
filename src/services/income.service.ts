import mongoose from "mongoose";
import { Income } from "../models/Income";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import {
  ICreateIncomeInput,
  IDeleteIncomeInput,
  IGetIncomeInput,
  IUpdateIncomeInput,
} from "../schemas/income.schema";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";
import { RecurringIncome } from "../models/RecurringIncome";

const occurrenceKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export const lastBangladeshWorkingDay = (
  year: number,
  monthIndex: number,
) => {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0, 6));
  while (date.getUTCDay() === 5 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date;
};

const nextSalaryRun = (from: Date) => {
  const nextMonth = from.getUTCMonth() + 1;
  return lastBangladeshWorkingDay(from.getUTCFullYear(), nextMonth);
};

export const createIncomeService = async (data: ICreateIncomeInput) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Check if account exists
    const account = await Account.findOne({
      _id: data.accountId,
      memberId: data.memberId,
    }).session(session);
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    // Check if category exists
    const category = await Category.findOne({
      _id: data.categoryId,
      memberId: data.memberId,
      type: "income",
    }).session(session);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Increment balance
    account.balance = roundMoney(account.balance + data.amount);
    await account.save({ session });

    let recurringIncomeId: mongoose.Types.ObjectId | undefined;
    if (data.recurrence) {
      const [schedule] = await RecurringIncome.create(
        [{
          memberId: data.memberId,
          categoryId: data.categoryId,
          accountId: data.accountId,
          source: data.source,
          amount: data.amount,
          ...data.recurrence,
          nextRunAt: nextSalaryRun(data.date || new Date()),
        }],
        { session },
      );
      if (!schedule) {
        throw new BadRequestError("Unable to create recurring income schedule");
      }
      recurringIncomeId = schedule._id as mongoose.Types.ObjectId;
    }

    const incomeDate = data.date || new Date();
    const income = await Income.create([{
      memberId: data.memberId,
      categoryId: data.categoryId,
      accountId: data.accountId,
      source: data.source,
      amount: data.amount,
      date: incomeDate,
      ...(recurringIncomeId && {
        recurringIncomeId,
        occurrenceKey: occurrenceKey(incomeDate),
      }),
    }], { session });

    await session.commitTransaction();
    return income[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const processDueRecurringIncomesService = async (
  memberId?: string,
  now = new Date(),
) => {
  const query: Record<string, unknown> = {
    active: true,
    nextRunAt: { $lte: now },
  };
  if (memberId) query.memberId = memberId;

  const schedules = await RecurringIncome.find(query);
  for (const schedule of schedules) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const current = await RecurringIncome.findOne({
        _id: schedule._id,
        active: true,
        nextRunAt: schedule.nextRunAt,
      }).session(session);
      if (!current) {
        await session.abortTransaction();
        continue;
      }

      const key = occurrenceKey(current.nextRunAt);
      const exists = await Income.exists({
        recurringIncomeId: current._id,
        occurrenceKey: key,
      }).session(session);

      if (!exists) {
        const account = await Account.findOne({
          _id: current.accountId,
          memberId: current.memberId,
        }).session(session);
        if (!account) {
          current.active = false;
          await current.save({ session });
          await session.commitTransaction();
          continue;
        }

        account.balance = roundMoney(account.balance + current.amount);
        await account.save({ session });
        await Income.create(
          [{
            memberId: current.memberId,
            categoryId: current.categoryId,
            accountId: current.accountId,
            source: current.source,
            amount: current.amount,
            date: current.nextRunAt,
            recurringIncomeId: current._id,
            occurrenceKey: key,
          }],
          { session },
        );
      }

      current.nextRunAt = nextSalaryRun(current.nextRunAt);
      await current.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
};

export const updateIncomeService = async (
  id: IUpdateIncomeInput["params"]["id"],
  memberId: string,
  data: IUpdateIncomeInput["body"],
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const income = await Income.findOne({ _id: id, memberId }).session(session);
    if (!income) {
      throw new NotFoundError("Income not found");
    }

    const newAccountId = data.accountId || income.accountId.toString();
    const newCategoryId = data.categoryId || income.categoryId.toString();
    const newAmount = data.amount !== undefined ? data.amount : income.amount;

    // Revert old account balance
    const oldAccount = await Account.findOne({
      _id: income.accountId,
      memberId,
    }).session(session);
    if (!oldAccount) {
      throw new NotFoundError("Original account not found");
    }
    const resultingOldBalance =
      newAccountId === income.accountId.toString()
        ? oldAccount.balance - income.amount + newAmount
        : oldAccount.balance - income.amount;
    if (resultingOldBalance < 0) {
      throw new BadRequestError(
        "Income cannot be changed because its funds have already been spent",
      );
    }
    oldAccount.balance = roundMoney(oldAccount.balance - income.amount);
    await oldAccount.save({ session });

    const category = await Category.findOne({
      _id: newCategoryId,
      memberId,
      type: "income",
    }).session(session);
    if (!category) {
      throw new NotFoundError("Income category not found");
    }

    // Validate new Account
    const newAccount = await Account.findOne({
      _id: newAccountId,
      memberId,
    }).session(session);
    if (!newAccount) {
      throw new NotFoundError("Account not found");
    }

    // Add new balance
    newAccount.balance = roundMoney(newAccount.balance + newAmount);
    await newAccount.save({ session });

    // Update Income
    const updatedIncome = await Income.findOneAndUpdate({ _id: id, memberId }, data, {
      new: true,
      session,
    });
    if (!updatedIncome) {
      throw new NotFoundError("Income not found");
    }
    if (income.recurringIncomeId) {
      await RecurringIncome.updateOne(
        { _id: income.recurringIncomeId, memberId },
        {
          ...(data.categoryId && { categoryId: data.categoryId }),
          ...(data.accountId && { accountId: data.accountId }),
          ...(data.source && { source: data.source }),
          ...(data.amount !== undefined && { amount: data.amount }),
        },
        { session },
      );
    }

    await session.commitTransaction();
    return updatedIncome;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteIncomeService = async (
  id: IDeleteIncomeInput["params"]["id"],
  memberId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const income = await Income.findOne({ _id: id, memberId }).session(session);
    if (!income) {
      throw new NotFoundError("Income not found");
    }

    // Refund/Deduct Balance
    const account = await Account.findOne({
      _id: income.accountId,
      memberId,
    }).session(session);
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    if (account.balance < income.amount) {
      throw new BadRequestError(
        "Income cannot be deleted because its funds have already been spent",
      );
    }
    account.balance = roundMoney(account.balance - income.amount);
    await account.save({ session });

    await Income.findByIdAndDelete(id).session(session);
    if (income.recurringIncomeId) {
      await RecurringIncome.updateOne(
        { _id: income.recurringIncomeId, memberId },
        { active: false },
        { session },
      );
    }

    await session.commitTransaction();
    return income;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getAllIncomesService = async (memberId: string) => {
  try {
    await processDueRecurringIncomesService(memberId);
    const incomes = await Income.find({ memberId })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName")
      .sort({ date: -1 });
    return incomes;
  } catch (error) {
    throw error;
  }
};

export const getIncomeService = async (
  id: IGetIncomeInput["params"]["id"],
  memberId: string,
) => {
  try {
    const income = await Income.findOne({ _id: id, memberId })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName");
    if (!income) {
      throw new NotFoundError("Income not found");
    }
    return income;
  } catch (error) {
    throw error;
  }
};
