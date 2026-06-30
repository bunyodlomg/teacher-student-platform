import "./env";
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cambridge-learn";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = globalThis as unknown as { __mongoose?: MongooseCache };
const cache: MongooseCache = g.__mongoose ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== "production") g.__mongoose = cache;

/** Returns a singleton mongoose connection, dialing only once. */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(MONGODB_URI, {
      // sensible defaults; tweak if needed
      serverSelectionTimeoutMS: 8000,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

// Eagerly register all models on import — keeps refs/populate consistent.
import "./models";

export { mongoose };
