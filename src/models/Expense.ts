import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

// Sub-interface for items
interface IExpenseItem {
  catalogItemId?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  comments?: string;
}

interface IExpenseAdjustment {
  kind: "vat" | "delivery" | "tip" | "platform" | "service" | "discount" | "other";
  label: string;
  type: "charge" | "discount";
  amount: number;
}

export interface IExpense extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  liabilityId?: mongoose.Types.ObjectId;
  billId?: mongoose.Types.ObjectId;
  title: string;
  totalAmount: number;
  subtotal: number;
  items: IExpenseItem[];
  adjustments: IExpenseAdjustment[];
  date: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const expenseSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    liabilityId: { type: Schema.Types.ObjectId, ref: "Liability" },
    billId: { type: Schema.Types.ObjectId, ref: "Bill" },
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    subtotal: { type: Number, required: true, default: 0 },
    date: { type: Date, default: Date.now, required: true },

    // Embedded Items Array
    items: [
      {
        catalogItemId: { type: Schema.Types.ObjectId, ref: "Item" },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        comments: { type: String },
      },
    ],
    adjustments: [
      {
        kind: {
          type: String,
          enum: ["vat", "delivery", "tip", "platform", "service", "discount", "other"],
          required: true,
        },
        label: { type: String, required: true, trim: true },
        type: { type: String, enum: ["charge", "discount"], required: true },
        amount: { type: Number, required: true, min: 0.01 },
      },
    ],
  },
  {
    versionKey: false,
  }
);

// Apply the timestamp plugin
expenseSchema.plugin(timestampPlugin);
expenseSchema.index({ memberId: 1, liabilityId: 1, date: -1 });
expenseSchema.index({ memberId: 1, billId: 1, date: -1 });

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
