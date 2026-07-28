import { z } from "zod";

const idParams = z.object({ id: z.string().min(3) });
const billBody = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["rent", "utilities", "internet", "subscription", "insurance", "other"]),
  amount: z.number().positive(),
  accountId: z.string().min(3).optional(),
  categoryId: z.string().min(3),
  recurrence: z.enum(["one_time", "weekly", "monthly", "yearly"]),
  dueAt: z.coerce.date(),
  remindAt: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
}).refine((value) => value.remindAt <= value.dueAt, {
  message: "Reminder must be scheduled on or before the due date",
  path: ["remindAt"],
});

export const createBillSchema = z.object({ body: billBody });
export const updateBillSchema = z.object({
  params: idParams,
  body: billBody
    .partial()
    .extend({ status: z.enum(["active", "paused"]).optional() })
    .refine((value) => Object.keys(value).length > 0, "No fields to update"),
});
export const billIdSchema = z.object({ params: idParams });
export const payBillSchema = z.object({
  params: idParams,
  body: z.object({
    accountId: z.string().min(3).optional(),
    paidAt: z.coerce.date().optional(),
  }),
});

export type CreateBillInput = z.infer<typeof billBody>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>["body"];
export type PayBillInput = z.infer<typeof payBillSchema>["body"];
