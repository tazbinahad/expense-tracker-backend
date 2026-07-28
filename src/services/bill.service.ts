import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Bill } from "../models/Bill";
import { Category } from "../models/Category";
import { Expense } from "../models/Expense";
import { Notification } from "../models/Notification";
import {
  CreateBillInput,
  PayBillInput,
  UpdateBillInput,
} from "../schemas/bill.schema";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";
import { resolveCatalogItems } from "./item.service";

const addMonthClamped = (date: Date, months: number) => {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

const nextOccurrence = (date: Date, recurrence: CreateBillInput["recurrence"]) => {
  const next = new Date(date);
  if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (recurrence === "monthly") return addMonthClamped(next, 1);
  if (recurrence === "yearly") return addMonthClamped(next, 12);
  return next;
};

const validateReferences = async (
  memberId: string,
  categoryId: string,
  accountId?: string,
) => {
  const [category, account] = await Promise.all([
    Category.findOne({ _id: categoryId, memberId, type: "expense" }),
    accountId ? Account.findOne({ _id: accountId, memberId }) : Promise.resolve(null),
  ]);
  if (!category) throw new NotFoundError("Expense category not found");
  if (accountId && !account) throw new NotFoundError("Account not found");
};

export const createBillService = async (memberId: string, data: CreateBillInput) => {
  await validateReferences(memberId, data.categoryId, data.accountId);
  return Bill.create({
    memberId: new mongoose.Types.ObjectId(memberId),
    name: data.name,
    type: data.type,
    amount: roundMoney(data.amount),
    categoryId: new mongoose.Types.ObjectId(data.categoryId),
    recurrence: data.recurrence,
    dueAt: data.dueAt,
    remindAt: data.remindAt,
    ...(data.accountId ? { accountId: new mongoose.Types.ObjectId(data.accountId) } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  });
};

export const getAllBillsService = (memberId: string) =>
  Bill.find({ memberId })
    .populate("accountId", "accountName")
    .populate("categoryId", "categoryName")
    .sort({ status: 1, dueAt: 1 });

export const getBillService = async (memberId: string, id: string) => {
  const bill = await Bill.findOne({ _id: id, memberId });
  if (!bill) throw new NotFoundError("Bill not found");
  return bill;
};

export const updateBillService = async (
  memberId: string,
  id: string,
  data: UpdateBillInput,
) => {
  const bill = await getBillService(memberId, id);
  const categoryId = data.categoryId || bill.categoryId.toString();
  const accountId = data.accountId || bill.accountId?.toString();
  await validateReferences(memberId, categoryId, accountId);
  const dueAt = data.dueAt || bill.dueAt;
  const remindAt = data.remindAt || bill.remindAt;
  if (remindAt > dueAt) {
    throw new BadRequestError("Reminder must be scheduled on or before the due date");
  }
  Object.assign(bill, data, data.amount ? { amount: roundMoney(data.amount) } : {});
  const updated = await bill.save();
  if (data.dueAt || data.remindAt) {
    await Notification.deleteMany({ memberId, billId: id, readAt: { $exists: false } });
  }
  return updated;
};

export const deleteBillService = async (memberId: string, id: string) => {
  const bill = await getBillService(memberId, id);
  if (await Expense.exists({ memberId, billId: id })) {
    throw new ConflictError("Bills with payment history cannot be deleted");
  }
  await Notification.deleteMany({ memberId, billId: id });
  await bill.deleteOne();
  return bill;
};

export const getBillPaymentsService = async (memberId: string, id: string) => {
  await getBillService(memberId, id);
  return Expense.find({ memberId, billId: id })
    .populate("accountId", "accountName")
    .sort({ date: -1 });
};

export const payBillService = async (
  memberId: string,
  id: string,
  data: PayBillInput,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await Bill.findOne({ _id: id, memberId }).session(session);
    if (!bill) throw new NotFoundError("Bill not found");
    if (bill.status !== "active") throw new ConflictError("Only active bills can be paid");
    const accountId = data.accountId || bill.accountId?.toString();
    if (!accountId) throw new BadRequestError("Select an account for this payment");
    const account = await Account.findOne({ _id: accountId, memberId }).session(session);
    if (!account) throw new NotFoundError("Account not found");
    if (account.balance < bill.amount) throw new BadRequestError("Insufficient balance");

    const items = await resolveCatalogItems(
      memberId,
      [{ name: bill.name, price: bill.amount, quantity: 1, ...(bill.notes ? { comments: bill.notes } : {}) }],
      session,
    );
    account.balance = roundMoney(account.balance - bill.amount);
    await account.save({ session });
    const paidAt = data.paidAt || new Date();
    const [payment] = await Expense.create(
      [{
        memberId,
        billId: bill._id,
        categoryId: bill.categoryId,
        accountId: account._id,
        title: `${bill.name} payment`,
        totalAmount: bill.amount,
        subtotal: bill.amount,
        date: paidAt,
        items,
        adjustments: [],
      }],
      { session },
    );

    bill.lastPaidAt = paidAt;
    await Notification.updateMany(
      { memberId, billId: bill._id, readAt: { $exists: false } },
      { readAt: paidAt },
      { session },
    );
    if (bill.recurrence === "one_time") {
      bill.status = "completed";
    } else {
      const reminderLeadTime = bill.dueAt.getTime() - bill.remindAt.getTime();
      bill.dueAt = nextOccurrence(bill.dueAt, bill.recurrence);
      bill.remindAt = new Date(bill.dueAt.getTime() - reminderLeadTime);
    }
    await bill.save({ session });
    await session.commitTransaction();
    return { bill, payment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
