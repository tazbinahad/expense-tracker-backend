import {
  ICreateAccountInput,
  IDeleteAccountInput,
  IGetAccountInput,
  IPayCreditCardInput,
  IUpdateAccountInput,
} from "../schemas/account.schema";
import {
  createAccountService,
  deleteAccountService,
  getAccountService,
  getAllAccountsService,
  payCreditCardService,
  updateAccountService,
} from "../services/account.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const createAccountController = asyncHandler(async (req, res) => {
  const account = await createAccountService({
    ...req.body,
    memberId: req.user!._id.toString(),
  });
  sendResponse(res, 201, account, "Account created successfully");
});

export const updateAccountController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateAccountInput["params"];

  const account = await updateAccountService(id, req.user!._id.toString(), req.body);
  sendResponse(res, 200, account, "Account updated successfully");
});

export const deleteAccountController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteAccountInput["params"];

  await deleteAccountService(id, req.user!._id.toString());
  sendResponse(res, 200, null, "Account deleted successfully");
});

export const getAllAccountsController = asyncHandler(async (req, res) => {
  const accounts = await getAllAccountsService(req.user!._id.toString());
  sendResponse(res, 200, accounts, "Accounts fetched successfully");
});

export const getAccountController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetAccountInput["params"];
  const account = await getAccountService(id, req.user!._id.toString());
  sendResponse(res, 200, account, "Account fetched successfully");
});

export const payCreditCardController = asyncHandler(async (req, res) => {
  const { id } = req.params as IPayCreditCardInput["params"];
  const result = await payCreditCardService(
    id,
    req.user!._id.toString(),
    req.body,
  );
  sendResponse(res, 201, result, "Credit card payment recorded successfully");
});
