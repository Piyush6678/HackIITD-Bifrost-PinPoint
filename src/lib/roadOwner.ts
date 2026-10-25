import { notifiedRoads } from "@/data/notifiedRoads.generated";
import { Issue } from "@/models/Issue";
import { fromGeoPoint } from "./geo";
import { matchRoad } from "./roads";
import { nearestRoadName } from "./reverseGeocode";

// Works out who looks after the road a road-damage report is on. Runs after the report has
// been saved, so a slow lookup never holds up the resident, and any failure just leaves the
// issue with its generic department.
export async function enrichRoad(issueId: string) {
  if (notifiedRoads.length === 0) return;

  const issue = await Issue.findById(issueId).select("category address location roadOwner").lean();
  if (!issue || issue.category !== "pothole" || issue.roadOwner) return;

  const nearest = await nearestRoadName(fromGeoPoint(issue.location));
  const hit = matchRoad([issue.address, nearest], notifiedRoads);
  if (!hit) return;

  await Issue.updateOne(
    { _id: issueId, roadOwner: { $exists: false } },
    { $set: { roadOwner: hit.owner, roadName: hit.road.name } },
  );
}
