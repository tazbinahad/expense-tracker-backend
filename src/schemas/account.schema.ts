import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    memberId: z.string().min(3, "Member ID must be at least 3 characters long"),
    accountName: z
      .string()
      .min(3, "Account name must be at least 3 characters long"),
    accountNumber: z
      .string()
      .min(3, "Account number must be at least 3 characters long"),
    accountType: z.enum(["Bank", "Mobile", "Cash", "Card"]),
    openingBalance: z.number().min(0, "Balance must be at least 0"),
    currency: z.enum(["BDT"]),
  }),
});

export type ICreateAccountInput = z.infer<typeof createAccountSchema>["body"];

export const updateAccountSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Account ID must be at least 3 characters long"),
  }),
  body: z.object({
    accountName: z
      .string()
      .min(3, "Account name must be at least 3 characters long")
      .optional(),
    accountType: z.enum(["Bank", "Mobile", "Cash", "Card"]).optional(),
    openingBalance: z.number().optional(),
    currency: z.enum(["BDT"]).optional(),
  }),
});

export type IUpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const deleteAccountSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Account ID must be at least 3 characters long"),
  }),
});

export type IDeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const getAccountSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Account ID must be at least 3 characters long"),
  }),
});

export type IGetAccountInput = z.infer<typeof getAccountSchema>;
