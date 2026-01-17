import {
  ICreateExpenseInput,
  IDeleteExpenseInput,
  IGetExpenseInput,
  IUpdateExpenseInput,
} from "../schemas/expense.schema";
import {
  createExpenseService,
  deleteExpenseService,
  getAllExpensesService,
  getExpenseService,
  updateExpenseService,
} from "../services/expense.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const createExpenseController = asyncHandler(async (req, res) => {
  const expense = await createExpenseService(req.body);
  sendResponse(res, 201, expense, "Expense created successfully");
});

export const updateExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateExpenseInput["params"];

  await updateExpenseService(id, req.body);
  sendResponse(res, 200, null, "Expense updated successfully");
});

export const deleteExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteExpenseInput["params"];

  await deleteExpenseService(id);
  sendResponse(res, 200, null, "Expense deleted successfully");
});

export const getAllExpensesController = asyncHandler(async (req, res) => {
  const expenses = await getAllExpensesService();
  sendResponse(res, 200, expenses, "Expenses fetched successfully");
});

export const getExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetExpenseInput["params"];
  const expense = await getExpenseService(id);
  sendResponse(res, 200, expense, "Expense fetched successfully");
});
