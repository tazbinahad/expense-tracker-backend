import { Router } from "express";
import {
  createAccountController,
  deleteAccountController,
  getAccountController,
  getAllAccountsController,
  updateAccountController,
} from "../controllers/account.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createAccountSchema,
  deleteAccountSchema,
  getAccountSchema,
  updateAccountSchema,
} from "../schemas/account.schema";

const AccountRoute = Router();

AccountRoute.post(
  "/createAccount",
  validate(createAccountSchema),
  createAccountController
);

AccountRoute.put(
  "/updateAccount/:id",
  validate(updateAccountSchema),
  updateAccountController
);

AccountRoute.delete(
  "/deleteAccount/:id",
  validate(deleteAccountSchema),
  deleteAccountController
);

AccountRoute.get("/getAllAccounts", getAllAccountsController);

AccountRoute.get(
  "/getAccount/:id",
  validate(getAccountSchema),
  getAccountController
);

export default AccountRoute;
