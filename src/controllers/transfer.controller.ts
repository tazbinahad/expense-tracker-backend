import {
  ICreateTransferInput,
  IDeleteTransferInput,
  IGetTransferInput,
  IUpdateTransferInput,
} from "../schemas/transfer.schema";
import {
  createTransferService,
  deleteTransferService,
  getAllTransfersService,
  getTransferService,
  updateTransferService,
} from "../services/transfer.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const createTransferController = asyncHandler(async (req, res) => {
  const transfer = await createTransferService({
    ...req.body,
    memberId: req.user!._id.toString(),
  });
  sendResponse(res, 201, transfer, "Transfer created successfully");
});

export const updateTransferController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateTransferInput["params"];

  const transfer = await updateTransferService(
    id,
    req.user!._id.toString(),
    req.body,
  );
  sendResponse(res, 200, transfer, "Transfer updated successfully");
});

export const deleteTransferController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteTransferInput["params"];

  const transfer = await deleteTransferService(id, req.user!._id.toString());
  sendResponse(res, 200, transfer, "Transfer deleted successfully");
});

export const getAllTransfersController = asyncHandler(async (req, res) => {
  const transfers = await getAllTransfersService(req.user!._id.toString());
  sendResponse(res, 200, transfers, "Transfers fetched successfully");
});

export const getTransferController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetTransferInput["params"];
  const transfer = await getTransferService(id, req.user!._id.toString());
  sendResponse(res, 200, transfer, "Transfer fetched successfully");
});
