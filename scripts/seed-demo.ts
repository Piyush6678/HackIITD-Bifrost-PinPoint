import bcrypt from "bcryptjs";
import mongoose, { type Types } from "mongoose";
import { writeFile } from "node:fs/promises";
import { pilotWardDefs } from "../src/data/pilotWards";
import type { Category, Status } from "../src/lib/constants";
import { connectDB } from "../src/lib/db";
import { toGeoPoint } from "../src/lib/geo";
import { makeOfficial } from "../src/lib/officials";
import { Issue } from "../src/models/Issue";
import { Notification } from "../src/models/Notification";
import { OfficerRequest } from "../src/models/OfficerRequest";
import { Photo } from "../src/models/Photo";
import { User } from "../src/models/User";
import { Ward } from "../src/models/Ward";
import { drawScene, type SceneState } from "./demo/scenes";

// Demo data for showing every feature: 20 reports across four wards, in every state an
// issue can be in, with residents, officers, votes, failed fixes, a reopened issue,
// overdue and escalation-ready issues, alerts and officer requests.
//
//   npm run seed:demo
//
// Needs DEMO_PASSWORD (all demo accounts use it). Safe to re-run: it removes only what an
// earlier run made (reports by demo residents, their photos and alerts) and rebuilds it.
// Writes login.md with every account.

const DOMAIN = "pinpoint.test";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);

