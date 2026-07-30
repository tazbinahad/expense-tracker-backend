import { z } from "zod";

const idParams = z.object({ id: z.string().min(3) });

export const createReceivableSchema = z.object({
  body: z
    .object({
      borrower: z.string().trim().min(2).max(100),
      sourceAccountId: z.string().min(3),
      principalAmount: z.number().positive(),
      lentAt: z.coerce.date(),
      dueAt: z.coerce.date().optional(),
      remindAt: z.coerce.date().optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .superRefine((body, context) => {
      if (body.remindAt && !body.dueAt) {
        context.addIssue({
          code: "custom",
          path: ["remindAt"],
          message: "A due date is required when setting a reminder",
        });
      }
      if (body.dueAt && body.dueAt < body.lentAt) {
        context.addIssue({
          code: "custom",
          path: ["dueAt"],
          message: "Due date cannot be before the lending date",
        });
      }
      if (body.dueAt && body.remindAt && body.remindAt > body.dueAt) {
        context.addIssue({
          code: "custom",
          path: ["remindAt"],
          message: "Reminder cannot be after the due date",
        });
      }
    }),
});

export const updateReceivableSchema = z.object({
  params: idParams,
  body: z
    .object({
      borrower: z.string().trim().min(2).max(100).optional(),
      dueAt: z.coerce.date().nullable().optional(),
      remindAt: z.coerce.date().nullable().optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "No fields to update"),
});

export const receivableIdSchema = z.object({ params: idParams });

export const recordReceivableRepaymentSchema = z.object({
  params: idParams,
  body: z.object({
    accountId: z.string().min(3),
    amount: z.number().positive(),
    date: z.coerce.date().optional(),
    notes: z.string().trim().max(200).optional(),
  }),
});

export const deleteReceivableRepaymentSchema = z.object({
  params: z.object({
    id: z.string().min(3),
    repaymentId: z.string().min(3),
  }),
});

export type CreateReceivableInput = z.infer<
  typeof createReceivableSchema
>["body"];
export type UpdateReceivableInput = z.infer<
  typeof updateReceivableSchema
>["body"];
export type RecordReceivableRepaymentInput = z.infer<
  typeof recordReceivableRepaymentSchema
>["body"];
