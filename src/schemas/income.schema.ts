import { z } from "zod";

export const createIncomeSchema = z.object({
  body: z.object({
    memberId: z.string().min(3, "Member ID must be at least 3 characters long"),
    categoryId: z
      .string()
      .min(3, "Category ID must be at least 3 characters long"),
    accountId: z
      .string()
      .min(3, "Account ID must be at least 3 characters long"),
    source: z.string().min(3, "Source must be at least 3 characters long"),
    amount: z.number().min(0, "Amount must be at least 0"),
    date: z.coerce.date().optional(),
  }),
});

export type ICreateIncomeInput = z.infer<typeof createIncomeSchema>["body"];

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
    amount: z.number().min(0, "Amount must be at least 0").optional(),
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
