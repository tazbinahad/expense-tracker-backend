import { Router } from "express";
import {
  getCurrentMemberController,
  memberLoginController,
  registerMemberController,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { protect } from "../middlewares/auth.middleware";

const AuthRoutes = Router();

AuthRoutes.post(
  "/register",
  validate(registerSchema),
  registerMemberController
);

AuthRoutes.post("/login", validate(loginSchema), memberLoginController);
AuthRoutes.get("/me", protect, getCurrentMemberController);

export default AuthRoutes;
