import mongoose, { Schema, type Document } from "mongoose";

export interface IDeviceInfo {
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
  platform?: string;
  timezone?: string;
  language?: string;
}

export interface ISurveillanceCapture {
  imageData: string;
  timestamp: Date;
}

export interface IApproval extends Document {
  sessionId: string;
  faceImageData?: string | null;
  status: "pending" | "approved" | "denied";
  sessionToken?: string | null;
  ipAddress?: string | null;
  deviceInfo?: IDeviceInfo | null;
  surveillanceCaptures: ISurveillanceCapture[];
  createdAt: Date;
  updatedAt: Date;
}

const deviceInfoSchema = new Schema<IDeviceInfo>(
  {
    userAgent:    { type: String },
    screenWidth:  { type: Number },
    screenHeight: { type: Number },
    platform:     { type: String },
    timezone:     { type: String },
    language:     { type: String },
  },
  { _id: false },
);

const surveillanceCaptureSchema = new Schema<ISurveillanceCapture>(
  {
    imageData: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const approvalSchema = new Schema<IApproval>(
  {
    sessionId:              { type: String, required: true, unique: true, index: true },
    faceImageData:          { type: String, default: null },
    status:                 { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    sessionToken:           { type: String, default: null, index: true },
    ipAddress:              { type: String, default: null },
    deviceInfo:             { type: deviceInfoSchema, default: null },
    surveillanceCaptures:   { type: [surveillanceCaptureSchema], default: [] },
  },
  { timestamps: true },
);

export const ApprovalModel =
  (mongoose.models.Approval as mongoose.Model<IApproval>) ??
  mongoose.model<IApproval>("Approval", approvalSchema);
