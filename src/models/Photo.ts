import { Schema, model, models, type Model, type Types } from "mongoose";

// Photos live in their own collection so issue queries never drag image bytes along.
export interface IPhoto {
  _id: Types.ObjectId;
  data: Buffer;
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const photoSchema = new Schema<IPhoto>(
  {
    data: { type: Buffer, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Photo: Model<IPhoto> = models.Photo ?? model<IPhoto>("Photo", photoSchema);
