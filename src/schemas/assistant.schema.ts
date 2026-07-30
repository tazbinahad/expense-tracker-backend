import { z } from "zod";

const extractedItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  comments: z.string().trim().max(200).optional().default(""),
});

const extractedAdjustmentSchema = z.object({
  kind: z.enum([
    "vat",
    "delivery",
    "tip",
    "platform",
    "service",
    "discount",
    "other",
  ]),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["charge", "discount"]),
  amount: z.number().positive(),
});

export const assistantExpenseDraftSchema = z.object({
  title: z.string().trim().min(1).max(100),
  merchant: z.string().trim().max(100).nullable().default(null),
  date: z.string().nullable().default(null),
  currency: z.string().trim().length(3).default("BDT"),
  categoryName: z.string().trim().max(80).nullable().default(null),
  items: z.array(extractedItemSchema).min(1).max(50),
  adjustments: z.array(extractedAdjustmentSchema).max(20).default([]),
  totalAmount: z.number().positive(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
});

export type AssistantExpenseDraft = z.infer<typeof assistantExpenseDraftSchema>;

export const assistantChatSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000),
        }),
      )
      .max(20)
      .default([]),
    clientDate: z.string().trim().max(30).optional(),
    timeZone: z.string().trim().max(80).default("Asia/Dhaka"),
  }),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>["body"];
