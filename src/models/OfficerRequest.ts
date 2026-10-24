import { Schema, model, models, type Model, type Types } from "mongoose";
import "./User";
import "./Ward";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/constants";

// A resident asking to be made the officer for a ward. An admin checks who they are
// and approves or rejects it; nobody becomes an official on their own say-so.
export interface IOfficerRequest {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  ward: Types.ObjectId;
  designation: string;
  department: string;
  employeeId?: string;
  phone?: string;
  note?: string;
  status: RequestStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const requestSchema = new Schema<IOfficerRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ward: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    designation: { type: String, required: true, trim: true, maxlength: 80 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    employeeId: { type: String, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, maxlength: 20 },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// One open request per person. Old approved or rejected ones stay as history.
requestSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
requestSchema.index({ status: 1, createdAt: -1 });

export const OfficerRequest: Model<IOfficerRequest> =
  models.OfficerRequest ?? model<IOfficerRequest>("OfficerRequest", requestSchema);
