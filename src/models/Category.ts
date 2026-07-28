import mongoose, { Schema, Document } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface ICategory extends Document {
  memberId: mongoose.Types.ObjectId;
  categoryName: string;
  type: "income" | "expense";
  slug?: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
}

const categorySchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    categoryName: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    icon: { type: String, trim: true },
    color: { type: String, trim: true },
    isSystem: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
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

categorySchema.index(
  { memberId: 1, categoryName: 1, type: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

// Apply the timestamp plugin
categorySchema.plugin(timestampPlugin);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
