import mongoose, { Document, Schema } from "mongoose";

export interface IRecurringIncome extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  source: string;
  amount: number;
  frequency: "monthly";
  monthlyRule: "last_working_day";
  timezone: "Asia/Dhaka";
  nextRunAt: Date;
  active: boolean;
}

const recurringIncomeSchema = new Schema<IRecurringIncome>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    source: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ["monthly"], required: true },
    monthlyRule: {
      type: String,
      enum: ["last_working_day"],
      required: true,
    },
    timezone: {
      type: String,
      enum: ["Asia/Dhaka"],
      default: "Asia/Dhaka",
      required: true,
    },
    nextRunAt: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const RecurringIncome = mongoose.model<IRecurringIncome>(
  "RecurringIncome",
  recurringIncomeSchema,
);
