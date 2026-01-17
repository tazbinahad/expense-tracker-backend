import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const asyncHandler = (
  fn: (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction
  ) => Promise<any>
) => {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

export const generateJWTToken = (user: any) => {
  return jwt.sign({ id: user._id, email: user.email }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
};
