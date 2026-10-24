import { Schema, model, models, type Model, type Types } from "mongoose";
import "./Issue";
import "./User";
import { NOTIFICATION_KINDS, NOTIFICATION_TTL_DAYS, type NotificationKind } from "@/lib/constants";

// One line in someone's bell. Always private to `user`.
export interface INotification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  // Officer-access decisions have no issue.
  issue?: Types.ObjectId;
  kind: NotificationKind;
  message: string;
  // Extra text from whoever caused it, like an officer's note or an admin's reason.
  note?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  issue: { type: Schema.Types.ObjectId, ref: "Issue" },
  kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
  message: { type: String, required: true, maxlength: 200 },
  note: { type: String, maxlength: 500 },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 });

export const Notification: Model<INotification> =
  models.Notification ?? model<INotification>("Notification", notificationSchema);
