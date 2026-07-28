import mongoose from "mongoose";
import { Account } from "../models/Account";
import { Transfer } from "../models/Transfer";
import {
  ICreateTransferInput,
  IDeleteTransferInput,
  IGetTransferInput,
  IUpdateTransferInput,
} from "../schemas/transfer.schema";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import { roundMoney } from "../utils/money.utils";

export const createTransferService = async (data: ICreateTransferInput) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      transferFee = 0,
      memberId,
      description,
      date,
    } = data;

    if (fromAccountId === toAccountId) {
      throw new BadRequestError("Cannot transfer to the same account");
    }

    const fromAccount = await Account.findOne({
      _id: fromAccountId,
      memberId,
    }).session(session);
    if (!fromAccount) {
      throw new NotFoundError("From Account not found");
    }

    const toAccount = await Account.findOne({
      _id: toAccountId,
      memberId,
    }).session(session);
    if (!toAccount) {
      throw new NotFoundError("To Account not found");
    }

    if (fromAccount.balance < amount + transferFee) {
      throw new BadRequestError("Insufficient balance in source account");
    }

    // Deduct from source
    fromAccount.balance = roundMoney(fromAccount.balance - amount - transferFee);
    await fromAccount.save({ session });

    // Add to destination
    toAccount.balance = roundMoney(toAccount.balance + amount);
    await toAccount.save({ session });

    // Create transfer record
    const transferData = {
      memberId,
      fromAccountId,
      toAccountId,
      amount,
      transferFee,
      description: description || "",
      date: date || new Date(),
    };

    const transfer = await Transfer.create([transferData], { session });

    await session.commitTransaction();
    return transfer[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateTransferService = async (
  id: IUpdateTransferInput["params"]["id"],
  memberId: string,
  data: IUpdateTransferInput["body"]
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await Transfer.findOne({ _id: id, memberId }).session(session);
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }

    // Revert old transfer
    const oldFromAccount = await Account.findById(
      transfer.fromAccountId
    ).session(session);
    const oldToAccount = await Account.findById(transfer.toAccountId).session(
      session
    );

    if (!oldFromAccount || !oldToAccount) {
      throw new NotFoundError("Transfer account not found");
    }
    if (oldToAccount.balance < transfer.amount) {
      throw new BadRequestError(
        "Transfer cannot be changed because its funds have already been spent",
      );
    }

    oldFromAccount.balance = roundMoney(
      oldFromAccount.balance + transfer.amount + transfer.transferFee,
    );
    await oldFromAccount.save({ session });
    oldToAccount.balance = roundMoney(oldToAccount.balance - transfer.amount);
    await oldToAccount.save({ session });

    // Prepare new data
    const newFromAccountId =
      data.fromAccountId || transfer.fromAccountId.toString();

    const newToAccountId = data.toAccountId || transfer.toAccountId.toString();
    const newAmount = data.amount !== undefined ? data.amount : transfer.amount;
    const newTransferFee =
      data.transferFee !== undefined ? data.transferFee : transfer.transferFee;

    if (newFromAccountId === newToAccountId) {
      throw new BadRequestError("Cannot transfer to the same account");
    }

    // Apply new transfer
    const newFromAccount = await Account.findOne({ _id: newFromAccountId, memberId }).session(
      session
    );
    if (!newFromAccount) {
      throw new NotFoundError("New From Account not found");
    }

    const newToAccount = await Account.findOne({ _id: newToAccountId, memberId }).session(
      session
    );
    if (!newToAccount) {
      throw new NotFoundError("New To Account not found");
    }

    if (newFromAccount.balance < newAmount + newTransferFee) {
      throw new BadRequestError("Insufficient balance in new source account");
    }

    newFromAccount.balance = roundMoney(
      newFromAccount.balance - newAmount - newTransferFee,
    );
    await newFromAccount.save({ session });

    newToAccount.balance = roundMoney(newToAccount.balance + newAmount);
    await newToAccount.save({ session });

    // Update transfer record
    const updatedTransfer = await Transfer.findOneAndUpdate({ _id: id, memberId }, data, {
      new: true,
      session,
    });

    await session.commitTransaction();
    return updatedTransfer;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteTransferService = async (
  id: IDeleteTransferInput["params"]["id"],
  memberId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await Transfer.findOne({ _id: id, memberId }).session(session);
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }

    // Revert balances
    const fromAccount = await Account.findById(transfer.fromAccountId).session(
      session
    );
    const toAccount = await Account.findById(transfer.toAccountId).session(
      session
    );

    if (!fromAccount || !toAccount) {
      throw new NotFoundError("Transfer account not found");
    }
    if (toAccount.balance < transfer.amount) {
      throw new BadRequestError(
        "Transfer cannot be deleted because its funds have already been spent",
      );
    }
    fromAccount.balance = roundMoney(
      fromAccount.balance + transfer.amount + transfer.transferFee,
    );
    await fromAccount.save({ session });
    toAccount.balance = roundMoney(toAccount.balance - transfer.amount);
    await toAccount.save({ session });

    await Transfer.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    return transfer;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getAllTransfersService = async (memberId: string) => {
  try {
    const transfers = await Transfer.find({ memberId })
      .populate("fromAccountId", "accountName")
      .populate("toAccountId", "accountName")
      .sort({ date: -1 });
    return transfers;
  } catch (error) {
    throw error;
  }
};

export const getTransferService = async (
  id: IGetTransferInput["params"]["id"],
  memberId: string,
) => {
  try {
    const transfer = await Transfer.findOne({ _id: id, memberId })
      .populate("fromAccountId", "accountName")
      .populate("toAccountId", "accountName");
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    return transfer;
  } catch (error) {
    throw error;
  }
};
