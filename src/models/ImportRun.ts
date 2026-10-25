import { Schema, model, models, type Model, type Types } from "mongoose";
import { IMPORT_KINDS, IMPORT_STATUSES, type ImportKind, type ImportStatus } from "@/lib/constants";

// A log of everything TinyFish was asked to do for us. A contacts run also keeps what it
// found in `proposal`, which waits there until an admin accepts it.
export interface IImportRun {
  _id: Types.ObjectId;
  kind: ImportKind;
  source: string;
  status: ImportStatus;
  agentRunId?: string;
  startedAt: Date;
  finishedAt?: Date;
  summary?: string;
  error?: string;
  proposal?: unknown;
  requestedBy?: Types.ObjectId;
}

const importRunSchema = new Schema<IImportRun>({
  kind: { type: String, enum: IMPORT_KINDS, required: true },
  source: { type: String, required: true, maxlength: 300 },
  status: { type: String, enum: IMPORT_STATUSES, default: "running" },
  agentRunId: String,
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  summary: { type: String, maxlength: 500 },
  error: { type: String, maxlength: 500 },
  proposal: Schema.Types.Mixed,
  requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

importRunSchema.index({ kind: 1, startedAt: -1 });

export const ImportRun: Model<IImportRun> = models.ImportRun ?? model<IImportRun>("ImportRun", importRunSchema);
