import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { json, route } from "@/lib/http";
import { readNotificationsSchema } from "@/lib/validators";
import { Notification } from "@/models/Notification";

export const POST = route(async (req) => {
  const session = await requireUser(req);
  const input = readNotificationsSchema.parse(await req.json());

  await connectDB();
  // The owner is part of the filter, so ids belonging to someone else simply don't match.
  const result = await Notification.updateMany(
    { user: session.userId, read: false, ...("ids" in input && { _id: { $in: input.ids } }) },
    { $set: { read: true } },
  );
  const unreadCount = await Notification.countDocuments({ user: session.userId, read: false });

  return json({ updated: result.modifiedCount, unreadCount });
});
