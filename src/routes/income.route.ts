import { Router } from "express";
import {
  createIncomeController,
  deleteIncomeController,
  getAllIncomesController,
  getIncomeController,
  updateIncomeController,
} from "../controllers/income.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createIncomeSchema,
  deleteIncomeSchema,
  getIncomeSchema,
  updateIncomeSchema,
} from "../schemas/income.schema";

const IncomeRoute = Router();

IncomeRoute.post(
  "/createIncome",
  validate(createIncomeSchema),
  createIncomeController
);

IncomeRoute.put(
  "/updateIncome/:id",
  validate(updateIncomeSchema),
  updateIncomeController
);

IncomeRoute.delete(
  "/deleteIncome/:id",
  validate(deleteIncomeSchema),
  deleteIncomeController
);

IncomeRoute.get("/getAllIncomes", getAllIncomesController);

IncomeRoute.get(
  "/getIncome/:id",
  validate(getIncomeSchema),
  getIncomeController
);

export default IncomeRoute;
