import { z } from "zod";

const idParams = z.object({ id: z.string().min(3) });

export const createLiabilitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    type: z.enum(["loan", "credit_card_emi"]),
    lender: z.string().trim().min(2).max(100),
    cardAccountId: z.string().min(3).optional(),
    paymentAccountId: z.string().min(3).optional(),
    originalAmount: z.number().positive(),
    remainingAmount: z.number().min(0).optional(),
    annualInterestRate: z.number().min(0).max(100).default(0),
    installmentAmount: z.number().positive(),
    totalInstallments: z.number().int().positive(),
    paidInstallments: z.number().int().min(0).default(0),
    startDate: z.coerce.date(),
    nextDueDate: z.coerce.date(),
    notes: z.string().trim().max(500).optional(),
  }).superRefine((body, context) => {
    if (body.type === "credit_card_emi" && !body.cardAccountId) {
      context.addIssue({
        code: "custom",
        path: ["cardAccountId"],
        message: "A credit card is required for credit card EMI",
      });
    }
    if (body.paidInstallments > body.totalInstallments) {
      context.addIssue({
        code: "custom",
        path: ["paidInstallments"],
        message: "Paid installments cannot exceed total installments",
      });
    }
    if (
      body.remainingAmount !== undefined &&
      body.remainingAmount > body.originalAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["remainingAmount"],
        message: "Remaining balance cannot exceed total payable",
      });
    }
  }),
});

export const updateLiabilitySchema = z.object({
  params: idParams,
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      lender: z.string().trim().min(2).max(100).optional(),
      annualInterestRate: z.number().min(0).max(100).optional(),
      installmentAmount: z.number().positive().optional(),
      paymentAccountId: z.string().min(3).optional(),
      totalInstallments: z.number().int().positive().optional(),
      nextDueDate: z.coerce.date().optional(),
      notes: z.string().trim().max(500).optional(),
      status: z.enum(["active", "paused"]).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "No fields to update"),
});

export const liabilityIdSchema = z.object({ params: idParams });

export const recordLiabilityPaymentSchema = z.object({
  params: idParams,
  body: z.object({
    accountId: z.string().min(3),
    amount: z.number().positive(),
    date: z.coerce.date().optional(),
    notes: z.string().trim().max(200).optional(),
  }),
});

export type CreateLiabilityInput = z.infer<typeof createLiabilitySchema>["body"];
export type UpdateLiabilityInput = z.infer<typeof updateLiabilitySchema>["body"];
export type RecordLiabilityPaymentInput = z.infer<typeof recordLiabilityPaymentSchema>["body"];
