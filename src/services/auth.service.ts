import bcrypt from "bcryptjs";
import { Member } from "../models/Member";
import { ILoginInput, IRegisterInput } from "../schemas/auth.schema";
import { generateJWTToken } from "../utils/core.utils";
import {
  ConflictError,
  UnauthorizedError,
} from "../utils/error.utils";
import { ensureMemberDefaults } from "./bootstrap.service";

export const registerMemberService = async (data: IRegisterInput) => {
  try {
    const { name, email, password } = data;

    const user = await Member.findOne({ email });
    if (user) {
      throw new ConflictError("User already exists");
    }

    // Generate Custom Member ID (M001, M002, etc.)
    const lastMember = await Member.findOne().sort({ createdAt: -1 });
    let newMid = "M001";

    if (lastMember && lastMember.mid) {
      const lastMidNum = parseInt(lastMember.mid.substring(1));
      if (!isNaN(lastMidNum)) {
        newMid = `M${(lastMidNum + 1).toString().padStart(3, "0")}`;
      }
    }

    const encriptedPassword = await bcrypt.hash(password, 10);
    const member = await Member.create({
      mid: newMid,
      name,
      email,
      password: encriptedPassword,
    });
    await ensureMemberDefaults(member._id.toString());
    return member.mid;
  } catch (error) {
    throw error;
  }
};

export const memberLoginService = async (data: ILoginInput) => {
  const { username, password } = data;

  const user = await Member.findOne({ email: username });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }
  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new UnauthorizedError("Invalid credentials");
  }

  await ensureMemberDefaults(user._id.toString());
  const JWTToken = generateJWTToken(user);

  return JWTToken;
};

