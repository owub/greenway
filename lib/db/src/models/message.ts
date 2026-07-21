import mongoose, { Schema, type Document } from "mongoose";

export interface IMessage extends Document {
  author: string;
  text: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    author: { type: String, required: true, maxlength: 32 },
    text: { type: String, required: true, maxlength: 500 },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expires: 0,
    },
  },
  { timestamps: true },
);

messageSchema.index({ createdAt: -1 });

export const MessageModel =
  (mongoose.models.Message as mongoose.Model<IMessage>) ??
  mongoose.model<IMessage>("Message", messageSchema);
