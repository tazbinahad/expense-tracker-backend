import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IVehicle extends Document {
  memberId: mongoose.Types.ObjectId;
  name: string;
  make?: string;
  modelName?: string;
  registrationNumber?: string;
  createdAt: Date;
  updatedAt: Date | null;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    make: { type: String, trim: true },
    modelName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
  },
  { versionKey: false },
);

vehicleSchema.index({ memberId: 1, name: 1 }, { unique: true });
vehicleSchema.plugin(timestampPlugin);

export const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema);
