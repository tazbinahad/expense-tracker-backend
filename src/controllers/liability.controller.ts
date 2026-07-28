import {
  createLiabilityService,
  deleteLiabilityService,
  getAllLiabilitiesService,
  getLiabilityPaymentsService,
  getLiabilityService,
  recordLiabilityPaymentService,
  updateLiabilityService,
} from "../services/liability.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

const memberId = (req: Express.Request) => req.user!._id.toString();

export const createLiabilityController = asyncHandler(async (req, res) => {
  const result = await createLiabilityService(memberId(req), req.body);
  sendResponse(res, 201, result, "Liability created successfully");
});

export const getAllLiabilitiesController = asyncHandler(async (req, res) => {
  const result = await getAllLiabilitiesService(memberId(req));
  sendResponse(res, 200, result, "Liabilities fetched successfully");
});

export const getLiabilityController = asyncHandler(async (req, res) => {
  const result = await getLiabilityService(memberId(req), req.params.id!);
  sendResponse(res, 200, result, "Liability fetched successfully");
});

export const updateLiabilityController = asyncHandler(async (req, res) => {
  const result = await updateLiabilityService(memberId(req), req.params.id!, req.body);
  sendResponse(res, 200, result, "Liability updated successfully");
});

export const deleteLiabilityController = asyncHandler(async (req, res) => {
  const result = await deleteLiabilityService(memberId(req), req.params.id!);
  sendResponse(res, 200, result, "Liability deleted successfully");
});

export const recordLiabilityPaymentController = asyncHandler(async (req, res) => {
  const result = await recordLiabilityPaymentService(
    memberId(req),
    req.params.id!,
    req.body,
  );
  sendResponse(res, 201, result, "Payment recorded successfully");
});

export const getLiabilityPaymentsController = asyncHandler(async (req, res) => {
  const result = await getLiabilityPaymentsService(memberId(req), req.params.id!);
  sendResponse(res, 200, result, "Payments fetched successfully");
});
