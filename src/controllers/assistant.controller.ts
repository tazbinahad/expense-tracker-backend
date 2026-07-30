import { extractExpenseDraftService } from "../services/assistant.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";
import { financeChatService } from "../services/finance-chat.service";

export const extractExpenseDraftController = asyncHandler(async (req, res) => {
  const draft = await extractExpenseDraftService({
    memberId: req.user!._id.toString(),
    ...(typeof req.body?.message === "string"
      ? { message: req.body.message }
      : {}),
    ...(typeof req.body?.clientDate === "string"
      ? { clientDate: req.body.clientDate }
      : {}),
    ...(typeof req.body?.timeZone === "string"
      ? { timeZone: req.body.timeZone }
      : {}),
    ...(req.file
      ? { image: { buffer: req.file.buffer, mimetype: req.file.mimetype } }
      : {}),
  });
  sendResponse(res, 200, draft, "Expense draft extracted successfully");
});

export const financeChatController = asyncHandler(async (req, res) => {
  const response = await financeChatService({
    memberId: req.user!._id.toString(),
    ...req.body,
  });
  sendResponse(res, 200, response, "Finance question answered successfully");
});
