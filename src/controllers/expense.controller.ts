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
  const expense = await createExpenseService({
    ...req.body,
    memberId: req.user!._id.toString(),
  });
  sendResponse(res, 201, expense, "Expense created successfully");
});

export const updateExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateExpenseInput["params"];

  const expense = await updateExpenseService(
    id,
    req.user!._id.toString(),
    req.body,
  );
  sendResponse(res, 200, expense, "Expense updated successfully");
});

export const deleteExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteExpenseInput["params"];

  const expense = await deleteExpenseService(id, req.user!._id.toString());
  sendResponse(res, 200, expense, "Expense deleted successfully");
});

export const getAllExpensesController = asyncHandler(async (req, res) => {
  const expenses = await getAllExpensesService(req.user!._id.toString());
  sendResponse(res, 200, expenses, "Expenses fetched successfully");
});

export const getExpenseController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetExpenseInput["params"];
  const expense = await getExpenseService(id, req.user!._id.toString());
  sendResponse(res, 200, expense, "Expense fetched successfully");
});
