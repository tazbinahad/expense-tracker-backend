import { z } from "zod";

const expenseItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(100),
  price: z.number().positive("Price must be greater than 0"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  comments: z.string().trim().max(200).optional(),
});

const expenseItemsSchema = z
  .array(expenseItemSchema)
  .min(1, "At least one expense item is required")
  .superRefine((items, context) => {
    const names = new Set<string>();
    items.forEach((item, index) => {
      const normalizedName = item.name.toLocaleLowerCase("en").replace(/\s+/g, " ");
      if (names.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate items must be combined into one row",
          path: [index, "name"],
        });
      }
      names.add(normalizedName);
    });
  });

const expenseAdjustmentSchema = z.object({
  kind: z.enum(["vat", "delivery", "tip", "platform", "service", "discount", "other"]),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["charge", "discount"]),
  amount: z.number().positive("Adjustment amount must be greater than 0"),
});

export const createExpenseSchema = z.object({
  body: z.object({
    categoryId: z
      .string()
      .min(3, "Category ID must be at least 3 characters long"),
    accountId: z
      .string()
      .min(3, "Account ID must be at least 3 characters long"),
    title: z.string().trim().min(3, "Title must be at least 3 characters long"),
    totalAmount: z.number().positive("Total amount must be greater than 0"),
    items: expenseItemsSchema,
    adjustments: z.array(expenseAdjustmentSchema).max(20).optional().default([]),
    date: z.coerce.date().optional(),
  }),
});

export type ICreateExpenseInput = z.infer<typeof createExpenseSchema>["body"] & {
  memberId: string;
};

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
      .positive("Total amount must be greater than 0")
      .optional(),
    items: expenseItemsSchema.optional(),
    adjustments: z.array(expenseAdjustmentSchema).max(20).optional(),
    date: z.coerce.date().optional(),
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
