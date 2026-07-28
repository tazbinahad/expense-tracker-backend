import { Router } from "express";
import {
  createBillController,
  deleteBillController,
  getAllBillsController,
  getBillController,
  getBillPaymentsController,
  payBillController,
  updateBillController,
} from "../controllers/bill.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  billIdSchema,
  createBillSchema,
  payBillSchema,
  updateBillSchema,
} from "../schemas/bill.schema";

const BillRoute = Router();
BillRoute.post("/createBill", validate(createBillSchema), createBillController);
BillRoute.get("/getAllBills", getAllBillsController);
BillRoute.get("/getBill/:id", validate(billIdSchema), getBillController);
BillRoute.put("/updateBill/:id", validate(updateBillSchema), updateBillController);
BillRoute.delete("/deleteBill/:id", validate(billIdSchema), deleteBillController);
BillRoute.post("/payBill/:id", validate(payBillSchema), payBillController);
BillRoute.get("/getPayments/:id", validate(billIdSchema), getBillPaymentsController);
export default BillRoute;
