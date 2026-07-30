import mongoose, { Document, Schema } from "mongoose";

export interface IReceivableRepayment extends Document {
  memberId: mongoose.Types.ObjectId;
  receivableId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  notes?: string;
}

const receivableRepaymentSchema = new Schema<IReceivableRepayment>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    receivableId: {
      type: Schema.Types.ObjectId,
      ref: "Receivable",
      required: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, versionKey: false },
);

receivableRepaymentSchema.index({ memberId: 1, receivableId: 1, date: -1 });

export const ReceivableRepayment = mongoose.model<IReceivableRepayment>(
  "ReceivableRepayment",
  receivableRepaymentSchema,
);
