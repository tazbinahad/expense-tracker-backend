import { Router } from "express";
import {
  createLiabilityController,
  deleteLiabilityController,
  getAllLiabilitiesController,
  getLiabilityController,
  getLiabilityPaymentsController,
  recordLiabilityPaymentController,
  updateLiabilityController,
} from "../controllers/liability.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createLiabilitySchema,
  liabilityIdSchema,
  recordLiabilityPaymentSchema,
  updateLiabilitySchema,
} from "../schemas/liability.schema";

const LiabilityRoute = Router();

LiabilityRoute.post("/createLiability", validate(createLiabilitySchema), createLiabilityController);
LiabilityRoute.get("/getAllLiabilities", getAllLiabilitiesController);
LiabilityRoute.get("/getLiability/:id", validate(liabilityIdSchema), getLiabilityController);
LiabilityRoute.put("/updateLiability/:id", validate(updateLiabilitySchema), updateLiabilityController);
LiabilityRoute.delete("/deleteLiability/:id", validate(liabilityIdSchema), deleteLiabilityController);
LiabilityRoute.post("/recordPayment/:id", validate(recordLiabilityPaymentSchema), recordLiabilityPaymentController);
LiabilityRoute.get("/getPayments/:id", validate(liabilityIdSchema), getLiabilityPaymentsController);

export default LiabilityRoute;
