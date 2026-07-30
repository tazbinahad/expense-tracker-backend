import { z } from "zod";

const recurrenceSchema = z.object({
  frequency: z.literal("monthly"),
  monthlyRule: z.literal("last_working_day"),
  timezone: z.literal("Asia/Dhaka").default("Asia/Dhaka"),
});

export const createIncomeSchema = z.object({
  body: z.object({
    categoryId: z
      .string()
      .min(3, "Category ID must be at least 3 characters long"),
    accountId: z
      .string()
      .min(3, "Account ID must be at least 3 characters long"),
    source: z.string().trim().min(3, "Source must be at least 3 characters long"),
    amount: z.number().positive("Amount must be greater than 0"),
    date: z.coerce.date().optional(),
    recurrence: recurrenceSchema.optional(),
  }),
});

export type ICreateIncomeInput = z.infer<typeof createIncomeSchema>["body"] & {
  memberId: string;
};

export const updateIncomeSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Income ID must be at least 3 characters long"),
  }),
  body: z.object({
    categoryId: z
      .string()
      .min(3, "Category ID must be at least 3 characters long")
      .optional(),
    accountId: z
      .string()
      .min(3, "Account ID must be at least 3 characters long")
      .optional(),
    source: z
      .string()
      .min(3, "Source must be at least 3 characters long")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
    date: z.coerce.date().optional(),
  }),
});

export type IUpdateIncomeInput = z.infer<typeof updateIncomeSchema>;

export const deleteIncomeSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Income ID must be at least 3 characters long"),
  }),
});

export type IDeleteIncomeInput = z.infer<typeof deleteIncomeSchema>;

export const getIncomeSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Income ID must be at least 3 characters long"),
  }),
});

export type IGetIncomeInput = z.infer<typeof getIncomeSchema>;
