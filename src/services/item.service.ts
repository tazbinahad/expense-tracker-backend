import type { ClientSession, Types } from "mongoose";
import { Item } from "../models/Item";

export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
  comments?: string | undefined;
}

export const normalizeItemName = (name: string) =>
  name.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

export const resolveCatalogItems = async (
  memberId: string,
  items: ItemInput[],
  session: ClientSession,
) => {
  const resolved: Array<{
    catalogItemId: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    comments: string;
  }> = [];
  for (const item of items) {
    const normalizedName = normalizeItemName(item.name);
    const catalogItem = await Item.findOneAndUpdate(
      { memberId, normalizedName },
      {
        $setOnInsert: { memberId, normalizedName, name: item.name.trim() },
        $set: { lastPrice: item.price, lastUsedAt: new Date() },
      },
      { new: true, upsert: true, runValidators: true, session },
    );
    resolved.push({
      ...item,
      name: catalogItem.name,
      catalogItemId: catalogItem._id,
      comments: item.comments || "",
    });
  }
  return resolved;
};

export const getAllItemsService = (memberId: string) =>
  Item.find({ memberId }).sort({ lastUsedAt: -1, name: 1 });
