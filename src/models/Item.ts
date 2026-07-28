import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IItem extends Document {
  memberId: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  lastPrice: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const itemSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    lastPrice: { type: Number, required: true, min: 0.01 },
    lastUsedAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

itemSchema.index({ memberId: 1, normalizedName: 1 }, { unique: true });
itemSchema.index({ memberId: 1, lastUsedAt: -1 });
itemSchema.plugin(timestampPlugin);

export const Item = mongoose.model<IItem>("Item", itemSchema);
