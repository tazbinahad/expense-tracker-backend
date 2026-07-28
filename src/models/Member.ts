import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IMember extends Document {
  mid: string;
  name: string;
  email: string;
  password: string;
  memberType: string;
  createdAt: Date;
  updatedAt: Date | null;
}

const memberSchema = new Schema<IMember>(
  {
    mid: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    memberType: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

// Apply the timestamp plugin
memberSchema.plugin(timestampPlugin);

export const Member = mongoose.model<IMember>("Member", memberSchema);
