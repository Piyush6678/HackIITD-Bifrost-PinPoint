import { requireUser } from "@/lib/auth";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { json, route } from "@/lib/http";
import { serializeNotification } from "@/lib/notifications";
import { listNotificationsSchema, searchParams } from "@/lib/validators";
import { Notification } from "@/models/Notification";

// Only ever the caller's own notifications.
export const GET = route(async (req) => {
  const session = await requireUser(req);
  const q = listNotificationsSchema.parse(searchParams(req));

  await connectDB();
  const [rows, unreadCount] = await Promise.all([
    Notification.find({ user: session.userId, ...(q.unread && { read: false }) })
      .sort({ createdAt: -1 })
      .limit(NOTIFICATIONS_PAGE_SIZE)
      .populate("issue", "title")
      .lean(),
    Notification.countDocuments({ user: session.userId, read: false }),
  ]);

  return json({ notifications: rows.map(serializeNotification), unreadCount });
});
