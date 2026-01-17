import { z } from "zod";

const expenseItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  price: z.number().min(0, "Price must be at least 0"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  comments: z.string().optional(),
});

export const createExpenseSchema = z.object({
  body: z.object({
    memberId: z.string().min(3, "Member ID must be at least 3 characters long"),
    categoryId: z
      .string()
      .min(3, "Category ID must be at least 3 characters long"),
    accountId: z
      .string()
      .min(3, "Account ID must be at least 3 characters long"),
    title: z.string().min(3, "Title must be at least 3 characters long"),
    totalAmount: z.number().min(0, "Total amount must be at least 0"),
    items: z.array(expenseItemSchema).optional(),
  }),
});

export type ICreateExpenseInput = z.infer<typeof createExpenseSchema>["body"];

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Expense ID must be at least 3 characters long"),
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
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .optional(),
    totalAmount: z
      .number()
      .min(0, "Total amount must be at least 0")
      .optional(),
    items: z.array(expenseItemSchema).optional(),
  }),
});

export type IUpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const deleteExpenseSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Expense ID must be at least 3 characters long"),
  }),
});

export type IDeleteExpenseInput = z.infer<typeof deleteExpenseSchema>;

export const getExpenseSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Expense ID must be at least 3 characters long"),
  }),
});

export type IGetExpenseInput = z.infer<typeof getExpenseSchema>;
