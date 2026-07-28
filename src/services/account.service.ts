import { Account } from "../models/Account";
import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Transfer } from "../models/Transfer";
import { Bill } from "../models/Bill";
import {
  ICreateAccountInput,
  IDeleteAccountInput,
  IGetAccountInput,
  IUpdateAccountInput,
} from "../schemas/account.schema";
import { ConflictError, NotFoundError } from "../utils/error.utils";

export const createAccountService = async (data: ICreateAccountInput) => {
  try {
    const existingAccount = await Account.findOne({
      accountNumber: data.accountNumber,
      memberId: data.memberId,
    }).collation({ locale: "en", strength: 2 });
    if (existingAccount) {
      throw new ConflictError("Account number already exists");
    }

    const account = await Account.create({
      memberId: data.memberId,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      accountType: data.accountType,
      balance: data.openingBalance,
      currency: data.currency,
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
    const update = {
      ...(data.accountName && { accountName: data.accountName }),
      ...(data.accountType && { accountType: data.accountType }),
      ...(data.currency && { currency: data.currency }),
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
