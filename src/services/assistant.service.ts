import { Category } from "../models/Category";
import {
  assistantExpenseDraftSchema,
  type AssistantExpenseDraft,
} from "../schemas/assistant.schema";
import { env } from "../config/env";
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../utils/error.utils";
import { Item } from "../models/Item";
import { Expense } from "../models/Expense";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

const responseJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    merchant: { type: ["string", "null"] },
    date: {
      type: ["string", "null"],
      description: "ISO date YYYY-MM-DD, or null when unavailable",
    },
    currency: { type: "string", description: "Three-letter currency code" },
    categoryName: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number", description: "Price for one unit" },
          quantity: { type: "integer" },
          comments: { type: "string" },
        },
        required: ["name", "price", "quantity", "comments"],
        additionalProperties: false,
      },
    },
    adjustments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
              "vat",
              "delivery",
              "tip",
              "platform",
              "service",
              "discount",
              "other",
            ],
          },
          label: { type: "string" },
          type: { type: "string", enum: ["charge", "discount"] },
          amount: { type: "number" },
        },
        required: ["kind", "label", "type", "amount"],
        additionalProperties: false,
      },
    },
    totalAmount: { type: "number" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "merchant",
    "date",
    "currency",
    "categoryName",
    "items",
    "adjustments",
    "totalAmount",
    "confidence",
    "warnings",
  ],
  additionalProperties: false,
};

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

