import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface ILiability extends Document {
  memberId: mongoose.Types.ObjectId;
  name: string;
  type: "loan" | "credit_card_emi";
  lender: string;
  cardAccountId?: mongoose.Types.ObjectId;
  paymentAccountId?: mongoose.Types.ObjectId;
  originalAmount: number;
  remainingAmount: number;
  annualInterestRate: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  startDate: Date;
  nextDueDate: Date;
  notes?: string;
  status: "active" | "paid" | "paused";
  createdAt: Date;
  updatedAt: Date | null;
}

const liabilitySchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["loan", "credit_card_emi"], required: true },
    lender: { type: String, required: true, trim: true },
    cardAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
    paymentAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
    originalAmount: { type: Number, required: true, min: 0.01 },
    remainingAmount: { type: Number, required: true, min: 0 },
    annualInterestRate: { type: Number, default: 0, min: 0 },
    installmentAmount: { type: Number, required: true, min: 0.01 },
    totalInstallments: { type: Number, required: true, min: 1 },
    paidInstallments: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    nextDueDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["active", "paid", "paused"],
      default: "active",
    },
  },
  { versionKey: false },
);

liabilitySchema.index({ memberId: 1, status: 1, nextDueDate: 1 });
liabilitySchema.plugin(timestampPlugin);

export const Liability = mongoose.model<ILiability>("Liability", liabilitySchema);
