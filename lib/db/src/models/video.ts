import mongoose, { Schema, type Document } from "mongoose";

export interface IVideo extends Document {
  title: string;
  description?: string | null;
  filename: string;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    title:       { type: String, required: true },
    description: { type: String, default: null },
    filename:    { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const VideoModel =
  (mongoose.models.Video as mongoose.Model<IVideo>) ??
  mongoose.model<IVideo>("Video", videoSchema);
