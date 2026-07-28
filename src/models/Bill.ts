import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IBill extends Document {
  memberId: mongoose.Types.ObjectId;
  name: string;
  type: "rent" | "utilities" | "internet" | "subscription" | "insurance" | "other";
  amount: number;
  accountId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  recurrence: "one_time" | "weekly" | "monthly" | "yearly";
  dueAt: Date;
  remindAt: Date;
  notes?: string;
  status: "active" | "paused" | "completed";
  lastPaidAt?: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const billSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["rent", "utilities", "internet", "subscription", "insurance", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    recurrence: {
      type: String,
      enum: ["one_time", "weekly", "monthly", "yearly"],
      required: true,
    },
    dueAt: { type: Date, required: true },
    remindAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    lastPaidAt: { type: Date },
  },
  { versionKey: false },
);

billSchema.index({ memberId: 1, status: 1, remindAt: 1 });
billSchema.plugin(timestampPlugin);

export const Bill = mongoose.model<IBill>("Bill", billSchema);
