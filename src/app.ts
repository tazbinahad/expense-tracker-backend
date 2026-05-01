import express, {
  Application,
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db";
import AuthRoutes from "./routes/auth.route";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { NotFoundError } from "./utils/error.utils";
import AccountRoute from "./routes/account.route";
import CategoryRoute from "./routes/category.route";
import IncomeRoute from "./routes/income.route";
import TransferRoute from "./routes/transfer.route";
import ExpenseRoute from "./routes/expense.route";
import { protect } from "./middlewares/auth.middleware";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
// 1. Initialize App
const app: Application = express();

// 2. Connect to Database
connectDB();

// 3. Middleware
app.use(helmet());
app.use(express.json());
app.use(cors());

app.use("/api/auth", AuthRoutes);
app.use("/api/account", protect, AccountRoute);
app.use("/api/category", protect, CategoryRoute);
app.use("/api/income", protect, IncomeRoute);
app.use("/api/transfer", protect, TransferRoute);
app.use("/api/expense", protect, ExpenseRoute);

app.get("/", (req: ExpressRequest, res: ExpressResponse) => {
  res.send("API is running...");
});

// Handle 404 errors for unknown routes
app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  next(new NotFoundError(`Endpoint not found: ${req.originalUrl}`));
});

app.use(errorHandler);

// 4. Start Server
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Please use a different port or kill the process using it.`,
    );
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
  }
});