const localDate = (value: Date, requestedTimeZone: string) => {
  let timeZone = requestedTimeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(value);
  } catch {
    timeZone = "Asia/Dhaka";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}`;
};

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

const levenshteinDistance = (left: string, right: string) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length]!;
};

const textSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshteinDistance(left, right) / longest;
};

const itemNameSimilarity = (left: string, right: string) => {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  const leftWords = normalizedLeft.split(" ");
  const rightWords = normalizedRight.split(" ");
  if (
    Math.abs(leftWords.length - rightWords.length) > 1 ||
    textSimilarity(leftWords[0]!, rightWords[0]!) < 0.3
  ) {
    return 0;
  }
  const wordScore =
    leftWords.reduce(
      (total, word) =>
        total +
        Math.max(...rightWords.map((candidate) => textSimilarity(word, candidate))),
      0,
    ) / leftWords.length;
  return textSimilarity(normalizedLeft, normalizedRight) * 0.6 + wordScore * 0.4;
};

export const matchCatalogItems = (
  items: AssistantExpenseDraft["items"],
  catalog: Array<{ name: string; normalizedName: string }>,
) => {
  const matches: string[] = [];
  const corrected = items.map((item) => {
    const normalizedName = normalize(item.name);
    const exact = catalog.find(
      (catalogItem) => catalogItem.normalizedName === normalizedName,
    );
    if (exact) return { ...item, name: exact.name };

    const candidates = catalog
      .map((catalogItem) => ({
        catalogItem,
        score: itemNameSimilarity(item.name, catalogItem.name),
      }))
      .sort((left, right) => right.score - left.score);
    const best = candidates[0];
    const minimumScore =
      normalizedName.length <= 5 ? 0.82 : normalizedName.includes(" ") ? 0.68 : 0.78;
    if (!best || best.score < minimumScore) return item;

    matches.push(`Matched "${item.name}" to existing item "${best.catalogItem.name}".`);
    return { ...item, name: best.catalogItem.name };
  });
  return { items: corrected, matches };
};

const findDuplicateExpense = async ({
  memberId,
  draft,
  timeZone,
}: {
  memberId: string;
  draft: AssistantExpenseDraft;
  timeZone: string;
}) => {
  const candidates = await Expense.find({
    memberId,
    totalAmount: draft.totalAmount,
  })
    .populate("categoryId", "categoryName")
    .populate("accountId", "accountName")
    .sort({ date: -1 })
    .limit(50)
    .lean();
  const draftNames = [draft.title, ...draft.items.map((item) => item.name)];

  const matches = candidates
    .map((expense) => {
      const expenseNames = [
        expense.title,
        ...expense.items.map((item) => item.name),
      ];
      const nameScore = Math.max(
        ...draftNames.flatMap((draftName) =>
          expenseNames.map((expenseName) =>
            itemNameSimilarity(draftName, expenseName),
          ),
        ),
      );
      const sameDate =
        !draft.date || localDate(new Date(expense.date), timeZone) === draft.date;
      const recentWithoutDate =
        Boolean(draft.date) ||
        Date.now() - new Date(expense.date).getTime() <= 3 * 24 * 60 * 60 * 1000;
      return {
        expense,
        score: sameDate && recentWithoutDate ? nameScore : 0,
      };
    })
    .filter((candidate) => candidate.score >= 0.68)
    .sort((left, right) => right.score - left.score);

  const duplicate = matches[0]?.expense;
  if (!duplicate) return null;
  const category = duplicate.categoryId as unknown as {
    _id: { toString(): string };
    categoryName?: string;
  };
  const account = duplicate.accountId as unknown as {
    _id: { toString(): string };
    accountName?: string;
  };
  return {
    id: duplicate._id.toString(),
    title: duplicate.title,
    date: new Date(duplicate.date).toISOString(),
    totalAmount: duplicate.totalAmount,
    subtotal: duplicate.subtotal,
    categoryId: category._id.toString(),
    categoryName: category.categoryName || "Unknown category",
    accountId: account._id.toString(),
    accountName: account.accountName || "Unknown account",
    items: duplicate.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments || "",
    })),
    adjustments: duplicate.adjustments,
  };
};

const combineDuplicateItems = (items: AssistantExpenseDraft["items"]) => {
  const combined = new Map<string, AssistantExpenseDraft["items"][number]>();
  for (const item of items) {
    const key = normalize(item.name);
    const existing = combined.get(key);
    if (!existing) {
      combined.set(key, item);
      continue;
    }
    const existingTotal = toCents(existing.price) * existing.quantity;
    const nextTotal = toCents(item.price) * item.quantity;
    const quantity = existing.quantity + item.quantity;
    combined.set(key, {
      ...existing,
      price: fromCents(Math.round((existingTotal + nextTotal) / quantity)),
      quantity,
    });
  }
  return [...combined.values()];
};

const reconcileDraft = (draft: AssistantExpenseDraft) => {
  const items = combineDuplicateItems(draft.items);
  const itemTotal = items.reduce(
    (total, item) => total + toCents(item.price) * item.quantity,
    0,
  );
  const adjustmentTotal = draft.adjustments.reduce(
    (total, adjustment) =>
      total +
      (adjustment.type === "charge" ? 1 : -1) * toCents(adjustment.amount),
    0,
  );
  const difference = toCents(draft.totalAmount) - itemTotal - adjustmentTotal;
  if (difference === 0) return { ...draft, items };

  return {
    ...draft,
    items,
    adjustments: [
      ...draft.adjustments,
      {
        kind: "other" as const,
        label: difference > 0 ? "Unitemized charge" : "Unitemized discount",
        type: difference > 0 ? ("charge" as const) : ("discount" as const),
        amount: fromCents(Math.abs(difference)),
      },
    ],
    warnings: [
      ...draft.warnings,
      "The receipt total did not match the extracted lines. Review the reconciliation adjustment.",
    ],
  };
};

export const extractExpenseDraftService = async ({
  memberId,
  message,
  image,
  clientDate,
  timeZone = "Asia/Dhaka",
}: {
  memberId: string;
  message?: string;
  image?: { buffer: Buffer; mimetype: string };
  clientDate?: string;
  timeZone?: string;
}) => {
  if (!message?.trim() && !image) {
    throw new BadRequestError("Add a message or receipt image");
  }
  if (!env.GEMINI_API_KEY) {
    throw new ServiceUnavailableError("Gemini API is not configured");
  }

  const [categories, storedCatalog, recentExpenses] = await Promise.all([
    Category.find({ memberId, type: "expense" })
      .select("categoryName")
      .lean(),
    Item.find({ memberId })
      .select("name normalizedName")
      .sort({ lastUsedAt: -1 })
      .limit(250)
      .lean(),
    Expense.find({ memberId })
      .select("items.name")
      .sort({ date: -1 })
      .limit(300)
      .lean(),
  ]);
  const catalogMap = new Map(
    storedCatalog.map((item) => [
      item.normalizedName,
      { name: item.name, normalizedName: item.normalizedName },
    ]),
  );
  for (const expense of recentExpenses) {
    for (const item of expense.items) {
      const normalizedName = normalize(item.name);
      if (!catalogMap.has(normalizedName)) {
        catalogMap.set(normalizedName, { name: item.name, normalizedName });
      }
    }
  }
  const catalog = [...catalogMap.values()].slice(0, 250);
  const categoryNames = categories.map((category) => category.categoryName);
  const catalogNames = catalog.map((item) => item.name);
  const prompt = [
    "Extract one expense draft from the user's message and/or receipt image.",
    "Use visible receipt values only. Do not guess missing monetary values.",
    "Correct obvious spelling mistakes in item names.",
    `The user's current local date is ${clientDate || localDate(new Date(), timeZone)} in ${timeZone}. Resolve words such as today and yesterday to an ISO date.`,
    "When an intended item matches the existing catalog, output its exact catalog spelling.",
    `Existing item catalog: ${catalogNames.length ? catalogNames.join(", ") : "No existing items"}`,
    "Items must contain unit prices and integer quantities.",
    "Put VAT, delivery, tips, platform fees, service charges, discounts, and other receipt-level amounts in adjustments.",
    "Use type=discount only for reductions. All other adjustments are charges.",
    "Choose categoryName only from this list, otherwise return null:",
    categoryNames.join(", "),
    `User message: ${message?.trim() || "Extract this receipt."}`,
  ].join("\n");
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (image) {
    parts.push({
      inlineData: {
        mimeType: image.mimetype,
        data: image.buffer.toString("base64"),
      },
    });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    throw new ServiceUnavailableError("Could not reach Gemini");
  }

  const result = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new ServiceUnavailableError(
      result.error?.message || "Gemini could not process the request",
    );
  }
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new ServiceUnavailableError("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ServiceUnavailableError("Gemini returned an invalid response");
  }
  const draft = assistantExpenseDraftSchema.safeParse(parsed);
  if (!draft.success) {
    throw new ServiceUnavailableError("Gemini returned an incomplete expense");
  }

  const catalogResult = matchCatalogItems(draft.data.items, catalog);
  const reconciled = reconcileDraft({
    ...draft.data,
    items: catalogResult.items,
    warnings: [...draft.data.warnings, ...catalogResult.matches],
  });
  const matchedCategory = categories.find(
    (category) =>
      reconciled.categoryName &&
      normalize(category.categoryName) === normalize(reconciled.categoryName),
  );
  const duplicateExpense = await findDuplicateExpense({
    memberId,
    draft: reconciled,
    timeZone,
  });
  return {
    ...reconciled,
    categoryId: matchedCategory?._id.toString() || null,
    duplicateExpense,
  };
};
