import { Types } from "mongoose";
import { IMember } from "../models/Member";

declare global {
  namespace Express {
    interface Request {
      user?: Omit<IMember, "password">;
    }
  }
}
