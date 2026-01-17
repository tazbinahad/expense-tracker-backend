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
      items = [],
    } = data;

    // Validate Account
    const account = await Account.findById(accountId).session(session);
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    // Validate Category
    const category = await Category.findById(categoryId).session(session);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Check Balance
    if (account.balance < totalAmount) {
      throw new BadRequestError("Insufficient balance");
    }

    // Deduct Balance
    account.balance -= totalAmount;
    await account.save({ session });

    // Create Expense
    const expenseData = {
      memberId,
      categoryId,
      accountId,
      title,
      totalAmount,
      items: items.map((item) => ({
        ...item,
        comments: item.comments || "",
      })),
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
  data: IUpdateExpenseInput["body"]
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findById(id).session(session);
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }

    // Revert old balance
    const oldAccount = await Account.findById(expense.accountId).session(
      session
    );
    if (oldAccount) {
      oldAccount.balance += expense.totalAmount;
      await oldAccount.save({ session });
    }

    // Prepare new data
    const newAccountId = data.accountId || expense.accountId.toString();
    const newCategoryId = data.categoryId || expense.categoryId.toString();
    const newTotalAmount =
      data.totalAmount !== undefined ? data.totalAmount : expense.totalAmount;

    // Validate new Category if changed
    if (data.categoryId) {
      const category = await Category.findById(newCategoryId).session(session);
      if (!category) {
        throw new NotFoundError("New Category not found");
      }
    }

    // Validate new Account and Balance
    const newAccount = await Account.findById(newAccountId).session(session);
    if (!newAccount) {
      throw new NotFoundError("New Account not found");
    }

    if (newAccount.balance < newTotalAmount) {
      throw new BadRequestError("Insufficient balance in account");
    }

    // Deduct new balance
    newAccount.balance -= newTotalAmount;
    await newAccount.save({ session });

    // Update Expense
    const updatedExpense = await Expense.findByIdAndUpdate(id, data, {
      new: true,
      session,
    });

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
  id: IDeleteExpenseInput["params"]["id"]
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findById(id).session(session);
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }

    // Refund Balance
    const account = await Account.findById(expense.accountId).session(session);
    if (account) {
      account.balance += expense.totalAmount;
      await account.save({ session });
    }

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

export const getAllExpensesService = async () => {
  try {
    const expenses = await Expense.find()
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName");
    return expenses;
  } catch (error) {
    throw error;
  }
};

export const getExpenseService = async (
  id: IGetExpenseInput["params"]["id"]
) => {
  try {
    const expense = await Expense.findById(id)
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
