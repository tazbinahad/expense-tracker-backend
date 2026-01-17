import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IAccount extends Document {
  memberId: mongoose.Types.ObjectId;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date | null;
}

const accountSchema = new Schema<IAccount>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountType: {
      type: String,
      enum: ["Bank", "Mobile", "Cash", "Card"],
      required: true,
    },
    balance: { type: Number, default: 0, required: true },
    currency: { type: String, default: "BDT", required: true },
  },
  {
    versionKey: false,
  }
);

// Apply the timestamp plugin
accountSchema.plugin(timestampPlugin);

export const Account = mongoose.model<IAccount>("Account", accountSchema);
