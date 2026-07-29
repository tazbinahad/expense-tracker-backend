import { Account } from "../models/Account";
import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Transfer } from "../models/Transfer";
import { Liability } from "../models/Liability";
import { Bill } from "../models/Bill";
import mongoose from "mongoose";
import {
  ICreateAccountInput,
  IDeleteAccountInput,
  IGetAccountInput,
  IPayCreditCardInput,
  IUpdateAccountInput,
} from "../schemas/account.schema";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";

const nextDateForDay = (day: number, after = new Date()) => {
  const date = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), day));
  if (date <= after) date.setUTCMonth(date.getUTCMonth() + 1);
  return date;
};

const cardSchedule = (statementDay: number, paymentDueDay: number) => {
  const nextStatementDate = nextDateForDay(statementDay);
  const nextPaymentDueDate = new Date(
    Date.UTC(
      nextStatementDate.getUTCFullYear(),
      nextStatementDate.getUTCMonth() + (paymentDueDay <= statementDay ? 1 : 0),
      paymentDueDay,
    ),
  );
  return { nextStatementDate, nextPaymentDueDate };
};

export const createAccountService = async (data: ICreateAccountInput) => {
  try {
    const existingAccount = await Account.findOne({
      accountNumber: data.accountNumber,
      memberId: data.memberId,
    }).collation({ locale: "en", strength: 2 });
    if (existingAccount) {
      throw new ConflictError("Account number already exists");
    }

    const isCard = data.accountType === "Card";
    if (
      isCard &&
      data.creditLimit !== undefined &&
      data.openingBalance > data.creditLimit
    ) {
      throw new BadRequestError("Outstanding cannot exceed credit limit");
    }
    if (
      isCard &&
      (data.statementBalance ?? data.openingBalance) > data.openingBalance
    ) {
      throw new BadRequestError("Statement due cannot exceed outstanding");
    }
    const statementDay = data.statementDay || 1;
    const paymentDueDay = data.paymentDueDay || 15;
    const schedule = isCard ? cardSchedule(statementDay, paymentDueDay) : {};
    const account = await Account.create({
      memberId: data.memberId,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      accountType: data.accountType,
      balance: isCard ? -roundMoney(data.openingBalance) : data.openingBalance,
      currency: data.currency,
      ...(isCard && {
        ...(data.creditLimit !== undefined && {
          creditLimit: data.creditLimit,
        }),
        statementDay,
        paymentDueDay,
        statementBalance: roundMoney(
          data.statementBalance ?? data.openingBalance,
        ),
        ...schedule,
      }),
    });

    return account;
  } catch (error) {
    throw error;
  }
};

export const updateAccountService = async (
  id: IUpdateAccountInput["params"]["id"],
  memberId: string,
  data: IUpdateAccountInput["body"],
) => {
  try {
    const existing = await Account.findOne({ _id: id, memberId });
    if (!existing) throw new NotFoundError("Account not found");
    if (
      data.accountType &&
      data.accountType !== existing.accountType &&
      (data.accountType === "Card" || existing.accountType === "Card")
    ) {
      throw new BadRequestError("Card accounts cannot be converted to another type");
    }
    const statementDay = data.statementDay ?? existing.statementDay ?? 1;
    const paymentDueDay = data.paymentDueDay ?? existing.paymentDueDay ?? 15;
    const outstanding = Math.max(0, -existing.balance);
    if (
      data.creditLimit !== undefined &&
      data.creditLimit < outstanding
    ) {
      throw new BadRequestError("Credit limit cannot be below outstanding");
    }
    if (
      data.statementBalance !== undefined &&
      data.statementBalance > outstanding
    ) {
      throw new BadRequestError("Statement due cannot exceed outstanding");
    }
    const schedule =
      existing.accountType === "Card" || data.accountType === "Card"
        ? cardSchedule(statementDay, paymentDueDay)
        : {};
    const update = {
      ...(data.accountName && { accountName: data.accountName }),
      ...(data.accountType && { accountType: data.accountType }),
      ...(data.currency && { currency: data.currency }),
      ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
      ...(data.statementDay !== undefined && { statementDay: data.statementDay }),
      ...(data.paymentDueDay !== undefined && {
        paymentDueDay: data.paymentDueDay,
      }),
      ...(data.statementBalance !== undefined && {
        statementBalance: roundMoney(data.statementBalance),
      }),
      ...schedule,
    };
    const account = await Account.findOneAndUpdate({ _id: id, memberId }, update, {
      new: true,
      runValidators: true,
    });
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    return account;
  } catch (error) {
    throw error;
  }
};

export const payCreditCardService = async (
  id: string,
  memberId: string,
  data: IPayCreditCardInput["body"],
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const card = await Account.findOne({
      _id: id,
      memberId,
      accountType: "Card",
    }).session(session);
    if (!card) throw new NotFoundError("Credit card account not found");

    const source = await Account.findOne({
      _id: data.fromAccountId,
      memberId,
      accountType: { $ne: "Card" },
    }).session(session);
    if (!source) throw new NotFoundError("Payment account not found");
    if (source.balance < data.amount) {
      throw new BadRequestError("Insufficient balance in payment account");
    }

    const outstanding = Math.max(0, roundMoney(-card.balance));
    if (data.amount > outstanding) {
      throw new BadRequestError("Payment cannot exceed card outstanding");
    }

    source.balance = roundMoney(source.balance - data.amount);
    card.balance = roundMoney(card.balance + data.amount);
    card.statementBalance = roundMoney(
      Math.max(0, (card.statementBalance || 0) - data.amount),
    );
    await Promise.all([source.save({ session }), card.save({ session })]);

    const [payment] = await Transfer.create(
      [{
        memberId,
        fromAccountId: source._id,
        toAccountId: card._id,
        amount: roundMoney(data.amount),
        transferFee: 0,
        transferType: "card_payment",
        description: data.notes || `${card.accountName} payment`,
        date: data.date || new Date(),
      }],
      { session },
    );

    await session.commitTransaction();
    return { card, payment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const deleteAccountService = async (
  id: IDeleteAccountInput["params"]["id"],
  memberId: string,
) => {
  try {
    const account = await Account.findOne({ _id: id, memberId });
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    const references = await Promise.all([
      Expense.exists({ memberId, accountId: id }).then(Boolean),
      Income.exists({ memberId, accountId: id }).then(Boolean),
      Transfer.exists({
        memberId,
        $or: [{ fromAccountId: id }, { toAccountId: id }],
      }).then(Boolean),
      Bill.exists({ memberId, accountId: id }).then(Boolean),
      Liability.exists({ memberId, cardAccountId: id }).then(Boolean),
    ]);

    if (references.some(Boolean)) {
      throw new ConflictError(
        "Account has transaction history and cannot be deleted",
      );
    }

    await account.deleteOne();
    return account;
  } catch (error) {
    throw error;
  }
};

export const getAllAccountsService = async (memberId: string) => {
  try {
    const accounts = await Account.find({ memberId }).sort({ createdAt: -1 });
    return accounts;
  } catch (error) {
    throw error;
  }
};

export const getAccountService = async (
  id: IGetAccountInput["params"]["id"],
  memberId: string,
) => {
  try {
    const account = await Account.findOne({ _id: id, memberId });
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    return account;
  } catch (error) {
    throw error;
  }
};
