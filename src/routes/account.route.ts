import { Router } from "express";
import {
  createAccountController,
  deleteAccountController,
  getAccountController,
  getAllAccountsController,
  payCreditCardController,
  updateAccountController,
} from "../controllers/account.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createAccountSchema,
  deleteAccountSchema,
  getAccountSchema,
  payCreditCardSchema,
  updateAccountSchema,
} from "../schemas/account.schema";

const AccountRoute = Router();

AccountRoute.post(
  "/createAccount",
  validate(createAccountSchema),
  createAccountController,
);

AccountRoute.put(
  "/updateAccount/:id",
  validate(updateAccountSchema),
  updateAccountController,
);

AccountRoute.delete(
  "/deleteAccount/:id",
  validate(deleteAccountSchema),
  deleteAccountController,
);

AccountRoute.get("/getAllAccounts", getAllAccountsController);

AccountRoute.get(
  "/getAccount/:id",
  validate(getAccountSchema),
  getAccountController,
);

AccountRoute.post(
  "/payCreditCard/:id",
  validate(payCreditCardSchema),
  payCreditCardController,
);

export default AccountRoute;
