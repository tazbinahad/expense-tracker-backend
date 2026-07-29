import mongoose, { Schema, Document } from "mongoose";

export interface ITransfer extends Document {
  memberId: mongoose.Types.ObjectId;
  fromAccountId: mongoose.Types.ObjectId;
  toAccountId: mongoose.Types.ObjectId;
  amount: number;
  transferFee: number;
  description: string;
  transferType: "transfer" | "card_payment";
  liabilityId?: mongoose.Types.ObjectId;
  date: Date;
}

const transferSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    fromAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    amount: { type: Number, required: true },
    transferFee: { type: Number, default: 0 },
    description: { type: String },
    transferType: {
      type: String,
      enum: ["transfer", "card_payment"],
      default: "transfer",
    },
    liabilityId: { type: Schema.Types.ObjectId, ref: "Liability" },
    date: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

export const Transfer = mongoose.model<ITransfer>("Transfer", transferSchema);
