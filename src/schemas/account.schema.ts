import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    accountName: z
      .string()
      .trim()
      .min(3, "Account name must be at least 3 characters long"),
    bankName: z.string().trim().min(2).max(120).optional(),
    accountNumber: z.coerce.string().trim().optional(),
    accountType: z.enum(["Bank", "Mobile", "Cash", "Card"]),
    openingBalance: z.number().min(0, "Balance must be at least 0"),
    currency: z.enum(["BDT"]),
    creditLimit: z.number().positive().optional(),
    cardNetwork: z.enum(["visa", "mastercard", "amex"]).optional(),
    reservedCreditAmount: z.number().min(0).optional(),
    statementDay: z.number().int().min(1).max(28).optional(),
    paymentDueDay: z.number().int().min(1).max(28).optional(),
    statementBalance: z.number().min(0).optional(),
  }).superRefine((account, context) => {
    if (
      account.accountType !== "Cash" &&
      !/^\d{3,}$/.test(account.accountNumber || "")
    ) {
      context.addIssue({
        code: "custom",
        path: ["accountNumber"],
        message: "Account number must contain at least 3 digits",
      });
    }
    if (account.accountType === "Bank" && !account.bankName) {
      context.addIssue({
        code: "custom",
        path: ["bankName"],
        message: "Bank name is required for bank accounts",
      });
    }
  }),
});

export type ICreateAccountInput = z.infer<typeof createAccountSchema>["body"] & {
  memberId: string;
};

export const updateAccountSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Account ID must be at least 3 characters long"),
  }),
  body: z.object({
    accountName: z
      .string()
      .trim()
      .min(3, "Account name must be at least 3 characters long")
      .optional(),
    bankName: z.string().trim().min(2).max(120).optional(),
    accountType: z.enum(["Bank", "Mobile", "Cash", "Card"]).optional(),
    currency: z.enum(["BDT"]).optional(),
    creditLimit: z.number().positive().optional(),
    cardNetwork: z.enum(["visa", "mastercard", "amex"]).optional(),
    reservedCreditAmount: z.number().min(0).optional(),
    statementDay: z.number().int().min(1).max(28).optional(),
    paymentDueDay: z.number().int().min(1).max(28).optional(),
    statementBalance: z.number().min(0).optional(),
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

export const payCreditCardSchema = z.object({
  params: z.object({
    id: z.string().min(3, "Card account ID must be at least 3 characters long"),
  }),
  body: z.object({
    fromAccountId: z.string().min(3),
    amount: z.number().positive(),
    date: z.coerce.date().optional(),
    notes: z.string().trim().max(200).optional(),
  }),
});

export type IPayCreditCardInput = z.infer<typeof payCreditCardSchema>;
