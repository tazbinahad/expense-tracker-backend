import {
  ICreateIncomeInput,
  IDeleteIncomeInput,
  IGetIncomeInput,
  IUpdateIncomeInput,
} from "../schemas/income.schema";
import {
  createIncomeService,
  deleteIncomeService,
  getAllIncomesService,
  getIncomeService,
  updateIncomeService,
} from "../services/income.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const createIncomeController = asyncHandler(async (req, res) => {
  const income = await createIncomeService(req.body);
  sendResponse(res, 201, income, "Income created successfully");
});

export const updateIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateIncomeInput["params"];

  await updateIncomeService(id, req.body);
  sendResponse(res, 200, null, "Income updated successfully");
});

export const deleteIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteIncomeInput["params"];

  await deleteIncomeService(id);
  sendResponse(res, 200, null, "Income deleted successfully");
});

export const getAllIncomesController = asyncHandler(async (req, res) => {
  const incomes = await getAllIncomesService();
  sendResponse(res, 200, incomes, "Incomes fetched successfully");
});

export const getIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetIncomeInput["params"];
  const income = await getIncomeService(id);
  sendResponse(res, 200, income, "Income fetched successfully");
});
