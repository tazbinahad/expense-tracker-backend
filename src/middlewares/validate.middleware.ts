import {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { ZodType, ZodError } from "zod";
import { BadRequestError } from "../utils/error.utils"; // Make sure this is imported

export const validate =
  (schema: ZodType) =>
  async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as { body: unknown; params: Record<string, string> };

      req.body = parsed.body;
      req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path[1] || issue.path[0],
          message: issue.message,
        }));

        const validationError = new BadRequestError(
          "Validation Error",
          formattedErrors
        );

        return next(validationError);
      }

      next(error);
    }
  };
