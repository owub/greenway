import mongoose from "mongoose";

const VIDEO_BUCKET_NAME = "videos";

export function getVideoBucket(): mongoose.mongo.GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB must be connected before accessing video storage");
  }

  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: VIDEO_BUCKET_NAME,
  });
}

export function parseVideoId(value: string): mongoose.mongo.ObjectId | null {
  if (!mongoose.mongo.ObjectId.isValid(value)) return null;
  return new mongoose.mongo.ObjectId(value);
}
