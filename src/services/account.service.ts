import { Account } from "../models/Account";
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
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      memberId: data.memberId,
    });
    if (existingAccount) {
      throw new ConflictError("Account already exists");
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
  data: IUpdateAccountInput["body"]
) => {
  try {
    const account = await Account.findByIdAndUpdate(id, data, { new: true });
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    return account;
  } catch (error) {
    throw error;
  }
};

export const deleteAccountService = async (
  id: IDeleteAccountInput["params"]["id"]
) => {
  try {
    const account = await Account.findByIdAndDelete(id);
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    return account;
  } catch (error) {
    throw error;
  }
};

export const getAllAccountsService = async () => {
  try {
    const accounts = await Account.find();
    return accounts;
  } catch (error) {
    throw error;
  }
};

export const getAccountService = async (
  id: IGetAccountInput["params"]["id"]
) => {
  try {
    const account = await Account.findById(id);
    if (!account) {
      throw new NotFoundError("Account not found");
    }
    return account;
  } catch (error) {
    throw error;
  }
};
