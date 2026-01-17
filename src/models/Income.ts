import mongoose, { Schema, Document } from "mongoose";

export interface IIncome extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  source: string;
  amount: number;
  date: Date;
}

const incomeSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    source: { type: String, required: true }, // e.g. "Salary"
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now, required: true },
  },
  {
    versionKey: false,
  }
);

export const Income = mongoose.model<IIncome>("Income", incomeSchema);
