import { Router } from "express";
import {
  createReceivableController,
  deleteReceivableController,
  deleteReceivableRepaymentController,
  getAllReceivablesController,
  getReceivableController,
  getReceivableRepaymentsController,
  recordReceivableRepaymentController,
  updateReceivableController,
} from "../controllers/receivable.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createReceivableSchema,
  deleteReceivableRepaymentSchema,
  receivableIdSchema,
  recordReceivableRepaymentSchema,
  updateReceivableSchema,
} from "../schemas/receivable.schema";

const ReceivableRoute = Router();

ReceivableRoute.post(
  "/createReceivable",
  validate(createReceivableSchema),
  createReceivableController,
);
ReceivableRoute.get("/getAllReceivables", getAllReceivablesController);
ReceivableRoute.get(
  "/getReceivable/:id",
  validate(receivableIdSchema),
  getReceivableController,
);
ReceivableRoute.put(
  "/updateReceivable/:id",
  validate(updateReceivableSchema),
  updateReceivableController,
);
ReceivableRoute.delete(
  "/deleteReceivable/:id",
  validate(receivableIdSchema),
  deleteReceivableController,
);
ReceivableRoute.get(
  "/getRepayments/:id",
  validate(receivableIdSchema),
  getReceivableRepaymentsController,
);
ReceivableRoute.post(
  "/recordRepayment/:id",
  validate(recordReceivableRepaymentSchema),
  recordReceivableRepaymentController,
);
ReceivableRoute.delete(
  "/deleteRepayment/:id/:repaymentId",
  validate(deleteReceivableRepaymentSchema),
  deleteReceivableRepaymentController,
);

export default ReceivableRoute;
