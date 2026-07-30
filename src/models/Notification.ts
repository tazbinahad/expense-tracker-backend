import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface INotification extends Document {
  memberId: mongoose.Types.ObjectId;
  billId?: mongoose.Types.ObjectId;
  receivableId?: mongoose.Types.ObjectId;
  dedupeKey: string;
  title: string;
  message: string;
  dueAt: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const notificationSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    billId: { type: Schema.Types.ObjectId, ref: "Bill" },
    receivableId: { type: Schema.Types.ObjectId, ref: "Receivable" },
    dedupeKey: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    dueAt: { type: Date, required: true },
    readAt: { type: Date },
  },
  { versionKey: false },
);

notificationSchema.index({ memberId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ memberId: 1, readAt: 1, createdAt: -1 });
notificationSchema.plugin(timestampPlugin);

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
