import type { Application } from "express";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

interface Resource {
  _id: string;
}

describe.sequential("expense tracker API", () => {
  let database: MongoMemoryReplSet;
  let app: Application;
  let token = "";
  let cashAccountId = "";
  let bankAccountId = "";
  let incomeCategoryId = "";
  let expenseCategoryId = "";

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    database = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });

    process.env.NODE_ENV = "test";
    process.env.PORT = "5001";
    process.env.MONGO_URI = database.getUri();
    process.env.JWT_SECRET = "integration-test-secret-key";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    process.env.REMINDER_WEBHOOK_SECRET = "integration-reminder-secret";
    process.env.GEMINI_API_KEY = "integration-gemini-key";
    process.env.GEMINI_MODEL = "gemini-flash-latest";

    await mongoose.connect(process.env.MONGO_URI);
    app = (await import("../src/app")).default;
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await database.stop();
  });

  it("reports service health", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("registers, bootstraps metadata, and logs in", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Integration User",
        email: "integration@example.com",
        password: "password123",
      })
      .expect(201);

    expect(registration.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: "M001",
    });

    const login = await request(app)
      .post("/api/auth/login")
      .send({
        username: "integration@example.com",
        password: "password123",
      })
      .expect(200);

    token = (login.body as ApiResponse<string>).data;
    expect(token.split(".")).toHaveLength(3);

    const profile = await request(app)
      .get("/api/auth/me")
      .set(auth())
      .expect(200);
    expect(profile.body.data).toMatchObject({
      name: "Integration User",
      email: "integration@example.com",
    });
    expect(profile.body.data.password).toBeUndefined();

    await request(app).get("/api/account/getAllAccounts").expect(401);

    const accounts = await request(app)
      .get("/api/account/getAllAccounts")
      .set(auth())
      .expect(200);
    const categories = await request(app)
      .get("/api/category/getAllCategories")
      .set(auth())
      .expect(200);

    expect(accounts.body.data).toHaveLength(1);
    expect(accounts.body.data[0]).toMatchObject({
      accountName: "Cash Wallet",
      accountType: "Cash",
      balance: 0,
      currency: "BDT",
    });
    expect(categories.body.data).toHaveLength(32);
    expect(categories.body.data.find(
      (category: { categoryName: string }) => category.categoryName === "Loan EMI",
    )).toMatchObject({
      slug: "loan-emi",
      icon: "BadgeDollarSign",
      color: "#B45309",
      isSystem: true,
    });

    cashAccountId = accounts.body.data[0]._id;
    incomeCategoryId = categories.body.data.find(
      (category: { categoryName: string }) => category.categoryName === "Salary",
    )._id;
    expenseCategoryId = categories.body.data.find(
      (category: { categoryName: string }) =>
        category.categoryName === "Food & dining",
    )._id;
  });

  it("creates, reads, updates, and deletes accounts", async () => {
    const created = await request(app)
      .post("/api/account/createAccount")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        accountName: "Main Bank",
        accountNumber: 123456,
        accountType: "Bank",
        openingBalance: 500,
        currency: "BDT",
      })
      .expect(201);

    bankAccountId = (created.body.data as Resource)._id;

    const detail = await request(app)
      .get(`/api/account/getAccount/${bankAccountId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.accountName).toBe("Main Bank");

    const updated = await request(app)
      .put(`/api/account/updateAccount/${bankAccountId}`)
      .set(auth())
      .send({ accountName: "Primary Bank", openingBalance: 999999 })
      .expect(200);
    expect(updated.body.data.accountName).toBe("Primary Bank");
    expect(updated.body.data.balance).toBe(500);

    const temporary = await request(app)
      .post("/api/account/createAccount")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        accountName: "Temporary Card",
        accountNumber: 654321,
        accountType: "Card",
        openingBalance: 0,
        currency: "BDT",
      })
      .expect(201);

    await request(app)
      .delete(`/api/account/deleteAccount/${temporary.body.data._id}`)
      .set(auth())
      .expect(200);
  });

  it("creates, reads, updates, and deletes categories", async () => {
    const created = await request(app)
      .post("/api/category/createCategory")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        categoryName: "Side Project",
        type: "income",
      })
      .expect(201);

    const categoryId = (created.body.data as Resource)._id;

    await request(app)
      .get(`/api/category/getCategory/${categoryId}`)
      .set(auth())
      .expect(200);

    const updated = await request(app)
      .put(`/api/category/updateCategory/${categoryId}`)
      .set(auth())
      .send({ categoryName: "Consulting" })
      .expect(200);
    expect(updated.body.data.categoryName).toBe("Consulting");

    const deleted = await request(app)
      .delete(`/api/category/deleteCategory/${categoryId}`)
      .set(auth())
      .expect(200);
    expect(deleted.body.data._id).toBe(categoryId);
  });

  it("extracts a reconciled AI expense draft without saving it", async () => {
    await request(app)
      .post("/api/assistant/expense-draft")
      .field("message", "Lunch for 110")
      .expect(401);

    await request(app)
      .post("/api/assistant/expense-draft")
      .set(auth())
      .expect(400);

    const { Member } = await import("../src/models/Member");
    const { Item } = await import("../src/models/Item");
    const member = await Member.findOne({ email: "integration@example.com" });
    const catalogItem = await Item.create({
      memberId: member!._id,
      name: "Clutch switch change",
      normalizedName: "clutch switch change",
      lastPrice: 140,
      lastUsedAt: new Date(),
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: "Delivered lunch",
                      merchant: "Test Kitchen",
                      date: "2025-01-22",
                      currency: "BDT",
                      categoryName: "Food & dining",
                      items: [
                        {
                          name: "class stwith change",
                          price: 100,
                          quantity: 1,
                          comments: "",
                        },
                      ],
                      adjustments: [],
                      totalAmount: 110,
                      confidence: 0.91,
                      warnings: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    try {
      const response = await request(app)
        .post("/api/assistant/expense-draft")
        .set(auth())
        .field("message", "Extract this receipt")
        .attach("image", Buffer.from("fake image"), {
          filename: "receipt.png",
          contentType: "image/png",
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: "Delivered lunch",
        categoryId: expenseCategoryId,
        totalAmount: 110,
        items: [{ name: "Clutch switch change", price: 100, quantity: 1 }],
        adjustments: [
          {
            kind: "other",
            label: "Unitemized charge",
            type: "charge",
            amount: 10,
          },
        ],
      });
      expect(response.body.data.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Matched "class stwith change" to existing item "Clutch switch change"',
          ),
          expect.stringContaining("receipt total did not match"),
        ]),
      );
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      fetchMock.mockRestore();
      await Item.deleteOne({ _id: catalogItem._id });
    }
  });

  it("does not fuzzy-match materially different item names", async () => {
    const { matchCatalogItems } = await import(
      "../src/services/assistant.service"
    );
    const result = matchCatalogItems(
      [
        {
          name: "Brake switch change",
          price: 150,
          quantity: 1,
          comments: "",
        },
      ],
      [
        {
          name: "Clutch switch change",
          normalizedName: "clutch switch change",
        },
      ],
    );
    expect(result.items[0]?.name).toBe("Brake switch change");
    expect(result.matches).toEqual([]);
  });

  it("returns an existing expense instead of a duplicate draft", async () => {
    const { Member } = await import("../src/models/Member");
    const { Expense } = await import("../src/models/Expense");
    const member = await Member.findOne({ email: "integration@example.com" });
    const existing = await Expense.create({
      memberId: member!._id,
      categoryId: expenseCategoryId,
      accountId: cashAccountId,
      title: "Bike service",
      totalAmount: 150,
      subtotal: 150,
      date: "2026-07-27T06:00:00.000Z",
      items: [
        {
          name: "Clutch switch change",
          price: 150,
          quantity: 1,
          comments: "",
        },
      ],
      adjustments: [],
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: "Bike service",
                      merchant: null,
                      date: "2026-07-27",
                      currency: "BDT",
                      categoryName: "Transport",
                      items: [
                        {
                          name: "class stwith change",
                          price: 150,
                          quantity: 1,
                          comments: "",
                        },
                      ],
                      adjustments: [],
                      totalAmount: 150,
                      confidence: 0.9,
                      warnings: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    try {
      const response = await request(app)
        .post("/api/assistant/expense-draft")
        .set(auth())
        .field(
          "message",
          "Yesterday, Bike service: class stwith change 150 taka",
        )
        .field("clientDate", "2026-07-28")
        .field("timeZone", "Asia/Dhaka")
        .expect(200);

      expect(response.body.data.items[0].name).toBe("Clutch switch change");
      expect(response.body.data.duplicateExpense).toMatchObject({
        id: existing._id.toString(),
        title: "Bike service",
        totalAmount: 150,
        categoryName: "Food & dining",
        accountName: "Cash Wallet",
        items: [
          {
            name: "Clutch switch change",
            price: 150,
            quantity: 1,
          },
        ],
      });
    } finally {
      fetchMock.mockRestore();
      await Expense.deleteOne({ _id: existing._id });
    }
  });

  it("creates, reads, updates, lists, and deletes income", async () => {
    await request(app)
      .post("/api/income/createIncome")
      .set(auth())
      .send({
        categoryId: incomeCategoryId,
        accountId: cashAccountId,
        source: "Invalid zero income",
        amount: 0,
      })
      .expect(400);

    const created = await request(app)
      .post("/api/income/createIncome")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        categoryId: incomeCategoryId,
        accountId: cashAccountId,
        source: "Monthly Salary",
        amount: 1000,
      })
      .expect(201);

    const incomeId = (created.body.data as Resource)._id;

    await request(app)
      .get(`/api/income/getIncome/${incomeId}`)
      .set(auth())
      .expect(200);

    const updated = await request(app)
      .put(`/api/income/updateIncome/${incomeId}`)
      .set(auth())
      .send({ amount: 1200 })
      .expect(200);
    expect(updated.body.data.amount).toBe(1200);

    const list = await request(app)
      .get("/api/income/getAllIncomes")
      .set(auth())
      .expect(200);
    expect(list.body.data).toHaveLength(1);

    const deleted = await request(app)
      .delete(`/api/income/deleteIncome/${incomeId}`)
      .set(auth())
      .expect(200);
    expect(deleted.body.data._id).toBe(incomeId);
  });

  it("creates, reads, updates, lists, and deletes expenses", async () => {
    await request(app)
      .post("/api/income/createIncome")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        categoryId: incomeCategoryId,
        accountId: cashAccountId,
        source: "Expense funding",
        amount: 1000,
      })
      .expect(201);

    await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: cashAccountId,
        title: "Missing line items",
        totalAmount: 200,
      })
      .expect(400);

    await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: cashAccountId,
        title: "Duplicate line items",
        totalAmount: 200,
        items: [
          { name: "Rice", price: 100, quantity: 1 },
          { name: " rice ", price: 100, quantity: 1 },
        ],
      })
      .expect(400);

    await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: cashAccountId,
        title: "Mismatched receipt",
        totalAmount: 200,
        items: [{ name: "Meal", price: 200, quantity: 1 }],
        adjustments: [{ kind: "vat", label: "VAT", type: "charge", amount: 10 }],
      })
      .expect(400);

    const created = await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        categoryId: expenseCategoryId,
        accountId: cashAccountId,
        title: "Weekly groceries",
        totalAmount: 210,
        items: [{ name: "Groceries", price: 200, quantity: 1 }],
        adjustments: [
          { kind: "vat", label: "VAT", type: "charge", amount: 10 },
          { kind: "delivery", label: "Delivery charge", type: "charge", amount: 5 },
          { kind: "discount", label: "Discount", type: "discount", amount: 5 },
        ],
        date: "2025-01-15T12:00:00.000Z",
      })
      .expect(201);

    const expenseId = (created.body.data as Resource)._id;
    expect(created.body.data.date).toBe("2025-01-15T12:00:00.000Z");
    expect(created.body.data).toMatchObject({ subtotal: 200, totalAmount: 210 });

    await request(app)
      .get(`/api/expense/getExpense/${expenseId}`)
      .set(auth())
      .expect(200);

    const updated = await request(app)
      .put(`/api/expense/updateExpense/${expenseId}`)
      .set(auth())
      .send({
        totalAmount: 250,
        items: [{ name: "groceries", price: 250, quantity: 1 }],
        adjustments: [],
      })
      .expect(200);
    expect(updated.body.data.totalAmount).toBe(250);
    expect(updated.body.data.items[0].name).toBe("Groceries");

    const itemCatalog = await request(app)
      .get("/api/item/getAllItems")
      .set(auth())
      .expect(200);
    expect(itemCatalog.body.data).toHaveLength(1);
    expect(itemCatalog.body.data[0]).toMatchObject({
      name: "Groceries",
      normalizedName: "groceries",
      lastPrice: 250,
    });

    await request(app)
      .put(`/api/expense/updateExpense/${expenseId}`)
      .set(auth())
      .send({ categoryId: incomeCategoryId })
      .expect(404);

    const list = await request(app)
      .get("/api/expense/getAllExpenses")
      .set(auth())
      .expect(200);
    expect(list.body.data).toHaveLength(1);

    const deleted = await request(app)
      .delete(`/api/expense/deleteExpense/${expenseId}`)
      .set(auth())
      .expect(200);
    expect(deleted.body.data._id).toBe(expenseId);
  });

  it("creates, reads, updates, lists, and deletes transfers", async () => {
    const created = await request(app)
      .post("/api/transfer/createTransfer")
      .set(auth())
      .send({
        memberId: "spoofed-member",
        fromAccountId: cashAccountId,
        toAccountId: bankAccountId,
        amount: 300,
        transferFee: 10,
        description: "Move savings",
      })
      .expect(201);

    const transferId = (created.body.data as Resource)._id;

    await request(app)
      .get(`/api/transfer/getTransfer/${transferId}`)
      .set(auth())
      .expect(200);

    const updated = await request(app)
      .put(`/api/transfer/updateTransfer/${transferId}`)
      .set(auth())
      .send({ amount: 200, transferFee: 5 })
      .expect(200);
    expect(updated.body.data.amount).toBe(200);

    const list = await request(app)
      .get("/api/transfer/getAllTransfers")
      .set(auth())
      .expect(200);
    expect(list.body.data).toHaveLength(1);

    const deleted = await request(app)
      .delete(`/api/transfer/deleteTransfer/${transferId}`)
      .set(auth())
      .expect(200);
    expect(deleted.body.data._id).toBe(transferId);
  });

  it("tracks liabilities and posts EMI payments to the expense ledger", async () => {
    const created = await request(app)
      .post("/api/liability/createLiability")
      .set(auth())
      .send({
        name: "Home loan",
        type: "loan",
        lender: "Example Bank",
        originalAmount: 1200,
        annualInterestRate: 9.5,
        installmentAmount: 200,
        totalInstallments: 6,
        startDate: "2025-01-01",
        nextDueDate: "2025-01-20",
        notes: "Test loan",
      })
      .expect(201);
    const liabilityId = created.body.data._id as string;
    expect(created.body.data).toMatchObject({
      remainingAmount: 1200,
      paidInstallments: 0,
      status: "active",
    });

    await request(app)
      .get(`/api/liability/getLiability/${liabilityId}`)
      .set(auth())
      .expect(200);

    const updated = await request(app)
      .put(`/api/liability/updateLiability/${liabilityId}`)
      .set(auth())
      .send({ lender: "Primary Bank" })
      .expect(200);
    expect(updated.body.data.lender).toBe("Primary Bank");

    const payment = await request(app)
      .post(`/api/liability/recordPayment/${liabilityId}`)
      .set(auth())
      .send({
        accountId: bankAccountId,
        amount: 200,
        date: "2025-01-20",
        notes: "January installment",
      })
      .expect(201);
    expect(payment.body.data.liability).toMatchObject({
      remainingAmount: 1000,
      paidInstallments: 1,
    });

    const payments = await request(app)
      .get(`/api/liability/getPayments/${liabilityId}`)
      .set(auth())
      .expect(200);
    expect(payments.body.data).toHaveLength(1);
    expect(payments.body.data[0].liabilityId).toBe(liabilityId);

    await request(app)
      .delete(`/api/expense/deleteExpense/${payment.body.data.payment._id}`)
      .set(auth())
      .expect(400);
    await request(app)
      .delete(`/api/liability/deleteLiability/${liabilityId}`)
      .set(auth())
      .expect(409);
  });

  it("returns a reconciled monthly report", async () => {
    const receiptExpense = await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: bankAccountId,
        title: "Delivered meal",
        totalAmount: 110,
        date: "2025-01-22T12:00:00.000Z",
        items: [{ name: "Meal", price: 100, quantity: 1 }],
        adjustments: [
          { kind: "vat", label: "VAT", type: "charge", amount: 15 },
          { kind: "discount", label: "Discount", type: "discount", amount: 5 },
        ],
      })
      .expect(201);

    const report = await request(app)
      .get("/api/report/monthly?month=2025-01")
      .set(auth())
      .expect(200);

    expect(report.body.data.summary).toMatchObject({
      totalExpense: 310,
      emiPayments: 200,
      transactionCount: 2,
    });
    expect(report.body.data.categoryBreakdown[0]).toMatchObject({
      name: "Loan EMI",
      amount: 200,
    });
    expect(report.body.data.itemBreakdown[0]).toMatchObject({
      name: "Loan EMI payment",
      amount: 200,
      quantity: 1,
    });
    expect(report.body.data.adjustmentBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "VAT", type: "charge", amount: 15 }),
        expect.objectContaining({ label: "Discount", type: "discount", amount: 5 }),
      ]),
    );

    await request(app)
      .get("/api/report/monthly?month=January")
      .set(auth())
      .expect(400);

    await request(app)
      .delete(`/api/expense/deleteExpense/${receiptExpense.body.data._id}`)
      .set(auth())
      .expect(200);
  });

  it("schedules bills, dispatches due notifications, and records payment", async () => {
    const dueAt = new Date(Date.now() + 60_000);
    const remindAt = new Date(Date.now() - 60_000);
    const created = await request(app)
      .post("/api/bill/createBill")
      .set(auth())
      .send({
        name: "Apartment rent",
        type: "rent",
        amount: 100,
        accountId: bankAccountId,
        categoryId: expenseCategoryId,
        recurrence: "monthly",
        dueAt: dueAt.toISOString(),
        remindAt: remindAt.toISOString(),
      })
      .expect(201);
    const billId = created.body.data._id as string;

    await request(app)
      .put(`/api/bill/updateBill/${billId}`)
      .set(auth())
      .send({ remindAt: new Date(dueAt.getTime() + 60_000).toISOString() })
      .expect(400);
    const scheduled = await request(app)
      .put(`/api/bill/updateBill/${billId}`)
      .set(auth())
      .send({ dueAt: dueAt.toISOString(), remindAt: remindAt.toISOString() })
      .expect(200);
    expect(scheduled.body.data.remindAt).toBe(remindAt.toISOString());

    await request(app)
      .post("/api/webhooks/reminders/dispatch")
      .set("x-webhook-secret", "wrong-secret-value")
      .expect(403);
    const dispatch = await request(app)
      .post("/api/webhooks/reminders/dispatch")
      .set("x-webhook-secret", "integration-reminder-secret")
      .expect(200);
    expect(dispatch.body.data).toMatchObject({ processed: 1, created: 1 });

    const repeatedDispatch = await request(app)
      .post("/api/webhooks/reminders/dispatch")
      .set("x-webhook-secret", "integration-reminder-secret")
      .expect(200);
    expect(repeatedDispatch.body.data.created).toBe(0);
    const notifications = await request(app)
      .get("/api/notifications")
      .set(auth())
      .expect(200);
    expect(notifications.body.data).toHaveLength(1);
    expect(notifications.body.data[0].title).toBe("Apartment rent is due");
    await request(app)
      .put(`/api/notifications/${notifications.body.data[0]._id}/read`)
      .set(auth())
      .expect(200);

    const payment = await request(app)
      .post(`/api/bill/payBill/${billId}`)
      .set(auth())
      .send({ accountId: bankAccountId })
      .expect(201);
    expect(payment.body.data.bill.status).toBe("active");
    expect(new Date(payment.body.data.bill.dueAt).getTime()).toBeGreaterThan(
      dueAt.getTime(),
    );
    expect(payment.body.data.payment.items[0]).toMatchObject({
      name: "Apartment rent",
      price: 100,
      quantity: 1,
    });

    await request(app)
      .delete(`/api/expense/deleteExpense/${payment.body.data.payment._id}`)
      .set(auth())
      .expect(400);
    await request(app)
      .delete(`/api/bill/deleteBill/${billId}`)
      .set(auth())
      .expect(409);
  });

  it("protects ledger references and spent income", async () => {
    await request(app)
      .delete(`/api/account/deleteAccount/${cashAccountId}`)
      .set(auth())
      .expect(409);

    await request(app)
      .delete(`/api/category/deleteCategory/${incomeCategoryId}`)
      .set(auth())
      .expect(409);

    const income = await request(app)
      .post("/api/income/createIncome")
      .set(auth())
      .send({
        categoryId: incomeCategoryId,
        accountId: bankAccountId,
        source: "Temporary funding",
        amount: 200,
      })
      .expect(201);

    const expense = await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: bankAccountId,
        title: "Use temporary funding",
        totalAmount: 400,
        items: [{ name: "Household supplies", price: 400, quantity: 1 }],
      })
      .expect(201);

    await request(app)
      .delete(`/api/income/deleteIncome/${income.body.data._id}`)
      .set(auth())
      .expect(400);

    await request(app)
      .delete(`/api/expense/deleteExpense/${expense.body.data._id}`)
      .set(auth())
      .expect(200);

    await request(app)
      .delete(`/api/income/deleteIncome/${income.body.data._id}`)
      .set(auth())
      .expect(200);
  });

  it("tracks credit card purchases, limits, statements, and payments", async () => {
    const funding = await request(app)
      .post("/api/account/createAccount")
      .set(auth())
      .send({
        accountName: "Card Payment Bank",
        accountNumber: 246810,
        accountType: "Bank",
        openingBalance: 1000,
        currency: "BDT",
      })
      .expect(201);

    const created = await request(app)
      .post("/api/account/createAccount")
      .set(auth())
      .send({
        accountName: "Everyday Credit Card",
        accountNumber: 987654,
        accountType: "Card",
        openingBalance: 1000,
        currency: "BDT",
        creditLimit: 5000,
        statementDay: 10,
        paymentDueDay: 25,
        statementBalance: 1000,
      })
      .expect(201);

    const cardAccountId = created.body.data._id;
    expect(created.body.data).toMatchObject({
      balance: -1000,
      creditLimit: 5000,
      statementDay: 10,
      paymentDueDay: 25,
      statementBalance: 1000,
    });

    await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: cardAccountId,
        title: "Card groceries",
        totalAmount: 500,
        items: [{ name: "Card groceries", price: 500, quantity: 1 }],
      })
      .expect(201);

    await request(app)
      .post("/api/expense/createExpense")
      .set(auth())
      .send({
        categoryId: expenseCategoryId,
        accountId: cardAccountId,
        title: "Over limit purchase",
        totalAmount: 4000,
        items: [{ name: "Over limit purchase", price: 4000, quantity: 1 }],
      })
      .expect(400);

    const emi = await request(app)
      .post("/api/liability/createLiability")
      .set(auth())
      .send({
        name: "Phone EMI",
        type: "credit_card_emi",
        lender: "Everyday Credit Card",
        cardAccountId,
        originalAmount: 300,
        annualInterestRate: 0,
        installmentAmount: 100,
        totalInstallments: 3,
        startDate: "2026-07-01",
        nextDueDate: "2026-08-01",
      })
      .expect(201);

    const installment = await request(app)
      .post(`/api/liability/recordPayment/${emi.body.data._id}`)
      .set(auth())
      .send({
        accountId: cardAccountId,
        amount: 100,
        date: "2026-08-01",
      })
      .expect(201);
    expect(installment.body.data.liability).toMatchObject({
      cardAccountId,
      remainingAmount: 200,
      paidInstallments: 1,
    });

    const payment = await request(app)
      .post(`/api/account/payCreditCard/${cardAccountId}`)
      .set(auth())
      .send({
        fromAccountId: funding.body.data._id,
        amount: 100,
        notes: "Monthly card payment",
      })
      .expect(201);

    expect(payment.body.data.card).toMatchObject({
      balance: -1500,
      statementBalance: 1000,
    });
    expect(payment.body.data.payment).toMatchObject({
      transferType: "card_payment",
      amount: 100,
    });

    await request(app)
      .post("/api/transfer/createTransfer")
      .set(auth())
      .send({
        fromAccountId: funding.body.data._id,
        toAccountId: cardAccountId,
        amount: 10,
      })
      .expect(400);
  });

  it("prevents cross-user resource access", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Second User",
        email: "second@example.com",
        password: "password123",
      })
      .expect(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: "second@example.com", password: "password123" })
      .expect(200);

    const secondToken = login.body.data as string;
    await request(app)
      .get(`/api/account/getAccount/${cashAccountId}`)
      .set({ Authorization: `Bearer ${secondToken}` })
      .expect(404);
  });
});
