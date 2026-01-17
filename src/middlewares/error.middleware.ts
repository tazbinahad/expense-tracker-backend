import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import { ApiError } from "../utils/error.utils";

const errorHandler = (
  err: any,
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => {
  let error = err;

  // If the error is generic (like a syntax error or DB error), convert to ApiError
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong";
    let errors = error?.errors || [];

    // Handle Mongoose Validation Error
    if (error.name === "ValidationError") {
      statusCode = 400;
      message = "Bad Data";
      errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      }));
    }

    // Handle Mongoose Cast Error (e.g. invalid ID)
    if (error.name === "CastError") {
      statusCode = 400;
      message = `Invalid ${error.path}: ${error.value}`;
      errors = [];
    }

    // Handle Mongoose Duplicate Key Error
    if (error.code === 11000) {
      statusCode = 409;
      message = "Duplicate field value entered";
      errors = Object.keys(error.keyValue).map((key) => ({
        field: key,
        message: `${key} already exists`,
      }));
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  // Send json response
  res.status(error.statusCode).json(response);
};

export { errorHandler };
