import dns from "node:dns";
import app from "./app";
import connectDB from "./config/db";
import { env } from "./config/env";
import { dispatchDueNotificationsService } from "./services/notification.service";
import { processDueRecurringIncomesService } from "./services/income.service";

if (env.NODE_ENV === "development") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const start = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
  const reminderTimer = setInterval(() => {
    dispatchDueNotificationsService().catch((error) =>
      console.error("Reminder dispatch failed:", error),
    );
  }, 60_000);
  reminderTimer.unref();
  void dispatchDueNotificationsService();
  const recurringIncomeTimer = setInterval(() => {
    processDueRecurringIncomesService().catch((error) =>
      console.error("Recurring income processing failed:", error),
    );
  }, 60 * 60 * 1000);
  recurringIncomeTimer.unref();
  void processDueRecurringIncomesService();

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.PORT} is already in use.`);
      process.exit(1);
    }
    console.error("Server error:", error);
  });

  const shutdown = () => {
    clearInterval(reminderTimer);
    clearInterval(recurringIncomeTimer);
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((error) => {
  console.error("Application startup failed:", error);
  process.exit(1);
});
