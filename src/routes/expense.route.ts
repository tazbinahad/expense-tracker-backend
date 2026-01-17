import { Router } from "express";
import {
  createExpenseController,
  deleteExpenseController,
  getAllExpensesController,
  getExpenseController,
  updateExpenseController,
} from "../controllers/expense.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createExpenseSchema,
  deleteExpenseSchema,
  getExpenseSchema,
  updateExpenseSchema,
} from "../schemas/expense.schema";

const ExpenseRoute = Router();

ExpenseRoute.post(
  "/createExpense",
  validate(createExpenseSchema),
  createExpenseController
);

ExpenseRoute.put(
  "/updateExpense/:id",
  validate(updateExpenseSchema),
  updateExpenseController
);

ExpenseRoute.delete(
  "/deleteExpense/:id",
  validate(deleteExpenseSchema),
  deleteExpenseController
);

ExpenseRoute.get("/getAllExpenses", getAllExpensesController);

ExpenseRoute.get(
  "/getExpense/:id",
  validate(getExpenseSchema),
  getExpenseController
);

export default ExpenseRoute;
