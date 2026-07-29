import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import { Expense } from "../models/Expense";
import { Vehicle } from "../models/Vehicle";
import { VehicleLog } from "../models/VehicleLog";
import type {
  CreateVehicleInput,
  CreateVehicleLogInput,
} from "../schemas/vehicle.schema";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";
import { assertExpenseCapacity } from "./expense.service";
import { resolveCatalogItems } from "./item.service";

export const createVehicleService = async (
  memberId: string,
  data: CreateVehicleInput,
) => {
  const duplicate = await Vehicle.exists({ memberId, name: data.name });
  if (duplicate) throw new ConflictError("A vehicle with this name already exists");
  return new Vehicle({
    memberId,
    name: data.name,
    ...(data.make && { make: data.make }),
    ...(data.modelName && { modelName: data.modelName }),
    ...(data.registrationNumber && {
      registrationNumber: data.registrationNumber,
    }),
  }).save();
};

export const getAllVehiclesService = (memberId: string) =>
  Vehicle.find({ memberId }).sort({ createdAt: 1 });

export const getVehicleLogsService = async (
  memberId: string,
  vehicleId: string,
) => {
  const vehicle = await Vehicle.exists({ _id: vehicleId, memberId });
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  return VehicleLog.find({ memberId, vehicleId })
    .populate("accountId", "accountName")
    .populate("categoryId", "categoryName")
    .sort({ date: -1, createdAt: -1 });
};

export const createVehicleLogService = async (
  memberId: string,
  vehicleId: string,
  data: CreateVehicleLogInput,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      memberId,
    }).session(session);
    const account = await Account.findOne({
      _id: data.accountId,
      memberId,
    }).session(session);
    const category = await Category.findOne({
      memberId,
      type: "expense",
      slug: data.type === "fuel" ? "fuel" : "vehicle-maintenance",
    }).session(session);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (!account) throw new NotFoundError("Payment account not found");
    if (!category) throw new NotFoundError("Vehicle expense category not found");

    const duplicate = await VehicleLog.exists({
      memberId,
      vehicleId,
      type: data.type,
      date: data.date,
      odometerKm: data.odometerKm,
    }).session(session);
    if (duplicate) {
      throw new ConflictError("This vehicle log already exists");
    }

    assertExpenseCapacity(account, data.totalCost);

    let distanceKm: number | undefined;
    let mileageKmPerLiter: number | undefined;
    if (data.type === "fuel" && data.fullTank) {
      const previous = await VehicleLog.findOne({
        memberId,
        vehicleId,
        type: "fuel",
        fullTank: true,
        odometerKm: { $lt: data.odometerKm },
      })
        .sort({ odometerKm: -1 })
        .session(session);
      if (previous) {
        distanceKm = roundMoney(data.odometerKm - previous.odometerKm);
        mileageKmPerLiter = roundMoney(distanceKm / data.fuelLiters);
      }
    }

    const logId = new mongoose.Types.ObjectId();
    const expenseId = new mongoose.Types.ObjectId();
    const itemName =
      data.type === "fuel" ? `${vehicle.name} fuel` : data.serviceName;
    const resolvedItems = await resolveCatalogItems(
      memberId,
      [
        {
          name: itemName,
          price: roundMoney(data.totalCost),
          quantity: 1,
          comments: data.notes,
        },
      ],
      session,
    );
    const item = resolvedItems[0]!;

    account.balance = roundMoney(account.balance - data.totalCost);
    await account.save({ session });

    const expense = new Expense({
      _id: expenseId,
      memberId,
      categoryId: category._id,
      accountId: account._id,
      vehicleLogId: logId,
      title:
        data.type === "fuel"
          ? `${vehicle.name} fuel`
          : `${vehicle.name} · ${data.serviceName}`,
      totalAmount: roundMoney(data.totalCost),
      subtotal: roundMoney(data.totalCost),
      items: [item],
      adjustments: [],
      date: data.date,
    });
    await expense.save({ session });

    const log = new VehicleLog({
      _id: logId,
      memberId,
      vehicleId: vehicle._id,
      expenseId: expense._id,
      accountId: account._id,
      categoryId: category._id,
      type: data.type,
      date: data.date,
      odometerKm: data.odometerKm,
      totalCost: roundMoney(data.totalCost),
      ...(data.notes && { notes: data.notes }),
      ...(data.type === "fuel"
        ? {
            fuelLiters: data.fuelLiters,
            pricePerLiter: roundMoney(data.totalCost / data.fuelLiters),
            fullTank: data.fullTank,
            ...(distanceKm !== undefined && { distanceKm }),
            ...(mileageKmPerLiter !== undefined && { mileageKmPerLiter }),
          }
        : {
            serviceName: data.serviceName,
            ...(data.nextServiceOdometerKm !== undefined && {
              nextServiceOdometerKm: data.nextServiceOdometerKm,
            }),
          }),
    });
    await log.save({ session });

    await session.commitTransaction();
    return log;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const deleteVehicleLogService = async (
  memberId: string,
  logId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const log = await VehicleLog.findOne({ _id: logId, memberId }).session(session);
    if (!log) throw new NotFoundError("Vehicle log not found");
    const expense = await Expense.findOne({
      _id: log.expenseId,
      memberId,
      vehicleLogId: log._id,
    }).session(session);
    if (!expense) throw new BadRequestError("Linked expense is missing");
    const account = await Account.findOne({
      _id: expense.accountId,
      memberId,
    }).session(session);
    if (!account) throw new NotFoundError("Payment account not found");

    account.balance = roundMoney(account.balance + expense.totalAmount);
    await account.save({ session });
    await Promise.all([
      Expense.deleteOne({ _id: expense._id }, { session }),
      VehicleLog.deleteOne({ _id: log._id }, { session }),
    ]);
    await session.commitTransaction();
    return log;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
