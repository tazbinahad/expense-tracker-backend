import { ILoginInput, IRegisterInput } from "../schemas/auth.schema";
import {
  memberLoginService,
  registerMemberService,
} from "../services/auth.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const registerMemberController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body as IRegisterInput;
  const mid = await registerMemberService({ name, email, password });
  sendResponse(res, 201, mid, "Member registered successfully");
});

export const memberLoginController = asyncHandler(async (req, res) => {
  const { username, password } = req.body as ILoginInput;
  const JWTToken = await memberLoginService({ username, password });
  sendResponse(res, 200, JWTToken, "Member logged in successfully");
});

export const getCurrentMemberController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, req.user, "Member retrieved successfully");
});
