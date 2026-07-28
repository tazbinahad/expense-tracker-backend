import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import { Expense } from "../models/Expense";
import {
  ICreateExpenseInput,
  IDeleteExpenseInput,
  IGetExpenseInput,
  IUpdateExpenseInput,
} from "../schemas/expense.schema";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";
import { resolveCatalogItems } from "./item.service";

const toCents = (value: number) => Math.round(value * 100);

const validateItemTotal = (
  items: { price: number; quantity: number }[],
  adjustments: { type: "charge" | "discount"; amount: number }[],
  totalAmount: number,
) => {
  if (!items.length) {
    throw new BadRequestError("At least one expense item is required");
  }
  const itemTotal = items.reduce(
    (total, item) => total + toCents(item.price) * item.quantity,
    0,
  );
  const adjustmentTotal = adjustments.reduce(
    (total, adjustment) =>
      total +
      (adjustment.type === "charge" ? 1 : -1) * toCents(adjustment.amount),
    0,
  );
  if (itemTotal + adjustmentTotal <= 0) {
    throw new BadRequestError("Discounts cannot equal or exceed the receipt total");
  }
  if (itemTotal + adjustmentTotal !== toCents(totalAmount)) {
    throw new BadRequestError("Items, fees, and discounts must match total amount");
  }
  return itemTotal / 100;
};

export const createExpenseService = async (data: ICreateExpenseInput) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      memberId,
      categoryId,
      accountId,
      title,
      totalAmount,
      items,
      adjustments,
      date,
    } = data;
    const subtotal = validateItemTotal(items, adjustments, totalAmount);
    const resolvedItems = await resolveCatalogItems(memberId, items, session);

    // Validate Account
    const account = await Account.findOne({
      _id: accountId,
      memberId,
    }).session(session);
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    // Validate Category
    const category = await Category.findOne({
      _id: categoryId,
      memberId,
      type: "expense",
    }).session(session);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Check Balance
    if (account.balance < totalAmount) {
      throw new BadRequestError("Insufficient balance");
    }

    // Deduct Balance
    account.balance = roundMoney(account.balance - totalAmount);
    await account.save({ session });

    // Create Expense
    const expenseData = {
      memberId,
      categoryId,
      accountId,
      title,
      totalAmount,
      subtotal,
      date: date || new Date(),
      items: resolvedItems,
      adjustments,
    };

    const expense = await Expense.create([expenseData], { session });

    await session.commitTransaction();
    return expense[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateExpenseService = async (
  id: IUpdateExpenseInput["params"]["id"],
  memberId: string,
  data: IUpdateExpenseInput["body"]
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findOne({ _id: id, memberId }).session(session);
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }
    if (expense.liabilityId) {
      throw new BadRequestError("EMI payments must be managed from Loans & EMIs");
    }
    if (expense.billId) {
      throw new BadRequestError("Bill payments must be managed from Bills & Rent");
    }

    // Revert old balance
    const oldAccount = await Account.findOne({
      _id: expense.accountId,
      memberId,
    }).session(session);
    if (!oldAccount) {
      throw new NotFoundError("Original account not found");
    }
    oldAccount.balance = roundMoney(oldAccount.balance + expense.totalAmount);
    await oldAccount.save({ session });

    // Prepare new data
    const newAccountId = data.accountId || expense.accountId.toString();
    const newCategoryId = data.categoryId || expense.categoryId.toString();
    const newTotalAmount =
      data.totalAmount !== undefined ? data.totalAmount : expense.totalAmount;
    const newItems = data.items || expense.items;
    const newAdjustments = data.adjustments || expense.adjustments;
    const subtotal = validateItemTotal(newItems, newAdjustments, newTotalAmount);
    const resolvedItems = data.items
      ? await resolveCatalogItems(memberId, data.items, session)
      : expense.items;

    const category = await Category.findOne({
      _id: newCategoryId,
      memberId,
      type: "expense",
    }).session(session);
    if (!category) {
      throw new NotFoundError("Expense category not found");
    }

    // Validate new Account and Balance
    const newAccount = await Account.findOne({
      _id: newAccountId,
      memberId,
    }).session(session);
    if (!newAccount) {
      throw new NotFoundError("New Account not found");
    }

    if (newAccount.balance < newTotalAmount) {
      throw new BadRequestError("Insufficient balance in account");
    }

    // Deduct new balance
    newAccount.balance = roundMoney(newAccount.balance - newTotalAmount);
    await newAccount.save({ session });

    // Update Expense
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, memberId },
      {
        ...data,
        subtotal,
        ...(data.items ? { items: resolvedItems } : {}),
      },
      { new: true, session },
    );

    await session.commitTransaction();
    return updatedExpense;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteExpenseService = async (
  id: IDeleteExpenseInput["params"]["id"],
  memberId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findOne({ _id: id, memberId }).session(session);
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }
    if (expense.liabilityId) {
      throw new BadRequestError("EMI payments cannot be deleted from transactions");
    }
    if (expense.billId) {
      throw new BadRequestError("Bill payments cannot be deleted from transactions");
    }

    // Refund Balance
    const account = await Account.findOne({
      _id: expense.accountId,
      memberId,
    }).session(session);
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    account.balance = roundMoney(account.balance + expense.totalAmount);
    await account.save({ session });

    await Expense.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    return expense;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getAllExpensesService = async (memberId: string) => {
  try {
    const expenses = await Expense.find({ memberId })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName")
      .sort({ date: -1 });
    return expenses;
  } catch (error) {
    throw error;
  }
};

export const getExpenseService = async (
  id: IGetExpenseInput["params"]["id"],
  memberId: string,
) => {
  try {
    const expense = await Expense.findOne({ _id: id, memberId })
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName");
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }
    return expense;
  } catch (error) {
    throw error;
  }
};
