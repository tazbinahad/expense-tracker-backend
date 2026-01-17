import { Router } from "express";
import {
  createTransferController,
  deleteTransferController,
  getAllTransfersController,
  getTransferController,
  updateTransferController,
} from "../controllers/transfer.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createTransferSchema,
  deleteTransferSchema,
  getTransferSchema,
  updateTransferSchema,
} from "../schemas/transfer.schema";

const TransferRoute = Router();

TransferRoute.post(
  "/createTransfer",
  validate(createTransferSchema),
  createTransferController
);

TransferRoute.put(
  "/updateTransfer/:id",
  validate(updateTransferSchema),
  updateTransferController
);

TransferRoute.delete(
  "/deleteTransfer/:id",
  validate(deleteTransferSchema),
  deleteTransferController
);

TransferRoute.get("/getAllTransfers", getAllTransfersController);

TransferRoute.get(
  "/getTransfer/:id",
  validate(getTransferSchema),
  getTransferController
);

export default TransferRoute;
