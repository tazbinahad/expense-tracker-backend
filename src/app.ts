import express, {
  Application,
  NextFunction,
  Request,
  Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import AuthRoutes from "./routes/auth.route";
import AccountRoute from "./routes/account.route";
import CategoryRoute from "./routes/category.route";
import IncomeRoute from "./routes/income.route";
import TransferRoute from "./routes/transfer.route";
import ExpenseRoute from "./routes/expense.route";
import LiabilityRoute from "./routes/liability.route";
import ReportRoute from "./routes/report.route";
import ItemRoute from "./routes/item.route";
import BillRoute from "./routes/bill.route";
import NotificationRoute from "./routes/notification.route";
import WebhookRoute from "./routes/webhook.route";
import AssistantRoute from "./routes/assistant.route";
import VehicleRoute from "./routes/vehicle.route";
import ReceivableRoute from "./routes/receivable.route";
import { protect } from "./middlewares/auth.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { NotFoundError } from "./utils/error.utils";

const app: Application = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);

app.use("/api/auth", AuthRoutes);
app.use("/api/webhooks", WebhookRoute);
app.use("/api/account", protect, AccountRoute);
app.use("/api/category", protect, CategoryRoute);
app.use("/api/income", protect, IncomeRoute);
app.use("/api/transfer", protect, TransferRoute);
app.use("/api/expense", protect, ExpenseRoute);
app.use("/api/liability", protect, LiabilityRoute);
app.use("/api/report", protect, ReportRoute);
app.use("/api/item", protect, ItemRoute);
app.use("/api/bill", protect, BillRoute);
app.use("/api/notifications", protect, NotificationRoute);
app.use("/api/assistant", protect, AssistantRoute);
app.use("/api/vehicle", protect, VehicleRoute);
app.use("/api/receivable", protect, ReceivableRoute);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Endpoint not found: ${req.originalUrl}`));
});

app.use(errorHandler);

export default app;
