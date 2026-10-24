import { Schema, model, models, type Model, type Types } from "mongoose";
import { CATEGORIES, DUPLICATE_RADIUS_M, STATUSES, type Category, type Status } from "@/lib/constants";
import { toGeoPoint, type GeoPoint, type LatLng } from "@/lib/geo";

type Tagging = { category: Category; severity: number; title?: string };

export interface IIssue {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category: Category;
  severity: number;
  location: GeoPoint;
  address?: string;
  ward?: Types.ObjectId;
  status: Status;
  reporter: Types.ObjectId;
  photo: Types.ObjectId;
  resolutionPhoto?: Types.ObjectId;
  upvotes: Types.ObjectId[];
  upvoteCount: number;
  // Both kept so we can measure how often people override the model.
  aiSuggestion?: Tagging;
  userChoice: Tagging;
  verification: {
    confirms: { user: Types.ObjectId; at: Date }[];
    rejects: { user: Types.ObjectId; at: Date }[];
  };
  portal?: { name: string; ticketId?: string; expectedBy?: Date; lastSyncedAt?: Date };
  statusHistory: { status: Status; at: Date; by?: Types.ObjectId; note?: string }[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IssueModel extends Model<IIssue> {
  findNearbyDuplicate(
    point: LatLng & { category: Category },
    radiusM?: number,
  ): Promise<IIssue | null>;
}

const tagging = {
  _id: false,
  category: { type: String, enum: CATEGORIES },
  severity: { type: Number, min: 1, max: 5 },
  title: String,
};

const vote = { _id: false, user: { type: Schema.Types.ObjectId, ref: "User" }, at: Date };

const issueSchema = new Schema<IIssue, IssueModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: String, enum: CATEGORIES, required: true },
    severity: { type: Number, min: 1, max: 5, required: true },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, trim: true, maxlength: 200 },
    ward: { type: Schema.Types.ObjectId, ref: "Ward" },
    status: { type: String, enum: STATUSES, default: "open" },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photo: { type: Schema.Types.ObjectId, ref: "Photo", required: true },
    resolutionPhoto: { type: Schema.Types.ObjectId, ref: "Photo" },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    upvoteCount: { type: Number, default: 0 },
    aiSuggestion: tagging,
    userChoice: { ...tagging, category: { ...tagging.category, required: true } },
    verification: {
      confirms: [vote],
      rejects: [vote],
    },
    portal: {
      _id: false,
      name: String,
      ticketId: String,
      expectedBy: Date,
      lastSyncedAt: Date,
    },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: STATUSES, required: true },
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
    resolvedAt: Date,
  },
  { timestamps: true },
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ category: 1, status: 1, createdAt: -1 });
issueSchema.index({ ward: 1, status: 1 });
issueSchema.index({ upvoteCount: -1 });

issueSchema.static(
  "findNearbyDuplicate",
  function ({ lat, lng, category }: LatLng & { category: Category }, radiusM = DUPLICATE_RADIUS_M) {
    return this.findOne({
      category,
      status: { $ne: "resolved" },
      location: {
        $near: { $geometry: toGeoPoint({ lat, lng }), $maxDistance: radiusM },
      },
    }).lean();
  },
);

export const Issue =
  (models.Issue as IssueModel | undefined) ?? model<IIssue, IssueModel>("Issue", issueSchema);
