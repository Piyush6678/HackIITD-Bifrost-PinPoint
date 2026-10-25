import imageCompression from "browser-image-compression";

// About 120 KB keeps uploads quick on a weak mobile connection, and 1600 px is
// still plenty for an engineer to judge a pothole.
const OPTIONS = {
  maxSizeMB: 0.12,
  maxWidthOrHeight: 1600,
  initialQuality: 0.8,
  fileType: "image/jpeg",
  useWebWorker: true,
};

export class PhotoError extends Error {}

export async function compressPhoto(input: File) {
  if (!input.type.startsWith("image/")) throw new PhotoError("That file isn't a photo. Pick a JPEG or PNG image.");

  try {
    const blob = await imageCompression(input, OPTIONS);
    return new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Mostly HEIC files on browsers that can't decode them.
    throw new PhotoError("We couldn't read that photo. Try a JPEG or PNG, or take a new one with the camera.");
  }
}
