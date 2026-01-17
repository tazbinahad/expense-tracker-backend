import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { NotFoundError, UnauthorizedError } from "../utils/error.utils";
import { asyncHandler } from "../utils/core.utils";
import { Member } from "../models/Member"; // Import your Model

interface DecodedToken extends JwtPayload {
  id: string;
  role: string;
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new UnauthorizedError("Not authorized, no token provided");
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;

      const userDocument = await Member.findById(decoded.id).select(
        "-password"
      );

      if (!userDocument) {
        throw new NotFoundError("User not found");
      }
      const user = userDocument.toObject();
      req.user = user;

      next();
    } catch (error) {
      throw new UnauthorizedError("Invalid token");
    }
  }
);
