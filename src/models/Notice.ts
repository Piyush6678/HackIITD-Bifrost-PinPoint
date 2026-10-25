import { Schema, model, models, type Model, type Types } from "mongoose";
import "./Ward";
import { CATEGORIES, type Category } from "@/lib/constants";
import type { GeoPoint } from "@/lib/geo";

// Something an official body has announced that touches a pilot ward: resurfacing, a water
// shutdown, a cleanliness drive. TinyFish monitors find them; nothing is shown to the public
// until an admin approves it.
export interface INotice {
  _id: Types.ObjectId;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: Date;
  wards: Types.ObjectId[];
  // Empty means it applies to every category.
  categories: Category[];
  location?: GeoPoint;
  approved: boolean;
  approvedAt?: Date;
  // Hash of the address and title, so the same notice seen twice is stored once.
  externalKey: string;
  createdAt: Date;
}

const noticeSchema = new Schema<INotice>({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  summary: { type: String, default: "", trim: true, maxlength: 600 },
  url: { type: String, required: true, maxlength: 500 },
  source: { type: String, required: true, maxlength: 120 },
  publishedAt: Date,
  wards: [{ type: Schema.Types.ObjectId, ref: "Ward" }],
  categories: [{ type: String, enum: CATEGORIES }],
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: [Number],
  },
  approved: { type: Boolean, default: false },
  approvedAt: Date,
  externalKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

noticeSchema.index({ approved: 1, publishedAt: -1, createdAt: -1 });
noticeSchema.index({ wards: 1, approved: 1 });

export const Notice: Model<INotice> = models.Notice ?? model<INotice>("Notice", noticeSchema);
