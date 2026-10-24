import { Schema, model, models, type Model, type Types } from "mongoose";
import { toGeoPoint, type LatLng } from "@/lib/geo";

export interface IWard {
  _id: Types.ObjectId;
  number: number;
  name: string;
  zone: string;
  boundary: { type: "Polygon"; coordinates: number[][][] };
  contacts: { department: string; name?: string; phone?: string; email?: string }[];
}

interface WardModel extends Model<IWard> {
  findContaining(point: LatLng): Promise<IWard | null>;
}

const wardSchema = new Schema<IWard, WardModel>({
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  zone: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ["Polygon"], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
  contacts: [
    {
      _id: false,
      department: { type: String, required: true },
      name: String,
      phone: String,
      email: String,
    },
  ],
});

wardSchema.index({ boundary: "2dsphere" });

wardSchema.static("findContaining", function (point: LatLng) {
  return this.findOne({
    boundary: { $geoIntersects: { $geometry: toGeoPoint(point) } },
  }).lean();
});

export const Ward =
  (models.Ward as WardModel | undefined) ?? model<IWard, WardModel>("Ward", wardSchema);
