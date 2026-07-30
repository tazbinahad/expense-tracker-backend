import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IReceivable extends Document {
  memberId: mongoose.Types.ObjectId;
  borrower: string;
  sourceAccountId: mongoose.Types.ObjectId;
  principalAmount: number;
  outstandingAmount: number;
  lentAt: Date;
  dueAt?: Date;
  remindAt?: Date;
  notes?: string;
  status: "active" | "paid";
  createdAt: Date;
  updatedAt: Date | null;
}

const receivableSchema = new Schema<IReceivable>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    borrower: { type: String, required: true, trim: true },
    sourceAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    principalAmount: { type: Number, required: true, min: 0.01 },
    outstandingAmount: { type: Number, required: true, min: 0 },
    lentAt: { type: Date, required: true },
    dueAt: { type: Date },
    remindAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["active", "paid"],
      default: "active",
      required: true,
    },
  },
  { versionKey: false },
);

receivableSchema.index({ memberId: 1, status: 1, dueAt: 1 });
receivableSchema.plugin(timestampPlugin);

export const Receivable = mongoose.model<IReceivable>(
  "Receivable",
  receivableSchema,
);
