import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface ICategory extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryName: string;
  type: "income" | "expense";
  createdAt: Date;
  updatedAt: Date | null;
}

const categorySchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    categoryName: { type: String, required: true },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

// Apply the timestamp plugin
categorySchema.plugin(timestampPlugin);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
