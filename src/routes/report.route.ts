import { Router } from "express";
import { getMonthlyReportController } from "../controllers/report.controller";
import { validate } from "../middlewares/validate.middleware";
import { monthlyReportSchema } from "../schemas/report.schema";

const ReportRoute = Router();

ReportRoute.get("/monthly", validate(monthlyReportSchema), getMonthlyReportController);

export default ReportRoute;
