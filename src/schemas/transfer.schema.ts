import { z } from "zod";

export const createTransferSchema = z.object({
  body: z.object({
    memberId: z.string().min(3, "Member ID must be at least 3 characters long"),
    fromAccountId: z
      .string()
      .min(3, "From Account ID must be at least 3 characters long"),
    toAccountId: z
      .string()
      .min(3, "To Account ID must be at least 3 characters long"),
    amount: z.number().min(0, "Amount must be at least 0"),
    transferFee: z
      .number()
      .min(0, "Transfer fee must be at least 0")
      .optional(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export type ICreateTransferInput = z.infer<typeof createTransferSchema>["body"];

export const updateTransferSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Transfer ID must be at least 3 characters long"),
  }),
  body: z.object({
    fromAccountId: z
      .string()
      .min(3, "From Account ID must be at least 3 characters long")
      .optional(),
    toAccountId: z
      .string()
      .min(3, "To Account ID must be at least 3 characters long")
      .optional(),
    amount: z.number().min(0, "Amount must be at least 0").optional(),
    transferFee: z
      .number()
      .min(0, "Transfer fee must be at least 0")
      .optional(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export type IUpdateTransferInput = z.infer<typeof updateTransferSchema>;

export const deleteTransferSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Transfer ID must be at least 3 characters long"),
  }),
});

export type IDeleteTransferInput = z.infer<typeof deleteTransferSchema>;

export const getTransferSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Transfer ID must be at least 3 characters long"),
  }),
});

export type IGetTransferInput = z.infer<typeof getTransferSchema>;
