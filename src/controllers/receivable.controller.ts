import {
  createReceivableService,
  deleteReceivableRepaymentService,
  deleteReceivableService,
  getAllReceivablesService,
  getReceivableRepaymentsService,
  getReceivableService,
  recordReceivableRepaymentService,
  updateReceivableService,
} from "../services/receivable.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

const memberId = (req: Express.Request) => req.user!._id.toString();

export const createReceivableController = asyncHandler(async (req, res) => {
  const result = await createReceivableService(memberId(req), req.body);
  sendResponse(res, 201, result, "Money lent record created successfully");
});

export const getAllReceivablesController = asyncHandler(async (req, res) => {
  const result = await getAllReceivablesService(memberId(req));
  sendResponse(res, 200, result, "Money lent records fetched successfully");
});

export const getReceivableController = asyncHandler(async (req, res) => {
  const result = await getReceivableService(memberId(req), req.params.id!);
  sendResponse(res, 200, result, "Money lent record fetched successfully");
});

export const updateReceivableController = asyncHandler(async (req, res) => {
  const result = await updateReceivableService(
    memberId(req),
    req.params.id!,
    req.body,
  );
  sendResponse(res, 200, result, "Money lent record updated successfully");
});

export const deleteReceivableController = asyncHandler(async (req, res) => {
  const result = await deleteReceivableService(memberId(req), req.params.id!);
  sendResponse(res, 200, result, "Money lent record deleted successfully");
});

export const getReceivableRepaymentsController = asyncHandler(
  async (req, res) => {
    const result = await getReceivableRepaymentsService(
      memberId(req),
      req.params.id!,
    );
    sendResponse(res, 200, result, "Repayments fetched successfully");
  },
);

export const recordReceivableRepaymentController = asyncHandler(
  async (req, res) => {
    const result = await recordReceivableRepaymentService(
      memberId(req),
      req.params.id!,
      req.body,
    );
    sendResponse(res, 201, result, "Repayment recorded successfully");
  },
);

export const deleteReceivableRepaymentController = asyncHandler(
  async (req, res) => {
    const result = await deleteReceivableRepaymentService(
      memberId(req),
      req.params.id!,
      req.params.repaymentId!,
    );
    sendResponse(res, 200, result, "Repayment deleted successfully");
  },
);
