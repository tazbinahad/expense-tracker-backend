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
  const income = await createIncomeService({
    ...req.body,
    memberId: req.user!._id.toString(),
  });
  sendResponse(res, 201, income, "Income created successfully");
});

export const updateIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateIncomeInput["params"];

  const income = await updateIncomeService(
    id,
    req.user!._id.toString(),
    req.body,
  );
  sendResponse(res, 200, income, "Income updated successfully");
});

export const deleteIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteIncomeInput["params"];

  const income = await deleteIncomeService(id, req.user!._id.toString());
  sendResponse(res, 200, income, "Income deleted successfully");
});

export const getAllIncomesController = asyncHandler(async (req, res) => {
  const incomes = await getAllIncomesService(req.user!._id.toString());
  sendResponse(res, 200, incomes, "Incomes fetched successfully");
});

export const getIncomeController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetIncomeInput["params"];
  const income = await getIncomeService(id, req.user!._id.toString());
  sendResponse(res, 200, income, "Income fetched successfully");
});
