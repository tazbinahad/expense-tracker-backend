import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Receivable } from "../models/Receivable";
import { ReceivableRepayment } from "../models/ReceivableRepayment";
import {
  CreateReceivableInput,
  RecordReceivableRepaymentInput,
  UpdateReceivableInput,
} from "../schemas/receivable.schema";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";

export const createReceivableService = async (
  memberId: string,
  data: CreateReceivableInput,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await Account.findOne({
      _id: data.sourceAccountId,
      memberId,
      accountType: { $ne: "Card" },
    }).session(session);
    if (!account) throw new NotFoundError("Source account not found");
    if (account.balance < data.principalAmount) {
      throw new BadRequestError("Insufficient balance in source account");
    }

    account.balance = roundMoney(account.balance - data.principalAmount);
    await account.save({ session });

    const [receivable] = await Receivable.create(
      [{
        memberId,
        borrower: data.borrower,
        sourceAccountId: data.sourceAccountId,
        principalAmount: roundMoney(data.principalAmount),
        outstandingAmount: roundMoney(data.principalAmount),
        lentAt: data.lentAt,
        ...(data.dueAt ? { dueAt: data.dueAt } : {}),
        ...(data.remindAt ? { remindAt: data.remindAt } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      }],
      { session },
    );
    if (!receivable) throw new BadRequestError("Unable to create money lent record");

    await session.commitTransaction();
    return receivable;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getAllReceivablesService = (memberId: string) =>
  Receivable.find({ memberId })
    .populate("sourceAccountId", "accountName")
    .sort({ status: 1, dueAt: 1, lentAt: -1 });

export const getReceivableService = async (memberId: string, id: string) => {
  const receivable = await Receivable.findOne({ _id: id, memberId }).populate(
    "sourceAccountId",
    "accountName",
  );
  if (!receivable) throw new NotFoundError("Money lent record not found");
  return receivable;
};

export const updateReceivableService = async (
  memberId: string,
  id: string,
  data: UpdateReceivableInput,
) => {
  const receivable = await Receivable.findOne({ _id: id, memberId });
  if (!receivable) throw new NotFoundError("Money lent record not found");
  if (receivable.status === "paid") {
    throw new ConflictError("A settled lending record cannot be edited");
  }
  if (data.dueAt && data.dueAt < receivable.lentAt) {
    throw new BadRequestError("Due date cannot be before the lending date");
  }
  if (data.remindAt && !data.dueAt && !receivable.dueAt) {
    throw new BadRequestError("A due date is required when setting a reminder");
  }

  Object.assign(receivable, data);
  return receivable.save();
};

export const deleteReceivableService = async (
  memberId: string,
  id: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receivable = await Receivable.findOne({ _id: id, memberId }).session(
      session,
    );
    if (!receivable) throw new NotFoundError("Money lent record not found");
    if (await ReceivableRepayment.exists({ memberId, receivableId: id }).session(session)) {
      throw new ConflictError("Money lent records with repayment history cannot be deleted");
    }

    const source = await Account.findOne({
      _id: receivable.sourceAccountId,
      memberId,
    }).session(session);
    if (!source) throw new NotFoundError("Original source account not found");
    source.balance = roundMoney(source.balance + receivable.principalAmount);
    await source.save({ session });
    await receivable.deleteOne({ session });

    await session.commitTransaction();
    return receivable;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getReceivableRepaymentsService = async (
  memberId: string,
  id: string,
) => {
  await getReceivableService(memberId, id);
  return ReceivableRepayment.find({ memberId, receivableId: id })
    .populate("accountId", "accountName")
    .sort({ date: -1 });
};

export const recordReceivableRepaymentService = async (
  memberId: string,
  id: string,
  data: RecordReceivableRepaymentInput,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receivable = await Receivable.findOne({ _id: id, memberId }).session(
      session,
    );
    if (!receivable) throw new NotFoundError("Money lent record not found");
    if (receivable.status !== "active") {
      throw new ConflictError("This lending record is already settled");
    }
    if (data.amount > receivable.outstandingAmount) {
      throw new BadRequestError("Repayment cannot exceed the outstanding amount");
    }

    const account = await Account.findOne({
      _id: data.accountId,
      memberId,
      accountType: { $ne: "Card" },
    }).session(session);
    if (!account) throw new NotFoundError("Repayment account not found");

    account.balance = roundMoney(account.balance + data.amount);
    await account.save({ session });
    receivable.outstandingAmount = roundMoney(
      receivable.outstandingAmount - data.amount,
    );
    if (receivable.outstandingAmount === 0) receivable.status = "paid";
    await receivable.save({ session });

    const [repayment] = await ReceivableRepayment.create(
      [{
        memberId,
        receivableId: receivable._id,
        accountId: data.accountId,
        amount: roundMoney(data.amount),
        date: data.date || new Date(),
        ...(data.notes ? { notes: data.notes } : {}),
      }],
      { session },
    );
    if (!repayment) throw new BadRequestError("Unable to record repayment");

    await session.commitTransaction();
    return { receivable, repayment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteReceivableRepaymentService = async (
  memberId: string,
  id: string,
  repaymentId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receivable = await Receivable.findOne({
      _id: id,
      memberId,
    }).session(session);
    const repayment = await ReceivableRepayment.findOne({
      _id: repaymentId,
      receivableId: id,
      memberId,
    }).session(session);
    if (!receivable) throw new NotFoundError("Money lent record not found");
    if (!repayment) throw new NotFoundError("Repayment not found");

    const account = await Account.findOne({
      _id: repayment.accountId,
      memberId,
    }).session(session);
    if (!account) throw new NotFoundError("Repayment account not found");
    if (account.balance < repayment.amount) {
      throw new BadRequestError(
        "Repayment cannot be removed because those funds have been spent",
      );
    }

    account.balance = roundMoney(account.balance - repayment.amount);
    await account.save({ session });
    receivable.outstandingAmount = roundMoney(
      receivable.outstandingAmount + repayment.amount,
    );
    receivable.status = "active";
    await receivable.save({ session });
    await repayment.deleteOne({ session });

    await session.commitTransaction();
    return { receivable, repayment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
