import { getAllItemsService } from "../services/item.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const getAllItemsController = asyncHandler(async (req, res) => {
  const items = await getAllItemsService(req.user!._id.toString());
  sendResponse(res, 200, items, "Items fetched successfully");
});
