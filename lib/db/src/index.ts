import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set. Please add it to your environment variables.",
    );
  }

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function purgeLegacyBiometricData(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  await mongoose.connection.dropCollection("approvals").catch(() => undefined);
}

export * from "./video-storage";
export * from "./models";
