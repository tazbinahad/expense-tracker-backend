import { Bill } from "../models/Bill";
import { Notification } from "../models/Notification";
import { NotFoundError } from "../utils/error.utils";
import { Receivable } from "../models/Receivable";

export const dispatchDueNotificationsService = async (now = new Date()) => {
  const oldestRelevantDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 90,
  );
  const [dueBills, dueReceivables] = await Promise.all([
    Bill.find({
      status: "active",
      remindAt: { $lte: now },
      dueAt: { $gte: oldestRelevantDate },
    }).lean(),
    Receivable.find({
      status: "active",
      remindAt: { $lte: now },
      dueAt: { $gte: oldestRelevantDate },
    }).lean(),
  ]);

  if (!dueBills.length && !dueReceivables.length) {
    return { processed: 0, created: 0 };
  }
  const result = await Notification.bulkWrite(
    [
      ...dueBills.map((bill) => ({
        updateOne: {
          filter: {
            memberId: bill.memberId,
            dedupeKey: `${bill._id}:${bill.dueAt.toISOString()}`,
          },
          update: {
            $setOnInsert: {
              memberId: bill.memberId,
              billId: bill._id,
              dedupeKey: `${bill._id}:${bill.dueAt.toISOString()}`,
              title: `${bill.name} is due`,
              message: `${bill.name} payment of BDT ${bill.amount.toFixed(2)} is due on ${bill.dueAt.toLocaleDateString("en-BD")}.`,
              dueAt: bill.dueAt,
            },
          },
          upsert: true,
        },
      })),
      ...dueReceivables.map((receivable) => ({
        updateOne: {
          filter: {
            memberId: receivable.memberId,
            dedupeKey: `receivable:${receivable._id}:${receivable.dueAt!.toISOString()}`,
          },
          update: {
            $setOnInsert: {
              memberId: receivable.memberId,
              receivableId: receivable._id,
              dedupeKey: `receivable:${receivable._id}:${receivable.dueAt!.toISOString()}`,
              title: `${receivable.borrower} repayment is due`,
              message: `BDT ${receivable.outstandingAmount.toFixed(2)} is still owed and is due on ${receivable.dueAt!.toLocaleDateString("en-BD")}.`,
              dueAt: receivable.dueAt!,
            },
          },
          upsert: true,
        },
      })),
    ],
  );
  return {
    processed: dueBills.length + dueReceivables.length,
    created: result.upsertedCount,
  };
};

export const getNotificationsService = (memberId: string) =>
  Notification.find({ memberId }).sort({ createdAt: -1 }).limit(50);

export const markNotificationReadService = async (
  memberId: string,
  id: string,
) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, memberId },
    { readAt: new Date() },
    { new: true },
  );
  if (!notification) throw new NotFoundError("Notification not found");
  return notification;
};

export const markAllNotificationsReadService = (memberId: string) =>
  Notification.updateMany({ memberId, readAt: { $exists: false } }, { readAt: new Date() });
