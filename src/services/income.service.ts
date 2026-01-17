import { Income } from "../models/Income";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import {
  ICreateIncomeInput,
  IDeleteIncomeInput,
  IGetIncomeInput,
  IUpdateIncomeInput,
} from "../schemas/income.schema";
import { NotFoundError } from "../utils/error.utils";

export const createIncomeService = async (data: ICreateIncomeInput) => {
  try {
    // Check if account exists
    const account = await Account.findById(data.accountId);
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    // Check if category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const income = await Income.create({
      memberId: data.memberId,
      categoryId: data.categoryId,
      accountId: data.accountId,
      source: data.source,
      amount: data.amount,
      date: data.date || new Date(),
    });

    return income;
  } catch (error) {
    throw error;
  }
};

export const updateIncomeService = async (
  id: IUpdateIncomeInput["params"]["id"],
  data: IUpdateIncomeInput["body"]
) => {
  try {
    if (data.accountId) {
      const account = await Account.findById(data.accountId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }
    }

    if (data.categoryId) {
      const category = await Category.findById(data.categoryId);
      if (!category) {
        throw new NotFoundError("Category not found");
      }
    }

    const income = await Income.findByIdAndUpdate(id, data, { new: true });
    if (!income) {
      throw new NotFoundError("Income not found");
    }
    return income;
  } catch (error) {
    throw error;
  }
};

export const deleteIncomeService = async (
  id: IDeleteIncomeInput["params"]["id"]
) => {
  try {
    const income = await Income.findByIdAndDelete(id);
    if (!income) {
      throw new NotFoundError("Income not found");
    }
    return income;
  } catch (error) {
    throw error;
  }
};

export const getAllIncomesService = async () => {
  try {
    const incomes = await Income.find()
      .populate("categoryId", "categoryName")
      .populate("accountId", "accountName");
    return incomes;
  } catch (error) {
    throw error;
  }
};

export const getIncomeService = async (id: IGetIncomeInput["params"]["id"]) => {
  try {
    const income = await Income.findById(id)
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
