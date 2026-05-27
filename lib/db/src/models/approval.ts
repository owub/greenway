import mongoose, { Schema, type Document } from "mongoose";

export interface IApproval extends Document {
  sessionId: string;
  faceImageData?: string | null;
  status: "pending" | "approved" | "denied";
  sessionToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const approvalSchema = new Schema<IApproval>(
  {
    sessionId:     { type: String, required: true, unique: true, index: true },
    faceImageData: { type: String, default: null },
    status:        { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    sessionToken:  { type: String, default: null, index: true },
  },
  { timestamps: true },
);

export const ApprovalModel =
  (mongoose.models.Approval as mongoose.Model<IApproval>) ??
  mongoose.model<IApproval>("Approval", approvalSchema);
