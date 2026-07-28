import type { Request, Response } from "express";
import mongoose from "mongoose";
import app from "../src/app";
import connectDB from "../src/config/db";

let connectionPromise: Promise<void> | null = null;

const ensureDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connectionPromise ??= connectDB();
  return connectionPromise;
};

export default async function handler(req: Request, res: Response) {
  await ensureDatabase();
  return app(req, res);
}
