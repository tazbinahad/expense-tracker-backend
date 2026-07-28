import { Router } from "express";
import { dispatchNotificationsWebhookController } from "../controllers/notification.controller";

const WebhookRoute = Router();
WebhookRoute.post("/reminders/dispatch", dispatchNotificationsWebhookController);
export default WebhookRoute;
