import { env } from "../config/env";
import {
  dispatchDueNotificationsService,
  getNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from "../services/notification.service";
import { asyncHandler } from "../utils/core.utils";
import { ForbiddenError } from "../utils/error.utils";
import { sendResponse } from "../utils/response.utils";

export const dispatchNotificationsWebhookController = asyncHandler(async (req, res) => {
  if (req.header("x-webhook-secret") !== env.REMINDER_WEBHOOK_SECRET) {
    throw new ForbiddenError("Invalid webhook secret");
  }
  sendResponse(res, 200, await dispatchDueNotificationsService(), "Reminder dispatch completed");
});
export const getNotificationsController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await getNotificationsService(req.user!._id.toString()), "Notifications fetched successfully");
});
export const markNotificationReadController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await markNotificationReadService(req.user!._id.toString(), req.params.id!), "Notification marked as read");
});
export const markAllNotificationsReadController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await markAllNotificationsReadService(req.user!._id.toString()), "Notifications marked as read");
});
