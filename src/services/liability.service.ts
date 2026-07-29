import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import { Expense } from "../models/Expense";
import { Liability } from "../models/Liability";
import {
  CreateLiabilityInput,
  RecordLiabilityPaymentInput,
  UpdateLiabilityInput,
} from "../schemas/liability.schema";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";
import { resolveCatalogItems } from "./item.service";

const addMonthClamped = (date: Date) => {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

export const createLiabilityService = async (
  memberId: string,
  data: CreateLiabilityInput,
) => {
  if (data.type === "credit_card_emi") {
    const cardAccountId = data.cardAccountId;
    if (!cardAccountId) {
      throw new BadRequestError("A credit card is required for credit card EMI");
    }
    const card = await Account.findOne({
      _id: cardAccountId,
      memberId,
      accountType: "Card",
    });
    if (!card) throw new NotFoundError("Credit card account not found");
  }
  if (data.paymentAccountId) {
    const paymentAccount = await Account.findOne({
      _id: data.paymentAccountId,
      memberId,
      accountType: { $ne: "Card" },
    });
    if (!paymentAccount) throw new NotFoundError("Payment account not found");
  }
  const paidInstallments = data.paidInstallments ?? 0;
  const paidAmount = roundMoney(
    Math.min(data.originalAmount, paidInstallments * data.installmentAmount),
  );
  const remainingAmount =
    data.remainingAmount === undefined
      ? roundMoney(data.originalAmount - paidAmount)
      : roundMoney(data.remainingAmount);

  return Liability.create({
    name: data.name,
    type: data.type,
    lender: data.lender,
    ...(data.cardAccountId ? { cardAccountId: data.cardAccountId } : {}),
    ...(data.paymentAccountId
      ? { paymentAccountId: data.paymentAccountId }
      : {}),
    memberId: new mongoose.Types.ObjectId(memberId),
    originalAmount: roundMoney(data.originalAmount),
    remainingAmount,
    annualInterestRate: data.annualInterestRate,
    installmentAmount: roundMoney(data.installmentAmount),
    totalInstallments: data.totalInstallments,
    paidInstallments,
    startDate: data.startDate,
    nextDueDate: data.nextDueDate,
    ...(data.notes ? { notes: data.notes } : {}),
    ...(remainingAmount === 0 ? { status: "paid" } : {}),
  });
};

export const getAllLiabilitiesService = (memberId: string) =>
  Liability.find({ memberId }).sort({ status: 1, nextDueDate: 1 });

export const getLiabilityService = async (memberId: string, id: string) => {
  const liability = await Liability.findOne({ _id: id, memberId });
  if (!liability) throw new NotFoundError("Liability not found");
  return liability;
};

export const updateLiabilityService = async (
  memberId: string,
  id: string,
  data: UpdateLiabilityInput,
) => {
  const liability = await Liability.findOne({ _id: id, memberId });
  if (!liability) throw new NotFoundError("Liability not found");
  if (liability.status === "paid") {
    throw new ConflictError("A paid liability cannot be edited");
  }
  if (
    data.totalInstallments !== undefined &&
    data.totalInstallments < liability.paidInstallments
  ) {
    throw new BadRequestError("Total installments cannot be below installments paid");
  }
  if (data.paymentAccountId) {
    const paymentAccount = await Account.findOne({
      _id: data.paymentAccountId,
      memberId,
      accountType: { $ne: "Card" },
    });
    if (!paymentAccount) throw new NotFoundError("Payment account not found");
  }
  Object.assign(liability, data);
  return liability.save();
};

export const deleteLiabilityService = async (memberId: string, id: string) => {
  const liability = await Liability.findOne({ _id: id, memberId });
  if (!liability) throw new NotFoundError("Liability not found");
  const hasPayments = await Expense.exists({ memberId, liabilityId: id });
  if (hasPayments) {
    throw new ConflictError("Liabilities with payment history cannot be deleted");
  }
  await liability.deleteOne();
  return liability;
};

export const getLiabilityPaymentsService = async (
  memberId: string,
  id: string,
) => {
  await getLiabilityService(memberId, id);
  return Expense.find({ memberId, liabilityId: id })
    .populate("accountId", "accountName")
    .populate("categoryId", "categoryName")
    .sort({ date: -1 });
};

export const recordLiabilityPaymentService = async (
  memberId: string,
  id: string,
  data: RecordLiabilityPaymentInput,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const liability = await Liability.findOne({ _id: id, memberId }).session(session);
    if (!liability) throw new NotFoundError("Liability not found");
    if (liability.status !== "active") {
      throw new ConflictError("Only active liabilities can receive payments");
    }
    if (data.amount > liability.remainingAmount) {
      throw new BadRequestError("Payment cannot exceed the remaining balance");
    }

    const paymentAccountId =
      liability.type === "credit_card_emi"
        ? liability.cardAccountId?.toString()
        : data.accountId;
    if (!paymentAccountId) {
      throw new BadRequestError("Credit card EMI is not linked to a card");
    }
    const account = await Account.findOne({
      _id: paymentAccountId,
      memberId,
    }).session(session);
    if (!account) throw new NotFoundError("Account not found");
    if (liability.type === "credit_card_emi") {
      if (account.accountType !== "Card") {
        throw new BadRequestError("Credit card EMI must be charged to a card");
      }
      const projectedOutstanding = Math.max(0, -(account.balance - data.amount));
      const projectedReservedCredit = Math.max(
        0,
        (account.reservedCreditAmount || 0) - data.amount,
      );
      if (
        account.creditLimit !== undefined &&
        projectedOutstanding + projectedReservedCredit > account.creditLimit
      ) {
        throw new BadRequestError("Credit limit exceeded");
      }
    } else if (account.balance < data.amount) {
      throw new BadRequestError("Insufficient balance");
    }

    const categoryName =
      liability.type === "loan" ? "Loan EMI" : "Credit card EMI";
    const category = await Category.findOne({
      memberId,
      categoryName,
      type: "expense",
    }).session(session);
    if (!category) throw new NotFoundError(`${categoryName} category not found`);

    account.balance = roundMoney(account.balance - data.amount);
    if (liability.type === "credit_card_emi") {
      account.reservedCreditAmount = roundMoney(
        Math.max(0, (account.reservedCreditAmount || 0) - data.amount),
      );
      account.statementBalance = roundMoney(
        (account.statementBalance || 0) + data.amount,
      );
    }
    await account.save({ session });

    const paymentItems = await resolveCatalogItems(
      memberId,
      [{
        name:
          liability.type === "loan"
            ? "Loan EMI payment"
            : "Credit card EMI payment",
        price: data.amount,
        quantity: 1,
        ...(data.notes ? { comments: data.notes } : {}),
      }],
      session,
    );
    const [payment] = await Expense.create(
      [
        {
          memberId,
          liabilityId: liability._id,
          categoryId: category._id,
          accountId: account._id,
          title: `${liability.name} payment`,
          totalAmount: roundMoney(data.amount),
          subtotal: roundMoney(data.amount),
          date: data.date || new Date(),
          items: paymentItems,
          adjustments: [],
        },
      ],
      { session },
    );

    liability.remainingAmount = roundMoney(liability.remainingAmount - data.amount);
    const installmentsCovered = Math.floor(
      (data.amount + 0.001) / liability.installmentAmount,
    );
    liability.paidInstallments = Math.min(
      liability.totalInstallments,
      liability.paidInstallments + installmentsCovered,
    );
    if (liability.remainingAmount === 0) {
      liability.status = "paid";
      liability.paidInstallments = liability.totalInstallments;
    } else if (installmentsCovered > 0) {
      liability.nextDueDate = addMonthClamped(liability.nextDueDate);
    }
    await liability.save({ session });

    await session.commitTransaction();
    return { liability, payment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
