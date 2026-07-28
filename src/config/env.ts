import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGO_URI: z.url("Invalid MongoDB URI"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT Secret must be at least 16 characters long"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  REMINDER_WEBHOOK_SECRET: z.string().min(16).default("local-reminder-webhook-secret"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error(
    "❌ Invalid environment variables:",
    z.treeifyError(envVars.error),
  );
  process.exit(1);
}

export const env = envVars.data;
