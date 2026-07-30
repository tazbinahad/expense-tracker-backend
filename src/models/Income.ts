import mongoose, { Schema, Document } from "mongoose";

export interface IIncome extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  source: string;
  amount: number;
  date: Date;
  recurringIncomeId?: mongoose.Types.ObjectId;
  occurrenceKey?: string;
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
    recurringIncomeId: {
      type: Schema.Types.ObjectId,
      ref: "RecurringIncome",
    },
    occurrenceKey: { type: String },
  },
  {
    versionKey: false,
  }
);

incomeSchema.index(
  { recurringIncomeId: 1, occurrenceKey: 1 },
  { unique: true, sparse: true },
);

export const Income = mongoose.model<IIncome>("Income", incomeSchema);
