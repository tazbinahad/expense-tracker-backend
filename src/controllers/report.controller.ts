import { getMonthlyReportService } from "../services/report.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const getMonthlyReportController = asyncHandler(async (req, res) => {
  const report = await getMonthlyReportService(
    req.user!._id.toString(),
    String(req.query.month),
  );
  sendResponse(res, 200, report, "Monthly report fetched successfully");
});
