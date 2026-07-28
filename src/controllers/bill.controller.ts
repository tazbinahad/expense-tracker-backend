import {
  createBillService,
  deleteBillService,
  getAllBillsService,
  getBillPaymentsService,
  getBillService,
  payBillService,
  updateBillService,
} from "../services/bill.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

const memberId = (req: Express.Request) => req.user!._id.toString();

export const createBillController = asyncHandler(async (req, res) => {
  sendResponse(res, 201, await createBillService(memberId(req), req.body), "Bill created successfully");
});
export const getAllBillsController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await getAllBillsService(memberId(req)), "Bills fetched successfully");
});
export const getBillController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await getBillService(memberId(req), req.params.id!), "Bill fetched successfully");
});
export const updateBillController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await updateBillService(memberId(req), req.params.id!, req.body), "Bill updated successfully");
});
export const deleteBillController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await deleteBillService(memberId(req), req.params.id!), "Bill deleted successfully");
});
export const payBillController = asyncHandler(async (req, res) => {
  sendResponse(res, 201, await payBillService(memberId(req), req.params.id!, req.body), "Bill paid successfully");
});
export const getBillPaymentsController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await getBillPaymentsService(memberId(req), req.params.id!), "Bill payments fetched successfully");
});