const RESIDENTS = [
  "Ravi Kumar",
  "Meera Iyer",
  "Arjun Bansal",
  "Fatima Sheikh",
  "Harpreet Kaur",
  "Sunil Yadav",
  "Ananya Das",
  "Imran Qureshi",
  "Pooja Malhotra",
  "Rahul Chopra",
  "Kavita Nair",
  "Mohit Arora",
];
const emailOf = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".")}@${DOMAIN}`;

const OFFICERS: Record<number, { name: string; designation: string; department: string }> = {
  76: { name: "Rohit Mehta", designation: "Assistant Engineer", department: "MCD Engineering" },
  77: { name: "Sana Khan", designation: "Assistant Engineer", department: "MCD Engineering" },
  78: { name: "Anil Sharma", designation: "Junior Engineer (Maintenance)", department: "MCD Engineering" },
  79: { name: "Priya Verma", designation: "Assistant Engineer", department: "MCD Engineering" },
  80: { name: "Neha Gupta", designation: "Sanitary Inspector", department: "MCD Sanitation" },
  81: { name: "Deepak Singh", designation: "Junior Engineer", department: "MCD Engineering" },
};
const ADMIN = { email: `admin@${DOMAIN}`, name: "PinPoint Admin" };

// How far each report has got. Times are days after it was reported unless marked.
type Attempt = { at: number; note: string; judgedAfterHours: number };
type Story =
  | { kind: "open" }
  | { kind: "in_progress"; startedAt: number; note: string }
  | { kind: "pending"; startedAt?: number; fixHoursAgo: number; note: string; confirms: number; rejects: number; match: number }
  | { kind: "resolved"; startedAt?: number; fixedAt: number; note: string; match: number }
  | { kind: "reopened"; fixedAt: number; reopenedDaysAgo: number; note: string; match: number };

type Report = {
  ward: number;
  category: Category;
  title: string;
  description: string;
  severity: number;
  // Position inside the ward, as fractions of its box.
  at: [number, number];
  address: string;
  reportedDaysAgo: number;
  reporter: number;
  upvoters: number;
  failed?: Attempt[];
  story: Story;
};

const REPORTS: Report[] = [
  // Ward 78, Karol Bagh: a ward that fixes things and gets them confirmed.
  {
    ward: 78, category: "pothole", title: "Deep pothole outside Gaffar Market gate", severity: 4,
    description: "About a foot wide and deep enough that two-wheelers swerve into traffic to avoid it.",
    at: [0.62, 0.55], address: "Gaffar Market, Ajmal Khan Road", reportedDaysAgo: 12, reporter: 0, upvoters: 9,
    story: { kind: "resolved", startedAt: 1, fixedAt: 4, note: "Filled with hot mix and rolled", match: 91 },
  },
  {
    ward: 78, category: "garbage", title: "Garbage dumped next to the Arya Samaj Road bus stop", severity: 3,
    description: "Bags piling up for three days. Stray dogs are tearing them open.",
    at: [0.3, 0.35], address: "Arya Samaj Road bus stop", reportedDaysAgo: 9, reporter: 1, upvoters: 6,
    story: { kind: "resolved", fixedAt: 1.5, note: "Cleared and the spot added to the daily round", match: 87 },
  },
  {
    ward: 78, category: "streetlight", title: "Three streetlights out on Bank Street", severity: 3,
    description: "The whole stretch past the bank is dark after 7 pm.",
    at: [0.48, 0.78], address: "Bank Street", reportedDaysAgo: 15, reporter: 2, upvoters: 5,
    story: { kind: "resolved", startedAt: 1, fixedAt: 3, note: "Replaced the fittings and the timer", match: 84 },
  },
  {
    ward: 78, category: "waterlogging", title: "Water standing at the Pusa Road service lane", severity: 3,
    description: "Knee-deep after every shower; the drain inlet is choked with silt.",
    at: [0.8, 0.22], address: "Pusa Road service lane", reportedDaysAgo: 3, reporter: 0, upvoters: 7,
    story: { kind: "pending", startedAt: 1, fixHoursAgo: 5, note: "Desilted the inlet and cleared the drain", confirms: 2, rejects: 0, match: 82 },
  },
  {
    ward: 78, category: "sewage", title: "Sewer overflowing near Karol Bagh metro exit 3", severity: 5,
    description: "Sewage running across the footpath. People walking from the metro have to step into the road.",
    at: [0.15, 0.62], address: "Karol Bagh metro, exit 3", reportedDaysAgo: 1, reporter: 3, upvoters: 12,
    story: { kind: "open" },
  },

  // Ward 79, Rajinder Nagar: fixes that don't hold, so the escalation tools show up.
  {
    ward: 79, category: "pothole", title: "Crater on Shankar Road that keeps coming back", severity: 5,
    description: "Patched twice and broken again within days. A scooter rider fell here last week.",
    at: [0.55, 0.45], address: "Shankar Road, near the petrol pump", reportedDaysAgo: 11, reporter: 0, upvoters: 12,
    failed: [
      { at: 2, note: "Patched with cold mix", judgedAfterHours: 20 },
      { at: 6, note: "Re-patched", judgedAfterHours: 26 },
    ],
    story: { kind: "in_progress", startedAt: 8, note: "Full-depth repair scheduled with the PWD crew" },
  },
  {
    ward: 79, category: "garbage", title: "Overflowing dhalao behind Old Rajinder Nagar market", severity: 4,
    description: "The collection point hasn't been emptied and waste is spilling onto the lane.",
    at: [0.25, 0.3], address: "Old Rajinder Nagar market", reportedDaysAgo: 8, reporter: 4, upvoters: 8,
    failed: [{ at: 1, note: "Cleared the front of the dhalao", judgedAfterHours: 18 }],
    story: { kind: "resolved", fixedAt: 3, note: "Emptied fully and the lane washed", match: 80 },
  },
  {
    ward: 79, category: "encroachment", title: "Footpath blocked by shop extensions on Main Market road", severity: 3,
    description: "Stalls and display racks cover the whole footpath; pedestrians walk in the traffic.",
    at: [0.7, 0.7], address: "Rajinder Nagar Main Market road", reportedDaysAgo: 25, reporter: 5, upvoters: 10,
    story: { kind: "open" },
  },
  {
    ward: 79, category: "streetlight", title: "Dark park entrance on Ganga Ram Hospital Marg", severity: 3,
    description: "Both lamps at the park gate are out. It feels unsafe walking here at night.",
    at: [0.4, 0.85], address: "Ganga Ram Hospital Marg, park gate", reportedDaysAgo: 10, reporter: 6, upvoters: 4,
    story: { kind: "resolved", startedAt: 1, fixedAt: 2, note: "New LED fittings installed", match: 86 },
  },
  {
    ward: 79, category: "other", title: "Fallen tree branch across the footpath", severity: 2,
    description: "A large branch came down in the storm and is still lying across the path.",
    at: [0.85, 0.2], address: "Pusa Lane, near the school", reportedDaysAgo: 4, reporter: 7, upvoters: 3,
    story: { kind: "pending", fixHoursAgo: 20, note: "Branch cut and removed by the horticulture team", confirms: 1, rejects: 1, match: 74 },
  },

  // Ward 76, West Patel Nagar: an overdue backlog and a fix that didn't last.
  {
    ward: 76, category: "garbage", title: "Waste piling up at the Patel Road corner", severity: 4,
    description: "Nobody has collected from this corner in days. The smell reaches the houses.",
    at: [0.4, 0.4], address: "Patel Road corner", reportedDaysAgo: 5, reporter: 8, upvoters: 9,
    story: { kind: "open" },
  },
  {
    ward: 76, category: "pothole", title: "Pothole on the 14 Block road is back", severity: 4,
    description: "It was filled last month but has opened up again after the rain.",
    at: [0.65, 0.6], address: "14 Block road, West Patel Nagar", reportedDaysAgo: 30, reporter: 9, upvoters: 6,
    story: { kind: "reopened", fixedAt: 6, reopenedDaysAgo: 3, note: "Filled and rolled", match: 83 },
  },
  {
    ward: 76, category: "waterlogging", title: "Underpass floods after every rain", severity: 4,
    description: "Cars stall in the water and the underpass has to be closed.",
    at: [0.2, 0.75], address: "Patel Nagar underpass", reportedDaysAgo: 2, reporter: 10, upvoters: 11,
    story: { kind: "in_progress", startedAt: 1, note: "Pump arranged; drain cleaning starts tomorrow" },
  },
  {
    ward: 76, category: "sewage", title: "Open manhole without a cover", severity: 5,
    description: "The cover is missing. Someone could fall in, especially at night.",
    at: [0.8, 0.25], address: "Street 7, West Patel Nagar", reportedDaysAgo: 6, reporter: 1, upvoters: 8,
    story: { kind: "resolved", fixedAt: 1, note: "New cover fixed and cemented", match: 92 },
  },
  {
    ward: 76, category: "streetlight", title: "Flickering light outside the community hall", severity: 2,
    description: "Keeps switching on and off all night.",
    at: [0.55, 0.15], address: "Community hall, West Patel Nagar", reportedDaysAgo: 2, reporter: 11, upvoters: 2,
    story: { kind: "open" },
  },

  // Ward 80, Dev Nagar: a fix waiting for its first vote, and a mixed record.
  {
    ward: 80, category: "pothole", title: "Broken road at the Desh Bandhu Gupta Road turn", severity: 3,
    description: "The road edge has crumbled at the turn and buses bounce through it.",
    at: [0.5, 0.5], address: "Desh Bandhu Gupta Road turn", reportedDaysAgo: 7, reporter: 2, upvoters: 7,
    failed: [{ at: 2, note: "Patched the edge", judgedAfterHours: 22 }],
    story: { kind: "pending", startedAt: 3, fixHoursAgo: 2, note: "Relaid the edge with a proper base", confirms: 0, rejects: 0, match: 78 },
  },
  {
    ward: 80, category: "encroachment", title: "Parked rehris blocking the lane to the school", severity: 3,
    description: "Carts parked across the lane every morning; school vans can't get through.",
    at: [0.3, 0.3], address: "School lane, Dev Nagar", reportedDaysAgo: 6, reporter: 3, upvoters: 5,
    story: { kind: "in_progress", startedAt: 2, note: "Notice served; enforcement drive on Friday" },
  },
  {
    ward: 80, category: "garbage", title: "Construction debris dumped on the roadside", severity: 3,
    description: "Bricks and rubble left on the road after a building repair.",
    at: [0.75, 0.7], address: "Beadonpura road", reportedDaysAgo: 10, reporter: 5, upvoters: 4,
    story: { kind: "resolved", startedAt: 1, fixedAt: 2, note: "Debris lifted; the builder has been fined", match: 88 },
  },
  {
    ward: 80, category: "other", title: "Broken bench and railing in the DDA park", severity: 2,
    description: "The bench is split and the railing next to it has sharp ends sticking out.",
    at: [0.2, 0.8], address: "DDA park, Dev Nagar", reportedDaysAgo: 3, reporter: 6, upvoters: 3,
    story: { kind: "open" },
  },
  {
    ward: 80, category: "waterlogging", title: "Waterlogging outside the dispensary", severity: 4,
    description: "Patients have to wade through water to reach the gate.",
    at: [0.85, 0.35], address: "Dev Nagar dispensary", reportedDaysAgo: 9, reporter: 8, upvoters: 6,
    story: { kind: "resolved", startedAt: 1, fixedAt: 2.5, note: "Drain cleared and the road level raised", match: 85 },
  },
];

function pointIn(wardNumber: number, [fx, fy]: [number, number]) {
  const def = pilotWardDefs.find((w) => w.number === wardNumber)!;
  const [minLng, minLat, maxLng, maxLat] = def.box;
  return { lng: minLng + (maxLng - minLng) * fx, lat: minLat + (maxLat - minLat) * fy };
}

// A spot a few metres away, where the officer stood for the after-photo.
const nearby = (p: { lat: number; lng: number }, metres: number) => ({ lat: p.lat + metres / 111_000, lng: p.lng });

async function upsertUser(email: string, name: string, passwordHash: string) {
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { passwordHash, name }, $setOnInsert: { email, role: "citizen" } },
    { upsert: true, returnDocument: "after" },
  );
  return user!;
}

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("Set DEMO_PASSWORD in .env.local first; every demo account uses it.");
  const passwordHash = await bcrypt.hash(password, 10);

  await connectDB();
  const wards = new Map((await Ward.find().lean()).map((w) => [w.number, w]));
  if (wards.size === 0) throw new Error("No wards yet. Run npm run seed:wards first.");

  // Accounts.
  const admin = await upsertUser(ADMIN.email, ADMIN.name, passwordHash);
  await User.updateOne({ _id: admin._id }, { $set: { role: "admin" }, $unset: { ward: 1 } });

  const officers = new Map<number, Types.ObjectId>();
  for (const [ward, o] of Object.entries(OFFICERS)) {
    const email = `ward${ward}.officer@${DOMAIN}`;
    const user = await upsertUser(email, o.name, passwordHash);
    if (user.role === "admin") continue;
    await makeOfficial(email, Number(ward), { anyDomain: true });
    officers.set(Number(ward), user._id);
  }

  const residents: Types.ObjectId[] = [];
  for (const name of RESIDENTS) residents.push((await upsertUser(emailOf(name), name, passwordHash))._id);
  const applicants = {
    pending: await upsertUser(`vikram.joshi@${DOMAIN}`, "Vikram Joshi", passwordHash),
    rejected: await upsertUser(`karan.malhotra@${DOMAIN}`, "Karan Malhotra", passwordHash),
  };
  // Someone whose access was withdrawn would otherwise keep their ward.
  await User.updateMany({ _id: { $in: [...residents, applicants.pending._id, applicants.rejected._id] } }, {
    $set: { role: "citizen" },
    $unset: { ward: 1 },
  });

  // Clear what an earlier run made.
  const demoUsers = await User.find({ email: new RegExp(`@${DOMAIN.replace(".", "\\.")}$`) }).distinct("_id");
  const oldIssues = await Issue.find({ reporter: { $in: residents } }).select("photo resolutionPhoto fixAttempts").lean();
  const oldPhotos = oldIssues.flatMap((i) => [i.photo, i.resolutionPhoto, ...i.fixAttempts.map((a) => a.photo)]).filter((id): id is Types.ObjectId => Boolean(id));
  await Promise.all([
    Issue.deleteMany({ _id: { $in: oldIssues.map((i) => i._id) } }),
    Photo.deleteMany({ _id: { $in: oldPhotos } }),
    Notification.deleteMany({ user: { $in: demoUsers } }),
    OfficerRequest.deleteMany({ user: { $in: demoUsers } }),
  ]);

  // Officer requests: one per demo officer (approved, which is where designations come
  // from), one waiting for the admin, and one turned down.
  for (const [ward, o] of Object.entries(OFFICERS)) {
    const user = officers.get(Number(ward));
    if (!user) continue;
    await OfficerRequest.create({
      user,
      ward: wards.get(Number(ward))!._id,
      designation: o.designation,
      department: o.department,
      employeeId: `MCD-KB-${ward}0${Number(ward) % 7}`,
      status: "approved",
      reviewedBy: admin._id,
      reviewedAt: daysAgo(40),
      reviewNote: "Checked against the MCD Karol Bagh zone staff list",
    });
  }
  await OfficerRequest.create({
    user: applicants.pending._id,
    ward: wards.get(81)!._id,
    designation: "Junior Engineer (Electrical)",
    department: "MCD Electrical",
    employeeId: "MCD-KB-8812",
    phone: "011-2575-0000",
    note: "Joined the Karol Bagh zone office this month. Please verify with the zonal office.",
    status: "pending",
  });
  await OfficerRequest.create({
    user: applicants.rejected._id,
    ward: wards.get(77)!._id,
    designation: "Ward officer",
    department: "MCD",
    status: "rejected",
    reviewedBy: admin._id,
    reviewedAt: daysAgo(5),
    reviewNote: "We couldn't find you in the zone's staff list. Apply again from your official email.",
  });

  // Reports.
  let seed = 1;
  const photo = async (category: Category, state: SceneState, scene: number, by: Types.ObjectId, at: Date) => {
    const image = await drawScene(category, state, scene);
    const saved = await Photo.create({ ...image, uploadedBy: by });
    await Photo.updateOne({ _id: saved._id }, { $set: { createdAt: at } }, { timestamps: false });
    return saved._id;
  };

  const notifications: { user: Types.ObjectId; issue: Types.ObjectId; kind: string; message: string; note?: string; createdAt: Date }[] = [];
  const counts: Record<string, number> = {};

  for (const r of REPORTS) {
    const scene = seed++ * 13;
    const issueId = new mongoose.Types.ObjectId();
    const alert = (user: Types.ObjectId, kind: string, message: string, createdAt: Date, note?: string) =>
      notifications.push({ user, issue: issueId, kind, message, note, createdAt });
    const ward = wards.get(r.ward)!;
    const officer = officers.get(r.ward)!;
    const reporter = residents[r.reporter];
    // Neighbours who added their voice: the next people round the list.
    const upvoters = Array.from({ length: Math.min(r.upvoters, residents.length - 1) }, (_, i) =>
      residents[(r.reporter + 1 + i) % residents.length],
    );
    const upvotes = [reporter, ...upvoters];
    const point = pointIn(r.ward, r.at);
    const created = daysAgo(r.reportedDaysAgo);
    const at = (d: number) => new Date(created.getTime() + d * DAY);

    const history: { status: Status; at: Date; by?: Types.ObjectId; note?: string }[] = [
      { status: "open", at: created, by: reporter },
    ];
    const fixAttempts = [];
    for (const f of r.failed ?? []) {
      const posted = at(f.at);
      const failedAt = new Date(posted.getTime() + f.judgedAfterHours * HOUR);
      history.push({ status: "pending_verification", at: posted, by: officer, note: f.note });
      history.push({ status: "in_progress", at: failedAt, note: "Verification failed: 3 residents said it isn't fixed" });
      fixAttempts.push({
        by: officer,
        at: posted,
        photo: await photo(r.category, "partial", scene, officer, posted),
        accuracy: 8,
        distance: 9,
        note: f.note,
        confirms: 0,
        rejects: 3,
        failedAt,
      });
    }

    const doc: Record<string, unknown> = {
      _id: issueId,
      title: r.title,
      description: r.description,
      category: r.category,
      severity: r.severity,
      location: toGeoPoint(point),
      address: r.address,
      ward: ward._id,
      reporter,
      photo: await photo(r.category, "before", scene, reporter, created),
      upvotes,
      upvoteCount: upvotes.length,
      aiSuggestion: { category: r.category, severity: r.severity, title: r.title },
      userChoice: { category: r.category, severity: r.severity, title: r.title },
      verification: { confirms: [], rejects: [] },
      fixAttempts,
      failedVerifications: fixAttempts.length,
      reopenCount: 0,
      createdAt: created,
      updatedAt: created,
    };

    const s = r.story;
    const postFix = async (posted: Date, note: string, match: number) => {
      const spot = nearby(point, 6 + (seed % 9));
      doc.resolutionPhoto = await photo(r.category, "after", scene, officer, posted);
      doc.fix = {
        by: officer,
        at: posted,
        location: toGeoPoint(spot),
        accuracy: 7,
        distance: 6 + (seed % 9),
        note,
        ai: {
          matchPercent: match,
          samePlace: true,
          looksFixed: match >= 75,
          confidence: match >= 85 ? "high" : "medium",
          summary:
            match >= 75
              ? "The kerb, shopfronts and road markings match the report photo, and the problem is no longer visible."
              : "It looks like the same stretch, and most of the problem has been cleared, but part of it is out of frame.",
          at: posted,
        },
      };
      history.push({ status: "pending_verification", at: posted, by: officer, note });
    };
    const votes = (n: number, from: number, start: Date) =>
      Array.from({ length: n }, (_, i) => ({ user: residents[(from + i) % residents.length], at: new Date(start.getTime() + (i + 1) * 2 * HOUR) }));

    if ("startedAt" in s && s.startedAt !== undefined) {
      const note = s.kind === "in_progress" ? s.note : "Work started";
      history.push({ status: "in_progress", at: at(s.startedAt), by: officer, note });
      alert(reporter, "in_progress", "Work has started", at(s.startedAt), note);
    }

    let status: Status = "open";
    if (s.kind === "in_progress") {
      status = "in_progress";
    } else if (s.kind === "pending") {
      status = "pending_verification";
      const posted = new Date(now - s.fixHoursAgo * HOUR);
      await postFix(posted, s.note, s.match);
      // Votes come from neighbours other than the reporter, so the reporter can still vote live.
      doc.verification = { confirms: votes(s.confirms, r.reporter + 5, posted), rejects: votes(s.rejects, r.reporter + 9, posted) };
      for (const user of upvotes) alert(user, "verify_request", "Is it fixed? Check the officer's photo", posted);
    } else if (s.kind === "resolved" || s.kind === "reopened") {
      const posted = at(s.fixedAt);
      await postFix(posted, s.note, s.match);
      const confirms = votes(3, r.reporter + 3, posted);
      const resolvedAt = confirms.at(-1)!.at;
      doc.verification = { confirms, rejects: [] };
      history.push({ status: "resolved", at: resolvedAt, note: "Verified by 3 residents" });
      status = "resolved";
      doc.resolvedAt = resolvedAt;
      alert(reporter, "verified", "Fixed and verified by residents", resolvedAt);

      if (s.kind === "reopened") {
        const reopened = daysAgo(s.reopenedDaysAgo);
        const after = Math.max(1, Math.round((reopened.getTime() - resolvedAt.getTime()) / DAY));
        history.push({ status: "open", at: reopened, by: residents[(r.reporter + 2) % residents.length], note: `Reported again ${after} days after it was marked fixed` });
        status = "open";
        doc.reopenCount = 1;
        doc.resolvedAt = undefined;
        doc.verification = { confirms: [], rejects: [] };
      }
    }
    if (r.failed?.length) {
      const last = fixAttempts.at(-1)!.failedAt;
      alert(reporter, "failed", "Residents say it isn't fixed yet", last);
      alert(officer, "failed", "Residents say it isn't fixed yet", last);
    }

    history.sort((a, b) => a.at.getTime() - b.at.getTime());
    doc.status = status;
    doc.statusHistory = history;
    doc.updatedAt = history.at(-1)!.at;

    await new Issue(doc).save({ timestamps: false });
    counts[status] = (counts[status] ?? 0) + 1;
  }

  await Notification.insertMany(
    notifications.map((n) => ({ ...n, read: n.createdAt.getTime() < now - 3 * DAY })),
  );
  await Notification.create({
    user: applicants.rejected._id,
    kind: "access_decided",
    message: "Not approved: We couldn't find you in the zone's staff list. Apply again from your official email.",
    createdAt: daysAgo(5),
  });

  console.log(`Reports: ${REPORTS.length} (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")})`);
  console.log(`Alerts: ${notifications.length + 1}`);

  await writeLoginFile(password);
  console.log("Wrote login.md");
}

