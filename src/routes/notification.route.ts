import { Router } from "express";
import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notification.controller";

const NotificationRoute = Router();
NotificationRoute.get("/", getNotificationsController);
NotificationRoute.put("/read-all", markAllNotificationsReadController);
NotificationRoute.put("/:id/read", markNotificationReadController);
export default NotificationRoute;
