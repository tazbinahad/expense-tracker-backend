import mongoose, { Document, Schema } from "mongoose";
import { timestampPlugin } from "../plugins/timestamp.plugin";

export interface IVehicleLog extends Document {
  memberId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: "fuel" | "service";
  date: Date;
  odometerKm: number;
  totalCost: number;
  fuelLiters?: number;
  pricePerLiter?: number;
  fullTank?: boolean;
  distanceKm?: number;
  mileageKmPerLiter?: number;
  serviceName?: string;
  nextServiceOdometerKm?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date | null;
}

const vehicleLogSchema = new Schema<IVehicleLog>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["fuel", "service"], required: true },
    date: { type: Date, required: true },
    odometerKm: { type: Number, min: 0, required: true },
    totalCost: { type: Number, min: 0.01, required: true },
    fuelLiters: { type: Number, min: 0.01 },
    pricePerLiter: { type: Number, min: 0.01 },
    fullTank: { type: Boolean },
    distanceKm: { type: Number, min: 0 },
    mileageKmPerLiter: { type: Number, min: 0 },
    serviceName: { type: String, trim: true },
    nextServiceOdometerKm: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { versionKey: false },
);

vehicleLogSchema.index({ memberId: 1, vehicleId: 1, date: -1 });
vehicleLogSchema.index(
  { memberId: 1, vehicleId: 1, type: 1, date: 1, odometerKm: 1 },
  { unique: true },
);
vehicleLogSchema.plugin(timestampPlugin);

export const VehicleLog = mongoose.model<IVehicleLog>(
  "VehicleLog",
  vehicleLogSchema,
);
