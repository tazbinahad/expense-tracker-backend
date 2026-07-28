import mongoose from "mongoose";
import { env } from "./env";

const connectDB = async (): Promise<void> => {
  const connection = await mongoose.connect(env.MONGO_URI, { family: 4 });
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

export default connectDB;
