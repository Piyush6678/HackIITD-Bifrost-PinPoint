import { connectDB } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { objectId } from "@/lib/validators";
import { Photo } from "@/models/Photo";

export const GET = route(async (_req, ctx: RouteContext<"/api/photos/[id]">) => {
  const id = objectId((await ctx.params).id);

  await connectDB();
  const photo = await Photo.findById(id);
  if (!photo) throw new HttpError(404, "Photo not found");

  // Photo documents are never edited in place, only deleted, so the URL is safe to cache.
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
