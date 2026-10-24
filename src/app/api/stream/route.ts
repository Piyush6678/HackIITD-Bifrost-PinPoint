import { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { route } from "@/lib/http";
import { serializeNotification } from "@/lib/notifications";
import { Issue } from "@/models/Issue";
import { Notification, type INotification } from "@/models/Notification";

const HEARTBEAT_MS = 25_000;

// Server-Sent Events: new notifications for the logged-in user, pushed as they are saved.
// The filter is built from the session on the server, so nobody can listen to someone else.
// Clients must still poll /api/notifications as a fallback, because some hosts cut long requests.
export const GET = route(async (req) => {
  const session = await requireUser(req);
  await connectDB();
  const owner = new Types.ObjectId(session.userId);
  const encoder = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (text: string) => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };

      const changes = Notification.watch<INotification>([
        { $match: { operationType: "insert", "fullDocument.user": owner } },
      ]);
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        req.signal.removeEventListener("abort", stop);
        changes.close().catch(() => {});
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      };

      changes.on("change", async (change) => {
        if (change.operationType !== "insert") return;
        const doc = change.fullDocument;
        const issue = doc.issue ? await Issue.findById(doc.issue).select("title").lean() : null;
        const payload = serializeNotification({ ...doc, issue: issue ?? doc.issue });
        write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
      });
      // No replica set, or the cursor died: tell the client to fall back to polling.
      changes.on("error", () => {
        write("event: unavailable\ndata: {}\n\n");
        stop();
      });

      req.signal.addEventListener("abort", stop);
      write("retry: 15000\n: connected\n\n");
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
