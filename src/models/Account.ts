import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IAccount extends Document {
  memberId: mongoose.Types.ObjectId;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  creditLimit?: number;
  cardNetwork?: "visa" | "mastercard" | "amex";
  reservedCreditAmount?: number;
  statementDay?: number;
  paymentDueDay?: number;
  statementBalance?: number;
  nextStatementDate?: Date;
  nextPaymentDueDate?: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const accountSchema = new Schema<IAccount>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true },
    accountType: {
      type: String,
      enum: ["Bank", "Mobile", "Cash", "Card"],
      required: true,
    },
    balance: { type: Number, default: 0, required: true },
    currency: { type: String, default: "BDT", required: true },
    creditLimit: { type: Number, min: 0 },
    cardNetwork: {
      type: String,
      enum: ["visa", "mastercard", "amex"],
    },
    reservedCreditAmount: { type: Number, min: 0, default: 0 },
    statementDay: { type: Number, min: 1, max: 28 },
    paymentDueDay: { type: Number, min: 1, max: 28 },
    statementBalance: { type: Number, min: 0, default: 0 },
    nextStatementDate: { type: Date },
    nextPaymentDueDate: { type: Date },
  },
  {
    versionKey: false,
  },
);

accountSchema.index({ memberId: 1, accountNumber: 1 }, { unique: true });

// Apply the timestamp plugin
accountSchema.plugin(timestampPlugin);

export const Account = mongoose.model<IAccount>("Account", accountSchema);
