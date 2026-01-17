import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

// Sub-interface for items
interface IExpenseItem {
  name: string;
  price: number;
  quantity: number;
  comments?: string;
}

export interface IExpense extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  title: string;
  totalAmount: number;
  items: IExpenseItem[];
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
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true },

    // Embedded Items Array
    items: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        comments: { type: String },
      },
    ],
  },
  {
    versionKey: false,
  }
);

// Apply the timestamp plugin
expenseSchema.plugin(timestampPlugin);

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
