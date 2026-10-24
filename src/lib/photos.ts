import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "./constants";
import { HttpError } from "./http";

export async function readPhoto(form: FormData, field = "photo") {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) {
    throw new HttpError(400, "A photo is required");
  }
  if (!PHOTO_TYPES.includes(file.type)) {
    throw new HttpError(415, "Photo must be a JPEG, PNG or WebP image");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new HttpError(413, "Photo is too large, keep it under 5 MB");
  }
  return { data: Buffer.from(await file.arrayBuffer()), mimeType: file.type, size: file.size };
}

// FormData values we care about are strings; drop files and empty fields.
export function formFields(form: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}
