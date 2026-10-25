import { Schema, model, models, type Model, type Types } from "mongoose";
// Registers the Ward model, so populate("ward") works even before anything else imports it.
import "./Ward";
import { ROLES, type Role } from "@/lib/constants";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  ward?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "citizen" },
    ward: { type: Schema.Types.ObjectId, ref: "Ward" },
  },
  { timestamps: true },
);

export const User: Model<IUser> = models.User ?? model<IUser>("User", userSchema);
