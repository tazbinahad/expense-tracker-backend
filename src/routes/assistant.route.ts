import { Router } from "express";
import multer from "multer";
import {
  extractExpenseDraftController,
  financeChatController,
} from "../controllers/assistant.controller";
import { BadRequestError } from "../utils/error.utils";
import { validate } from "../middlewares/validate.middleware";
import { assistantChatSchema } from "../schemas/assistant.schema";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new BadRequestError("Use a JPEG, PNG, WebP, HEIC, or HEIF image"));
      return;
    }
    callback(null, true);
  },
});

const AssistantRoute = Router();

AssistantRoute.post(
  "/chat",
  validate(assistantChatSchema),
  financeChatController,
);

AssistantRoute.post(
  "/expense-draft",
  upload.single("image"),
  extractExpenseDraftController,
);

export default AssistantRoute;