async function writeLoginFile(password: string) {
  const officerRows = Object.entries(OFFICERS)
    .map(([ward, o]) => {
      const demo = [76, 78, 79, 80].includes(Number(ward)) ? "5 demo reports" : "no reports";
      return `| Ward officer, Ward ${ward} | ${o.name} | \`ward${ward}.officer@${DOMAIN}\` | ${demo} |`;
    })
    .join("\n");
  const residentRows = RESIDENTS.map((name, i) => `| Resident | ${name} | \`${emailOf(name)}\` | ${i === 0 ? "Reported 4 issues; has alerts waiting" : ""} |`).join("\n");

  const text = `# PinPoint demo logins

Every account below uses the same password:

\`\`\`
${password}
\`\`\`

It is \`DEMO_PASSWORD\` from \`.env.local\`. Running \`npm run seed:demo\` again resets all of these accounts and the demo reports.
**Don't commit this file.** Anyone with it can sign in as the admin of the live site.

Live site: https://hack-iitd-bifrost-pin-point.vercel.app

## Admin

| Role | Name | Email | |
| --- | --- | --- | --- |
| Admin | ${ADMIN.name} | \`${ADMIN.email}\` | Officer requests (1 waiting, 1 rejected), officers, ward contacts, imports, notices |

## Ward officers

| Role | Name | Email | |
| --- | --- | --- | --- |
${officerRows}

## Residents

| Role | Name | Email | |
| --- | --- | --- | --- |
${residentRows}
| Applicant | Vikram Joshi | \`vikram.joshi@${DOMAIN}\` | Officer request waiting for the admin (Ward 81) |
| Applicant | Karan Malhotra | \`karan.malhotra@${DOMAIN}\` | Officer request rejected, with the reason in his alerts |

## What to show

1. **Map** (\`/\`): 20 reports in Wards 76, 78, 79 and 80, in every status. Resolved ones are faded.
2. **Resident** (Ravi Kumar): the bell has alerts. Open *Water standing at the Pusa Road service lane*: the officer's after-photo, the AI photo check (82% match) and 2 of 3 "fixed" votes. Voting needs you within 300 m of the issue, so in Chrome DevTools open *More tools → Sensors* and set the location to the issue's coordinates (shown on the issue page).
3. **Report** (\`/report\`): take a photo of a real street problem. Gemini fills in the title, category and severity; a selfie or a screenshot is refused.
4. **Officer** (Anil Sharma, Ward 78): the dashboard queue ranked by people affected, *Start work*, and *Mark as fixed* with a live photo. Gemini compares it with the report photo and refuses anything under a 60% match: point the camera at anything that isn't the reported spot and the fix is refused with its score. A fix that passes needs a real before and after, so report a real problem first and fix that one.
5. **Failed fixes and escalation** (Ward 79): *Crater on Shankar Road that keeps coming back* failed residents' checks twice, so it can be escalated: evidence pack, councillor petition and RTI draft. *Footpath blocked by shop extensions* is 11 days past its target.
6. **Came back** (Ward 76): *Pothole on the 14 Block road is back* was verified fixed, then reported again.
7. **Scorecard** (\`/scorecard\`): Karol Bagh at 100% accepted, Rajinder Nagar at 40% with 3 rejected fixes, Dev Nagar at 67%. West Patel Nagar shows a dash: only 2 judged fixes so far.
8. **Admin**: approve or reject Vikram Joshi's request (with the TinyFish public-records check), the ward councillors found with TinyFish (also used to address the councillor petition), imports, and official notices.

The photos are labelled illustrations. Real photos taken through the app go through Gemini as usual.
`;
  await writeFile("login.md", text);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
